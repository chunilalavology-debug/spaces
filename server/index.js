import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import prisma from './lib/prisma.js'
import {
  passwordRecord,
  verifyPassword,
  safeEqual,
  encryptSecret,
  decryptSecret,
  hashToken,
  randomToken
} from './lib/crypto.js'
import {
  ensureEmailTemplates,
  getSmtpConfig,
  sendTemplatedEmail,
  testSmtpConnection,
  pickEnquiryTemplateId
} from './lib/email.js'
import { saveUpload, listMedia, deleteMedia } from './lib/upload.js'

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
const REMEMBER_TTL = 30 * 24 * 60 * 60 * 1000
const RESET_TTL = 30 * 60 * 1000
const COOKIE_NAME = 'spaces_admin'
const CSRF_COOKIE = 'spaces_csrf'

if (
  process.env.NODE_ENV === 'production' &&
  (!SESSION_SECRET || !process.env.ADMIN_PASSWORD)
) {
  console.warn(
    'Set ADMIN_SESSION_SECRET and ADMIN_PASSWORD in production before exposing the admin panel.'
  )
}

app.set('trust proxy', 1)
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

function sign(value) {
  return crypto
    .createHmac('sha256', SESSION_SECRET || 'missing-production-secret')
    .update(value)
    .digest('base64url')
}

function createSession(username, sessionVersion, rememberMe = false) {
  const ttl = rememberMe ? REMEMBER_TTL : SESSION_TTL
  const payload = Buffer.from(
    JSON.stringify({
      username,
      v: sessionVersion || 1,
      rememberMe: Boolean(rememberMe),
      exp: Date.now() + ttl
    })
  ).toString('base64url')

  return {
    token: `${payload}.${sign(payload)}`,
    maxAge: ttl
  }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || ''
  const item = raw
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))

  return item ? decodeURIComponent(item.slice(name.length + 1)) : ''
}

function setAuthCookie(res, token, maxAge) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
    maxAge,
    path: '/'
  })
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
    path: '/'
  })
}

function issueCsrf(res) {
  const token = randomToken(24)
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
    maxAge: REMEMBER_TTL,
    path: '/'
  })
  return token
}

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  const header = req.headers['x-csrf-token']
  const cookie = getCookie(req, CSRF_COOKIE)

  if (!header || !cookie || !safeEqual(header, cookie)) {
    return res.status(403).json({ message: 'Invalid CSRF token.' })
  }

  return next()
}

async function requireAdmin(req, res, next) {
  const token = getCookie(req, COOKIE_NAME)
  const [payload, signature] = token.split('.')

  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return res.status(401).json({ message: 'Please sign in to continue.' })
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString())

    if (!session.username || session.exp < Date.now()) {
      return res.status(401).json({
        message: 'Your session has expired. Please sign in again.'
      })
    }

    const admin = await prisma.admin.findUnique({ where: { id: 'admin' } })
    if (!admin || !safeEqual(session.username, admin.username)) {
      return res.status(401).json({ message: 'Invalid admin session.' })
    }

    if (Number(session.v || 1) !== Number(admin.sessionVersion || 1)) {
      return res.status(401).json({
        message: 'Your session is no longer valid. Please sign in again.'
      })
    }

    req.admin = session
    req.adminRecord = admin
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid admin session.' })
  }
}

function handleDatabaseError(error, res, next) {
  if (error?.code === 'P2002') {
    return res.status(409).json({
      message: 'This record already exists. Please use a different slug or value.'
    })
  }

  if (error?.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found.' })
  }

  if (error?.status) {
    return res.status(error.status).json({ message: error.message })
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isValidPhone(value) {
  const cleaned = String(value || '').replace(/[^\d+]/g, '')
  return cleaned.length >= 7 && cleaned.length <= 16
}

async function ensureAdminCredentials() {
  if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) {
    throw new Error('Configure ADMIN_SESSION_SECRET before enabling the admin panel.')
  }

  let admin = await prisma.admin.findUnique({ where: { id: 'admin' } })

  if (!admin) {
    if (!ADMIN_PASSWORD) {
      throw new Error('Configure ADMIN_PASSWORD before the first production admin login.')
    }

    const credentials = passwordRecord(ADMIN_PASSWORD)
    admin = await prisma.admin.create({
      data: {
        id: 'admin',
        username: ADMIN_USERNAME,
        name: ADMIN_USERNAME,
        ...credentials
      }
    })
  }

  return admin
}

function publicProfile(admin) {
  return {
    name: admin.name || admin.username || 'Administrator',
    email: admin.email || '',
    phone: admin.phone || '',
    additionalContact: admin.additionalContact || '',
    avatar: admin.avatar || ''
  }
}

const loginAttempts = new Map()
const enquiryAttempts = new Map()

function rateLimit(map, key, { limit, windowMs }) {
  const now = Date.now()
  const attempt = map.get(key) || { count: 0, until: 0 }

  if (attempt.until > now && attempt.count >= limit) {
    return false
  }

  if (attempt.until < now) {
    attempt.count = 0
    attempt.until = now + windowMs
  }

  attempt.count += 1
  map.set(key, attempt)
  return true
}

app.get('/api/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, service: '46spaces-api', database: 'connected' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/csrf', (_req, res) => {
  const token = issueCsrf(res)
  res.json({ csrfToken: token })
})

app.post('/api/admin/login', async (req, res, next) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    if (!rateLimit(loginAttempts, ip, { limit: 8, windowMs: 10 * 60 * 1000 })) {
      return res.status(429).json({
        message: 'Too many attempts. Try again in a few minutes.'
      })
    }

    const admin = await ensureAdminCredentials()
    const { username, password, rememberMe } = req.body || {}

    const validUsername =
      safeEqual(username || '', admin.username) ||
      safeEqual(username || '', admin.email || '')

    if (!validUsername || !verifyPassword(password || '', admin)) {
      return res.status(401).json({ message: 'Incorrect username or password.' })
    }

    loginAttempts.delete(ip)
    const session = createSession(admin.username, admin.sessionVersion, rememberMe)
    setAuthCookie(res, session.token, session.maxAge)
    const csrfToken = issueCsrf(res)

    res.json({
      ok: true,
      username: admin.username,
      csrfToken,
      profile: publicProfile(admin)
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/session', requireAdmin, async (req, res, next) => {
  try {
    const admin = req.adminRecord || (await ensureAdminCredentials())
    const csrfToken = getCookie(req, CSRF_COOKIE) || issueCsrf(res)

    res.json({
      ok: true,
      username: req.admin.username,
      csrfToken,
      profile: publicProfile(admin)
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/logout', async (req, res, next) => {
  try {
    // Prefer CSRF when present, but always clear cookies so logout cannot get stuck.
    const header = req.headers['x-csrf-token']
    const cookie = getCookie(req, CSRF_COOKIE)
    if (header && cookie && safeEqual(header, cookie)) {
      try {
        const admin = await prisma.admin.findUnique({ where: { id: 'admin' } })
        if (admin) {
          await prisma.admin.update({
            where: { id: 'admin' },
            data: { sessionVersion: { increment: 1 } }
          })
        }
      } catch {
        // Continue clearing cookies even if DB is briefly unavailable.
      }
    }

    clearAuthCookie(res)
    res.clearCookie(CSRF_COOKIE, { path: '/' })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/forgot-password', async (req, res, next) => {
  try {
    const ip = req.ip || 'unknown'
    if (!rateLimit(loginAttempts, `forgot:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })) {
      return res.status(429).json({ message: 'Too many reset requests. Try again later.' })
    }

    const email = String(req.body?.email || '').trim().toLowerCase()
    const admin = await ensureAdminCredentials()
    const generic = {
      ok: true,
      message: 'If that email matches an admin account, a reset link has been sent.'
    }

    if (!isValidEmail(email) || !admin.email || !safeEqual(email, admin.email)) {
      return res.json(generic)
    }

    const token = randomToken(32)
    await prisma.admin.update({
      where: { id: 'admin' },
      data: {
        resetTokenHash: hashToken(token),
        resetTokenExpiresAt: new Date(Date.now() + RESET_TTL)
      }
    })

    const baseUrl = process.env.CLIENT_ORIGIN || `${req.protocol}://${req.get('host')}`
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/admin/reset-password?token=${encodeURIComponent(token)}`

    try {
      await sendTemplatedEmail({
        sessionSecret: SESSION_SECRET,
        templateId: 'forgot_password',
        to: admin.email,
        vars: {
          name: admin.name || admin.username,
          resetUrl,
          expiresMinutes: 30
        }
      })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ ...generic, resetUrl, warning: error.message })
      }
      return res.status(503).json({
        message: 'Password reset email could not be sent. Configure SMTP in admin settings.'
      })
    }

    res.json(generic)
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '')
    const newPassword = String(req.body?.newPassword || '')

    if (!token || newPassword.length < 12) {
      return res.status(400).json({
        message: 'Reset token and a new password of at least 12 characters are required.'
      })
    }

    const admin = await ensureAdminCredentials()
    if (
      !admin.resetTokenHash ||
      !admin.resetTokenExpiresAt ||
      admin.resetTokenExpiresAt.getTime() < Date.now() ||
      !safeEqual(admin.resetTokenHash, hashToken(token))
    ) {
      return res.status(400).json({
        message: 'This reset link is invalid or has expired.'
      })
    }

    const credentials = passwordRecord(newPassword)
    await prisma.admin.update({
      where: { id: 'admin' },
      data: {
        ...credentials,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        sessionVersion: { increment: 1 }
      }
    })

    clearAuthCookie(res)

    if (admin.email) {
      try {
        await sendTemplatedEmail({
          sessionSecret: SESSION_SECRET,
          templateId: 'password_reset_confirmation',
          to: admin.email,
          vars: { name: admin.name || admin.username }
        })
      } catch {
        // Confirmation email is best-effort.
      }
    }

    res.json({ ok: true, message: 'Password updated. You can sign in with your new password.' })
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/password', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const admin = req.adminRecord || (await ensureAdminCredentials())
    const { currentPassword, newPassword } = req.body || {}

    if (!verifyPassword(currentPassword || '', admin)) {
      return res.status(400).json({ message: 'Current password is incorrect.' })
    }

    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      return res.status(400).json({
        message: 'New password must be at least 12 characters.'
      })
    }

    const credentials = passwordRecord(newPassword)
    await prisma.admin.update({
      where: { id: 'admin' },
      data: {
        ...credentials,
        sessionVersion: { increment: 1 }
      }
    })

    const updated = await prisma.admin.findUnique({ where: { id: 'admin' } })
    const session = createSession(updated.username, updated.sessionVersion, req.admin.rememberMe)
    setAuthCookie(res, session.token, session.maxAge)

    if (updated.email) {
      try {
        await sendTemplatedEmail({
          sessionSecret: SESSION_SECRET,
          templateId: 'password_reset_confirmation',
          to: updated.email,
          vars: { name: updated.name || updated.username }
        })
      } catch {
        // best effort
      }
    }

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.get('/api/blogs', async (_req, res, next) => {
  try {
    const blogs = await prisma.blog.findMany({
      where: { status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }]
    })
    res.json(blogs)
  } catch (error) {
    next(error)
  }
})

app.get('/api/blogs/:slug', async (req, res, next) => {
  try {
    const blog = await prisma.blog.findFirst({
      where: { slug: req.params.slug, status: 'published' }
    })

    if (!blog) return res.status(404).json({ message: 'Blog not found.' })
    res.json(blog)
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/blogs', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await prisma.blog.findMany({ orderBy: { updatedAt: 'desc' } }))
  } catch (error) {
    next(error)
  }
})

function normalizeBlog(body, existing = {}) {
  const title = String(body.title || '').trim()
  const slug = createSlug(body.slug || title)

  if (!title || !slug || !String(body.content || '').trim()) {
    return { error: 'Title, slug and content are required.' }
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
      body.status === 'published' ? existing.publishedAt || new Date() : null
  }
}

app.post('/api/admin/blogs', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const blog = normalizeBlog(req.body)
    if (blog.error) return res.status(400).json({ message: blog.error })
    const created = await prisma.blog.create({ data: blog })
    res.status(201).json(created)
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.put('/api/admin/blogs/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const existing = await prisma.blog.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Blog not found.' })

    const blog = normalizeBlog(req.body, existing)
    if (blog.error) return res.status(400).json({ message: blog.error })

    res.json(await prisma.blog.update({ where: { id: req.params.id }, data: blog }))
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.delete('/api/admin/blogs/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const existing = await prisma.blog.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Blog not found.' })
    await prisma.blog.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

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
  let settings = await prisma.siteSetting.findUnique({ where: { id: 'main' } })
  if (!settings) {
    settings = await prisma.siteSetting.create({
      data: { id: 'main', ...DEFAULT_SETTINGS }
    })
  }
  return settings
}

app.get('/api/settings', async (_req, res, next) => {
  try {
    const settings = await getSettings()
    res.json({
      ...settings,
      maintenanceMode: Boolean(settings.maintenanceMode)
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

app.put('/api/admin/settings', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const allowed = Object.keys(DEFAULT_SETTINGS)
    const data = {}

    for (const key of allowed) {
      if (req.body?.[key] !== undefined) data[key] = req.body[key]
    }

    if (data.postsPerPage !== undefined) {
      data.postsPerPage = Math.min(24, Math.max(1, Number(data.postsPerPage) || 6))
    }

    await getSettings()
    res.json(await prisma.siteSetting.update({ where: { id: 'main' }, data }))
  } catch (error) {
    next(error)
  }
})

app.get('/api/projects', async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { not: 'draft' } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    })
    res.json(projects)
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/projects', requireAdmin, async (_req, res, next) => {
  try {
    res.json(
      await prisma.project.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      })
    )
  } catch (error) {
    next(error)
  }
})

function normalizeProject(body, existing = {}) {
  const title = String(body.title || existing.title || '').trim()
  const slug = createSlug(body.slug || title || existing.slug)
  if (!title || !slug) return { error: 'Project title is required.' }

  const status = body.status ?? existing.status ?? 'draft'
  const statusLabels = {
    launching: 'Launching soon',
    ongoing: 'Ongoing',
    completed: 'Completed',
    draft: 'Draft'
  }

  return {
    title,
    slug,
    category: body.category ?? existing.category ?? null,
    location: body.location ?? existing.location ?? null,
    summary: body.summary ?? existing.summary ?? null,
    description: body.description ?? existing.description ?? null,
    coverImage: body.coverImage ?? existing.coverImage ?? null,
    status,
    statusLabel:
      body.statusLabel ??
      existing.statusLabel ??
      statusLabels[status] ??
      status,
    featured: body.featured ?? existing.featured ?? false,
    sortOrder: Number(body.sortOrder ?? existing.sortOrder ?? 0) || 0
  }
}

app.post('/api/admin/projects', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const project = normalizeProject(req.body)
    if (project.error) return res.status(400).json({ message: project.error })
    const created = await prisma.project.create({
      data: { id: crypto.randomUUID(), ...project }
    })
    res.status(201).json(created)
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.put('/api/admin/projects/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Project not found.' })
    const project = normalizeProject(req.body, existing)
    if (project.error) return res.status(400).json({ message: project.error })
    res.json(await prisma.project.update({ where: { id: req.params.id }, data: project }))
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.delete('/api/admin/projects/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Project not found.' })
    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

const DEFAULT_MENUS = {
  header: [
    { id: 'home', label: 'Home', url: '/#home' },
    { id: 'about', label: 'About', url: '/#about' },
    { id: 'projects', label: 'Projects', url: '/#projects' },
    { id: 'opportunities', label: 'Opportunities', url: '/#opportunities' },
    { id: 'approach', label: 'Approach', url: '/#approach' },
    { id: 'contact', label: 'Contact', url: '/#contact' }
  ],
  footer: [
    { id: 'about', label: 'About', url: '/#about' },
    { id: 'projects', label: 'Projects', url: '/#projects' },
    { id: 'contact', label: 'Contact', url: '/#contact' }
  ]
}

function landingMenuUrl(url) {
  const map = {
    '/': '/#home',
    '/about': '/#about',
    '/projects': '/#projects',
    '/opportunities': '/#opportunities',
    '/approach': '/#approach',
    '/contact': '/#contact'
  }
  const value = String(url || '')
  return map[value] || value
}

function isJournalMenuItem(item) {
  const label = String(item?.label || '').toLowerCase()
  const url = String(item?.url || item?.to || '').toLowerCase()
  const id = String(item?.id || '').toLowerCase()
  return (
    label === 'journal' ||
    id === 'journal' ||
    url === '/#blogs' ||
    url.endsWith('#blogs')
  )
}

function normalizeMenuItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .filter((item) => !isJournalMenuItem(item))
    .map((item) => ({
      ...item,
      url: landingMenuUrl(item.url || item.to || '/#home'),
      children: normalizeMenuItems(item.children)
    }))
}

async function getMenus() {
  let menus = await prisma.menu.findUnique({ where: { id: 'main' } })
  if (!menus) {
    menus = await prisma.menu.create({
      data: { id: 'main', header: DEFAULT_MENUS.header, footer: DEFAULT_MENUS.footer }
    })
  }

  const header = normalizeMenuItems(menus.header)
  const footer = normalizeMenuItems(menus.footer)
  const changed =
    JSON.stringify(header) !== JSON.stringify(menus.header) ||
    JSON.stringify(footer) !== JSON.stringify(menus.footer)

  if (changed) {
    menus = await prisma.menu.update({
      where: { id: 'main' },
      data: { header, footer }
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

app.put('/api/admin/menus', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const menus = req.body || {}
    if (!Array.isArray(menus.header) || !Array.isArray(menus.footer)) {
      return res.status(400).json({ message: 'Header and footer menus must be arrays.' })
    }

    res.json(
      await prisma.menu.upsert({
        where: { id: 'main' },
        create: { id: 'main', header: menus.header, footer: menus.footer },
        update: { header: menus.header, footer: menus.footer }
      })
    )
  } catch (error) {
    next(error)
  }
})

const DEFAULT_FORMS = [
  {
    id: 'contact',
    title: 'Contact form',
    submitLabel: 'Send enquiry',
    successMessage: 'Thank you. We will be in touch.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, placeholder: '' },
      { name: 'email', label: 'Email address', type: 'email', required: true, placeholder: '' },
      { name: 'phone', label: 'Phone number', type: 'tel', required: false, placeholder: '' },
      { name: 'topic', label: 'Topic', type: 'text', required: false, placeholder: '' },
      { name: 'message', label: 'Message', type: 'textarea', required: true, placeholder: '' }
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
      { name: 'landType', label: 'Land type', type: 'text' },
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
      { name: 'partnerType', label: 'Partner type', type: 'text' },
      { name: 'interest', label: 'Interest', type: 'text' },
      { name: 'message', label: 'How can we work together?', type: 'textarea' }
    ]
  }
]

async function getForms() {
  const forms = await prisma.form.findMany({ orderBy: { id: 'asc' } })
  if (forms.length > 0) return forms

  for (const form of DEFAULT_FORMS) {
    await prisma.form.upsert({ where: { id: form.id }, create: form, update: {} })
  }

  return prisma.form.findMany({ orderBy: { id: 'asc' } })
}

app.get('/api/forms', async (_req, res, next) => {
  try {
    res.json(await getForms())
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/forms', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Forms must be an array.' })
    }

    const forms = req.body.map((form) => ({
      id: String(form.id || '').trim(),
      title: String(form.title || '').trim(),
      submitLabel: form.submitLabel || null,
      successMessage: form.successMessage || null,
      fields: Array.isArray(form.fields) ? form.fields : []
    }))

    if (forms.some((form) => !form.id || !form.title)) {
      return res.status(400).json({ message: 'Every form must have an ID and title.' })
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

    res.json(await prisma.form.findMany({ orderBy: { id: 'asc' } }))
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/uploads', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const uploaded = await saveUpload({
      data: req.body?.data,
      filename: req.body?.filename,
      uploadDir: UPLOAD_DIR
    })
    res.status(201).json(uploaded)
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.get('/api/admin/media', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await listMedia(UPLOAD_DIR))
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/media/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    res.json(await deleteMedia(req.params.id, UPLOAD_DIR))
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.get('/api/media/:id', async (req, res, next) => {
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } })
    if (!asset?.dataBase64) return res.status(404).json({ message: 'Media not found.' })
    const buffer = Buffer.from(asset.dataBase64, 'base64')
    res.setHeader('Content-Type', asset.mimeType)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.send(buffer)
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/profile', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const phone = String(req.body?.phone || '').trim()
    const additionalContact = String(req.body?.additionalContact || '').trim()
    const avatar = String(req.body?.avatar || '')
    const loginUsername = String(req.body?.username || req.adminRecord.username || '').trim()

    if (!name || !isValidEmail(email)) {
      return res.status(400).json({
        message: 'Enter an admin name and valid email address.'
      })
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: 'Enter a valid phone number.' })
    }

    if (!loginUsername) {
      return res.status(400).json({ message: 'Username is required.' })
    }

    const updated = await prisma.admin.update({
      where: { id: 'admin' },
      data: {
        username: loginUsername,
        name,
        email,
        phone,
        additionalContact,
        avatar
      }
    })

    const session = createSession(updated.username, updated.sessionVersion, req.admin.rememberMe)
    setAuthCookie(res, session.token, session.maxAge)

    res.json(publicProfile(updated))
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
})

app.get('/api/admin/smtp', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await getSmtpConfig(SESSION_SECRET))
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/smtp', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const body = req.body || {}
    const current = await prisma.smtpSetting.findUnique({ where: { id: 'main' } })

    let passwordEnc = current?.passwordEnc || null
    if (typeof body.password === 'string' && body.password.length > 0) {
      passwordEnc = encryptSecret(body.password, SESSION_SECRET)
    }

    if (body.clearPassword) passwordEnc = null

    const data = {
      host: String(body.host || '').trim() || null,
      port: Math.min(65535, Math.max(1, Number(body.port) || 587)),
      username: String(body.username || '').trim() || null,
      passwordEnc,
      encryption: ['ssl', 'tls', 'none'].includes(String(body.encryption || '').toLowerCase())
        ? String(body.encryption).toLowerCase()
        : 'tls',
      fromEmail: String(body.fromEmail || '').trim() || null,
      fromName: String(body.fromName || '').trim() || null,
      replyTo: String(body.replyTo || '').trim() || null,
      notificationsEnabled: Boolean(body.notificationsEnabled)
    }

    if (data.fromEmail && !isValidEmail(data.fromEmail)) {
      return res.status(400).json({ message: 'Sender email is invalid.' })
    }

    if (data.replyTo && !isValidEmail(data.replyTo)) {
      return res.status(400).json({ message: 'Reply-to email is invalid.' })
    }

    await prisma.smtpSetting.upsert({
      where: { id: 'main' },
      create: { id: 'main', ...data },
      update: data
    })

    res.json(await getSmtpConfig(SESSION_SECRET))
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/smtp/test', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const testEmail = String(req.body?.email || '').trim()
    if (testEmail && !isValidEmail(testEmail)) {
      return res.status(400).json({ message: 'Enter a valid test email address.' })
    }

    await testSmtpConnection(SESSION_SECRET, testEmail || undefined)
    res.json({
      ok: true,
      message: testEmail
        ? `Test email sent to ${testEmail}.`
        : 'SMTP connection verified successfully.'
    })
  } catch (error) {
    res.status(400).json({ message: error.message || 'SMTP test failed.' })
  }
})

app.get('/api/admin/email-templates', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await ensureEmailTemplates())
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/email-templates/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    await ensureEmailTemplates()
    const existing = await prisma.emailTemplate.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Template not found.' })

    const subject = String(req.body?.subject || '').trim()
    const bodyHtml = String(req.body?.bodyHtml || '').trim()
    const name = String(req.body?.name || existing.name).trim()
    const enabled = req.body?.enabled !== undefined ? Boolean(req.body.enabled) : existing.enabled

    if (!subject || !bodyHtml) {
      return res.status(400).json({ message: 'Subject and body are required.' })
    }

    // Prevent raw JSON editing requirement: accept structured field values.
    res.json(
      await prisma.emailTemplate.update({
        where: { id: req.params.id },
        data: { name, subject, bodyHtml, enabled }
      })
    )
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/enquiries', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' } }))
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/enquiries/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const existing = await prisma.enquiry.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Enquiry not found.' })
    await prisma.enquiry.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/enquiries', async (req, res, next) => {
  try {
    const ip = req.ip || 'unknown'
    if (!rateLimit(enquiryAttempts, ip, { limit: 12, windowMs: 10 * 60 * 1000 })) {
      return res.status(429).json({ message: 'Too many submissions. Please try again later.' })
    }

    const body = req.body || {}
    const {
      type,
      name,
      message,
      email,
      consent,
      formId,
      phone
    } = body

    if (!consent) {
      return res.status(400).json({ message: 'Please accept the privacy policy.' })
    }

    const trimmedName = String(name || body.fullName || '').trim()
    if (!trimmedName) {
      return res.status(400).json({ message: 'Name is required.' })
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' })
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: 'Please enter a valid phone number.' })
    }

    if (formId) {
      const form = await prisma.form.findUnique({ where: { id: String(formId) } })
      if (form && Array.isArray(form.fields)) {
        for (const field of form.fields) {
          if (!field?.required) continue
          const value = body[field.name]
          if (value == null || String(value).trim() === '') {
            return res.status(400).json({
              message: `${field.label || field.name} is required.`
            })
          }
        }
      }
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        id: crypto.randomUUID(),
        type: type || 'General contact',
        name: trimmedName,
        email: String(email || '').trim().toLowerCase(),
        phone: phone ? String(phone).trim() : '',
        location: body.location ? String(body.location).trim() : '',
        landType: body.landType || '',
        partnerType: body.partnerType || '',
        interest: body.interest || '',
        topic: body.topic || '',
        message: message ? String(message).trim() : '',
        fields: Object.fromEntries(
          Object.entries(body).filter(([key]) => !['consent', 'type', 'formId'].includes(key))
        ),
        formId: String(formId || '')
      }
    })

    const smtp = await getSmtpConfig(SESSION_SECRET)
    if (smtp.notificationsEnabled) {
      const settings = await getSettings()
      const fields = enquiry.fields || {}
      const adminTemplate = pickEnquiryTemplateId(enquiry.type, enquiry.formId)

      if (settings.contactEmail) {
        try {
          await sendTemplatedEmail({
            sessionSecret: SESSION_SECRET,
            templateId: adminTemplate,
            to: settings.contactEmail,
            replyTo: enquiry.email || undefined,
            vars: {
              name: enquiry.name,
              type: enquiry.type,
              fields,
              message: enquiry.message
            }
          })
        } catch (error) {
          console.error('Admin enquiry email failed:', error.message)
        }
      }

      if (enquiry.email) {
        try {
          await sendTemplatedEmail({
            sessionSecret: SESSION_SECRET,
            templateId: 'customer_confirmation',
            to: enquiry.email,
            vars: {
              name: enquiry.name,
              fields,
              message: enquiry.message
            }
          })
        } catch (error) {
          console.error('Customer confirmation email failed:', error.message)
        }
      }
    }

    res.status(201).json({ ok: true, id: enquiry.id })
  } catch (error) {
    next(error)
  }
})

app.use('/uploads', express.static(UPLOAD_DIR))
app.use(express.static(CLIENT_DIST))

app.get(/.*/, (_req, res, next) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (error) => {
    if (error) next(error)
  })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Something went wrong. Please try again.' })
})

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`46Spaces API running on http://localhost:${PORT}`)
  })
}

export default app
