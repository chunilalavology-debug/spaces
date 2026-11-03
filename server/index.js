import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import prisma from './lib/prisma.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000

const UPLOAD_DIR = path.join(__dirname, '..', 'client', 'public', 'uploads')
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist')

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? ''
    : '46spaces-local-session-secret-change-before-deploy')

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin'

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  (process.env.NODE_ENV === 'production' ? '' : 'Admin@123#')

const SESSION_TTL = 8 * 60 * 60 * 1000

if (
  process.env.NODE_ENV === 'production' &&
  (!SESSION_SECRET || !process.env.ADMIN_PASSWORD)
) {
  console.warn(
    'Set ADMIN_SESSION_SECRET and ADMIN_PASSWORD in production before exposing the admin panel.'
  )
}

app.disable('x-powered-by')

app.use(
  cors({
    origin:
      process.env.CLIENT_ORIGIN ||
      (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true
  })
)

app.use(express.json({ limit: '15mb' }))

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function passwordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')

  return { salt, hash }
}

function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false

  const actual = crypto.scryptSync(String(password), record.salt, 64)
  const expected = Buffer.from(record.hash, 'hex')

  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  )
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))

  return (
    left.length === right.length &&
    crypto.timingSafeEqual(left, right)
  )
}

function sign(value) {
  return crypto
    .createHmac('sha256', SESSION_SECRET || 'missing-production-secret')
    .update(value)
    .digest('base64url')
}

function createSession(username) {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      exp: Date.now() + SESSION_TTL
    })
  ).toString('base64url')

  return `${payload}.${sign(payload)}`
}

function getCookie(req, name) {
  const raw = req.headers.cookie || ''

  const item = raw
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))

  return item ? decodeURIComponent(item.slice(name.length + 1)) : ''
}

function requireAdmin(req, res, next) {
  const token = getCookie(req, 'spaces_admin')
  const [payload, signature] = token.split('.')

  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return res.status(401).json({
      message: 'Please sign in to continue.'
    })
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, 'base64url').toString()
    )

    if (!session.username || session.exp < Date.now()) {
      return res.status(401).json({
        message: 'Your session has expired. Please sign in again.'
      })
    }

    req.admin = session
    next()
  } catch {
    return res.status(401).json({
      message: 'Invalid admin session.'
    })
  }
}

function handleDatabaseError(error, res, next) {
  if (error?.code === 'P2002') {
    return res.status(409).json({
      message: 'This record already exists. Please use a different slug or value.'
    })
  }

  if (error?.code === 'P2025') {
    return res.status(404).json({
      message: 'Record not found.'
    })
  }

  next(error)
}

function createSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// --------------------------------------------------
// Admin database helpers
// --------------------------------------------------

async function ensureAdminCredentials() {
  if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) {
    throw new Error(
      'Configure ADMIN_SESSION_SECRET before enabling the admin panel.'
    )
  }

  let admin = await prisma.admin.findUnique({
    where: { id: 'admin' }
  })

  if (!admin) {
    if (!ADMIN_PASSWORD) {
      throw new Error(
        'Configure ADMIN_PASSWORD before the first production admin login.'
      )
    }

    const credentials = passwordRecord(ADMIN_PASSWORD)

    admin = await prisma.admin.create({
      data: {
        id: 'admin',
        username: ADMIN_USERNAME,
        ...credentials
      }
    })
  }

  return admin
}

// --------------------------------------------------
// Login rate limiting
// --------------------------------------------------

const loginAttempts = new Map()

// --------------------------------------------------
// Health
// --------------------------------------------------

app.get('/api/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    res.json({
      ok: true,
      service: '46spaces-api',
      database: 'connected'
    })
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Admin authentication
// --------------------------------------------------

app.post('/api/admin/login', async (req, res, next) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'

    const attempt = loginAttempts.get(ip) || {
      count: 0,
      until: 0
    }

    if (attempt.until > Date.now() && attempt.count >= 8) {
      return res.status(429).json({
        message: 'Too many attempts. Try again in a few minutes.'
      })
    }

    if (attempt.until < Date.now()) {
      attempt.count = 0
      attempt.until = Date.now() + 10 * 60 * 1000
    }

    const admin = await ensureAdminCredentials()
    const { username, password } = req.body || {}

    const validUsername =
      safeEqual(username || '', admin.username) ||
      safeEqual(username || '', admin.email || '')

    if (!validUsername || !verifyPassword(password || '', admin)) {
      attempt.count += 1
      loginAttempts.set(ip, attempt)

      return res.status(401).json({
        message: 'Incorrect username or password.'
      })
    }

    loginAttempts.delete(ip)

    res.cookie('spaces_admin', createSession(admin.username), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_TTL,
      path: '/'
    })

    res.json({
      ok: true,
      username: admin.username
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/session', requireAdmin, async (req, res, next) => {
  try {
    const admin = await ensureAdminCredentials()

    res.json({
      ok: true,
      username: req.admin.username,
      profile: {
        name: admin.name || admin.username || 'Administrator',
        email: admin.email || '',
        avatar: admin.avatar || ''
      }
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie('spaces_admin', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  })

  res.json({ ok: true })
})

// Change admin password
app.put('/api/admin/password', requireAdmin, async (req, res, next) => {
  try {
    const admin = await ensureAdminCredentials()
    const { currentPassword, newPassword } = req.body || {}

    if (!verifyPassword(currentPassword || '', admin)) {
      return res.status(400).json({
        message: 'Current password is incorrect.'
      })
    }

    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      return res.status(400).json({
        message: 'New password must be at least 12 characters.'
      })
    }

    const credentials = passwordRecord(newPassword)

    await prisma.admin.update({
      where: { id: 'admin' },
      data: credentials
    })

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Public blogs
// --------------------------------------------------

app.get('/api/blogs', async (_req, res, next) => {
  try {
    const blogs = await prisma.blog.findMany({
      where: { status: 'published' },
      orderBy: [
        { publishedAt: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    res.json(blogs)
  } catch (error) {
    next(error)
  }
})

app.get('/api/blogs/:slug', async (req, res, next) => {
  try {
    const blog = await prisma.blog.findFirst({
      where: {
        slug: req.params.slug,
        status: 'published'
      }
    })

    if (!blog) {
      return res.status(404).json({
        message: 'Blog not found.'
      })
    }

    res.json(blog)
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Admin blog management
// --------------------------------------------------

app.get('/api/admin/blogs', requireAdmin, async (_req, res, next) => {
  try {
    const blogs = await prisma.blog.findMany({
      orderBy: { updatedAt: 'desc' }
    })

    res.json(blogs)
  } catch (error) {
    next(error)
  }
})

function normalizeBlog(body, existing = {}) {
  const title = String(body.title || '').trim()

  const slug = createSlug(body.slug || title)

  if (!title || !slug || !String(body.content || '').trim()) {
    return {
      error: 'Title, slug and content are required.'
    }
  }

  return {
    title,
    slug,
    excerpt: String(body.excerpt || '').trim(),
    content: String(body.content || '').trim(),
    category: String(body.category || 'Insights').trim(),
    author: String(body.author || '46Spaces').trim(),
    coverImage: String(body.coverImage || '').trim(),
    status: body.status === 'published' ? 'published' : 'draft',
    seoTitle: String(body.seoTitle || '').trim(),
    seoDescription: String(body.seoDescription || '').trim(),
    publishedAt:
      body.status === 'published'
        ? existing.publishedAt || new Date()
        : null
  }
}

app.post('/api/admin/blogs', requireAdmin, async (req, res, next) => {
  try {
    const blog = normalizeBlog(req.body)

    if (blog.error) {
      return res.status(400).json({ message: blog.error })
    }

    const created = await prisma.blog.create({
      data: blog
    })

    res.status(201).json(created)
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.put('/api/admin/blogs/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.blog.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Blog not found.'
      })
    }

    const blog = normalizeBlog(req.body, existing)

    if (blog.error) {
      return res.status(400).json({
        message: blog.error
      })
    }

    const updated = await prisma.blog.update({
      where: { id: req.params.id },
      data: blog
    })

    res.json(updated)
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.delete('/api/admin/blogs/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.blog.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Blog not found.'
      })
    }

    await prisma.blog.delete({
      where: { id: req.params.id }
    })

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Site settings
// --------------------------------------------------

const DEFAULT_SETTINGS = {
  siteName: '46Spaces',
  logoUrl: '/assets/logo.png',
  faviconUrl: '/favicon.svg',
  tagline: 'Land. Ideas. Possibility.',
  description: '',
  contactEmail: 'hello@46spaces.com',
  contactPhone: '',
  address: '',
  instagram: '',
  linkedin: '',
  facebook: '',
  blogSectionTitle: 'Notes & perspectives',
  blogSectionDescription: 'Ideas, insights and stories from 46Spaces.',
  postsPerPage: 6,
  showBlogSection: true,
  seoTitle: '46Spaces — Land. Ideas. Possibility.',
  seoDescription: '',
  seoKeywords: '',
  maintenanceMode: false
}

async function getSettings() {
  let settings = await prisma.siteSetting.findUnique({
    where: { id: 'main' }
  })

  if (!settings) {
    settings = await prisma.siteSetting.create({
      data: {
        id: 'main',
        ...DEFAULT_SETTINGS
      }
    })
  }

  return settings
}

app.get('/api/settings', async (_req, res, next) => {
  try {
    const settings = await getSettings()

    res.json({
      ...settings,
      maintenanceMode: false
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/settings', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await getSettings())
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/settings', requireAdmin, async (req, res, next) => {
  try {
    const allowed = [
      'siteName',
      'logoUrl',
      'faviconUrl',
      'tagline',
      'description',
      'contactEmail',
      'contactPhone',
      'address',
      'instagram',
      'linkedin',
      'facebook',
      'blogSectionTitle',
      'blogSectionDescription',
      'postsPerPage',
      'showBlogSection',
      'seoTitle',
      'seoDescription',
      'seoKeywords',
      'maintenanceMode'
    ]

    const current = await getSettings()
    const data = {}

    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        data[key] = req.body[key]
      }
    }

    if (data.postsPerPage !== undefined) {
      data.postsPerPage = Math.min(
        24,
        Math.max(1, Number(data.postsPerPage) || 6)
      )
    }

    const updated = await prisma.siteSetting.update({
      where: { id: 'main' },
      data
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Projects
// --------------------------------------------------

app.get('/api/projects', async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { not: 'draft' } },
      orderBy: { createdAt: 'desc' }
    })

    res.json(projects)
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/projects', requireAdmin, async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' }
    })

    res.json(projects)
  } catch (error) {
    next(error)
  }
})

function normalizeProject(body, existing = {}) {
  const title = String(body.title || existing.title || '').trim()
  const slug = createSlug(body.slug || title || existing.slug)

  if (!title || !slug) {
    return { error: 'Project title is required.' }
  }

  return {
    title,
    slug,
    category: body.category ?? existing.category ?? null,
    location: body.location ?? existing.location ?? null,
    summary: body.summary ?? existing.summary ?? null,
    description: body.description ?? existing.description ?? null,
    coverImage: body.coverImage ?? existing.coverImage ?? null,
    status: body.status ?? existing.status ?? 'draft',
    statusLabel: body.statusLabel ?? existing.statusLabel ?? null,
    featured: body.featured ?? existing.featured ?? false
  }
}

app.post('/api/admin/projects', requireAdmin, async (req, res, next) => {
  try {
    const project = normalizeProject(req.body)

    if (project.error) {
      return res.status(400).json({
        message: project.error
      })
    }

    const created = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        ...project
      }
    })

    res.status(201).json(created)
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.put('/api/admin/projects/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Project not found.'
      })
    }

    const project = normalizeProject(req.body, existing)

    if (project.error) {
      return res.status(400).json({
        message: project.error
      })
    }

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: project
    })

    res.json(updated)
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.delete('/api/admin/projects/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Project not found.'
      })
    }

    await prisma.project.delete({
      where: { id: req.params.id }
    })

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Menus
// --------------------------------------------------

const DEFAULT_MENUS = {
  header: [
    { id: 'home', label: 'Home', url: '/' },
    { id: 'about', label: 'About', url: '/about' },
    { id: 'projects', label: 'Projects', url: '/projects' },
    { id: 'journal', label: 'Journal', url: '/#blogs' },
    { id: 'opportunities', label: 'Opportunities', url: '/opportunities' },
    { id: 'contact', label: 'Contact', url: '/contact' }
  ],
  footer: [
    { id: 'about', label: 'About', url: '/about' },
    { id: 'projects', label: 'Projects', url: '/projects' },
    { id: 'contact', label: 'Contact', url: '/contact' }
  ]
}

async function getMenus() {
  let menus = await prisma.menu.findUnique({
    where: { id: 'main' }
  })

  if (!menus) {
    menus = await prisma.menu.create({
      data: {
        id: 'main',
        header: DEFAULT_MENUS.header,
        footer: DEFAULT_MENUS.footer
      }
    })
  }

  return menus
}

app.get('/api/menus', async (_req, res, next) => {
  try {
    res.json(await getMenus())
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/menus', requireAdmin, async (req, res, next) => {
  try {
    const menus = req.body || {}

    if (!Array.isArray(menus.header) || !Array.isArray(menus.footer)) {
      return res.status(400).json({
        message: 'Header and footer menus must be arrays.'
      })
    }

    const updated = await prisma.menu.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        header: menus.header,
        footer: menus.footer
      },
      update: {
        header: menus.header,
        footer: menus.footer
      }
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Forms
// --------------------------------------------------

const DEFAULT_FORMS = [
  {
    id: 'contact',
    title: 'Contact form',
    submitLabel: 'Send enquiry',
    successMessage: 'Thank you. We will be in touch.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true },
      { name: 'email', label: 'Email address', type: 'email', required: true },
      { name: 'phone', label: 'Phone number', type: 'tel' },
      { name: 'message', label: 'Message', type: 'textarea', required: true }
    ]
  },
  {
    id: 'landowner',
    title: 'Landowner enquiry',
    submitLabel: 'Submit land details',
    successMessage: 'Thank you. We will review your details.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true },
      { name: 'email', label: 'Email address', type: 'email', required: true },
      { name: 'phone', label: 'Phone number', type: 'tel' },
      { name: 'location', label: 'Land location', type: 'text' },
      { name: 'message', label: 'Property details', type: 'textarea' }
    ]
  },
  {
    id: 'partner',
    title: 'Channel partner enquiry',
    submitLabel: 'Start a conversation',
    successMessage: 'Thank you. We will contact you shortly.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true },
      { name: 'email', label: 'Email address', type: 'email', required: true },
      { name: 'phone', label: 'Phone number', type: 'tel' },
      { name: 'message', label: 'How can we work together?', type: 'textarea' }
    ]
  }
]

async function getForms() {
  const forms = await prisma.form.findMany({
    orderBy: { id: 'asc' }
  })

  if (forms.length > 0) return forms

  for (const form of DEFAULT_FORMS) {
    await prisma.form.upsert({
      where: { id: form.id },
      create: form,
      update: {}
    })
  }

  return prisma.form.findMany({
    orderBy: { id: 'asc' }
  })
}

app.get('/api/forms', async (_req, res, next) => {
  try {
    res.json(await getForms())
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/forms', requireAdmin, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        message: 'Forms must be an array.'
      })
    }

    const forms = req.body.map((form) => ({
      id: String(form.id || '').trim(),
      title: String(form.title || '').trim(),
      submitLabel: form.submitLabel || null,
      successMessage: form.successMessage || null,
      fields: Array.isArray(form.fields) ? form.fields : []
    }))

    if (forms.some((form) => !form.id || !form.title)) {
      return res.status(400).json({
        message: 'Every form must have an ID and title.'
      })
    }

    await prisma.$transaction(
      forms.map((form) =>
        prisma.form.upsert({
          where: { id: form.id },
          create: form,
          update: {
            title: form.title,
            submitLabel: form.submitLabel,
            successMessage: form.successMessage,
            fields: form.fields
          }
        })
      )
    )

    const savedForms = await prisma.form.findMany({
      orderBy: { id: 'asc' }
    })

    res.json(savedForms)
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Uploads and media
// --------------------------------------------------

app.post('/api/admin/uploads', requireAdmin, async (req, res, next) => {
  try {
    const { data, filename } = req.body || {}

    const match =
      /^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(
        String(data || '')
      )

    if (!match) {
      return res.status(400).json({
        message: 'Please upload a valid image.'
      })
    }

    const buffer = Buffer.from(match[2], 'base64')

    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({
        message: 'Image must be smaller than 8 MB.'
      })
    }

    const ext =
      ({
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/svg+xml': 'svg'
      })[match[1]] || match[1].split('/')[1]

    const safeName = String(filename || 'image')
      .replace(/[^a-z0-9_-]/gi, '-')
      .slice(0, 40)

    const name = `${Date.now()}-${safeName}.${ext}`

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    await fs.writeFile(path.join(UPLOAD_DIR, name), buffer)

    res.status(201).json({
      url: `/uploads/${name}`,
      filename: name,
      size: buffer.length
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/media', requireAdmin, async (_req, res, next) => {
  try {
    let files = []

    try {
      files = await fs.readdir(UPLOAD_DIR)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }

    res.json(
      files
        .filter((file) => /\.(png|jpe?g|webp|gif|svg)$/i.test(file))
        .map((file) => ({
          name: file,
          url: `/uploads/${file}`
        }))
    )
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Admin profile
// --------------------------------------------------

app.put('/api/admin/profile', requireAdmin, async (req, res, next) => {
  try {
    const current = await ensureAdminCredentials()

    const name = String(req.body?.name || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const avatar = String(req.body?.avatar || '')

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Enter an admin name and valid email address.'
      })
    }

    const updated = await prisma.admin.update({
      where: { id: 'admin' },
      data: {
        username: name,
        name,
        email,
        avatar
      }
    })

    res.cookie('spaces_admin', createSession(updated.username), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_TTL,
      path: '/'
    })

    res.json({
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar
    })
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

// --------------------------------------------------
// Enquiries
// --------------------------------------------------

app.get('/api/admin/enquiries', requireAdmin, async (_req, res, next) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' }
    })

    res.json(enquiries)
  } catch (error) {
    next(error)
  }
})

app.post('/api/enquiries', async (req, res, next) => {
  try {
    const {
      type,
      name,
      message,
      email,
      consent,
      formId
    } = req.body || {}

    if (!consent) {
      return res.status(400).json({
        message: 'Please accept the privacy policy.'
      })
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))
    ) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      })
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        id: crypto.randomUUID(),
        type: type || 'General contact',
        name: String(name || req.body?.fullName || 'Website visitor').trim(),
        email: String(email || '').trim().toLowerCase(),
        phone: req.body.phone ? String(req.body.phone).trim() : '',
        location: req.body.location ? String(req.body.location).trim() : '',
        landType: req.body.landType || '',
        partnerType: req.body.partnerType || '',
        interest: req.body.interest || '',
        topic: req.body.topic || '',
        message: message ? String(message).trim() : '',
        fields: Object.fromEntries(
          Object.entries(req.body || {}).filter(
            ([key]) => !['consent', 'type', 'formId'].includes(key)
          )
        ),
        formId: String(formId || '')
      }
    })

    res.status(201).json({
      ok: true,
      id: enquiry.id
    })
  } catch (error) {
    next(error)
  }
})

// --------------------------------------------------
// Static files
// --------------------------------------------------

app.use('/uploads', express.static(UPLOAD_DIR))
app.use(express.static(CLIENT_DIST))

app.get(/.*/, (_req, res, next) => {
  res.sendFile(
    path.join(CLIENT_DIST, 'index.html'),
    (error) => {
      if (error) next(error)
    }
  )
})

// --------------------------------------------------
// Error handler
// --------------------------------------------------

app.use((error, _req, res, _next) => {
  console.error(error)

  res.status(500).json({
    message: 'Something went wrong. Please try again.'
  })
})

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`46Spaces API running on http://localhost:${PORT}`)
})
