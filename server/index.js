import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
<<<<<<< HEAD
import crypto from 'crypto'
=======
>>>>>>> a2c25c8ff7d08cfe2bb5612765c4b2f0300f6134
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000
const DATA_DIR = path.join(__dirname, 'data')
<<<<<<< HEAD
const ENQUIRIES_FILE = path.join(DATA_DIR, 'enquiries.json')
const BLOGS_FILE = path.join(DATA_DIR, 'blogs.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json')
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist')
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : '46spaces-local-session-secret-change-before-deploy')
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Admin@123#')
const SESSION_TTL = 8 * 60 * 60 * 1000

if (process.env.NODE_ENV === 'production' && (!SESSION_SECRET || !process.env.ADMIN_PASSWORD)) {
  console.warn('Set ADMIN_SESSION_SECRET and ADMIN_PASSWORD in production before exposing the admin panel.')
}

app.disable('x-powered-by')
app.use(cors({ origin: process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? false : true), credentials: true }))
app.use(express.json({ limit: '1mb' }))

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error }
}
async function writeJson(file, value) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  await fs.writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 })
  await fs.rename(temp, file)
}
async function getAdminCredentials() {
  try { return await readJson(ADMIN_FILE, null) }
  catch (error) { throw error }
}
function passwordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return { salt, hash }
}
function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false
  const actual = crypto.scryptSync(String(password), record.salt, 64)
  const expected = Buffer.from(record.hash, 'hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}
async function ensureAdminCredentials() {
  if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) throw new Error('Configure ADMIN_SESSION_SECRET before enabling the admin panel.')
  let credentials = await getAdminCredentials()
  if (!credentials) {
    if (!ADMIN_PASSWORD) throw new Error('Configure ADMIN_PASSWORD before the first production admin login.')
    credentials = { username: ADMIN_USERNAME, ...passwordRecord(ADMIN_PASSWORD) }
    await writeJson(ADMIN_FILE, credentials)
  }
  return credentials
}
const readEnquiries = () => readJson(ENQUIRIES_FILE, [])
const readBlogs = () => readJson(BLOGS_FILE, [])
const readSettings = () => readJson(SETTINGS_FILE, {
  siteName: '46Spaces', tagline: 'Land. Ideas. Possibility.', description: '', contactEmail: 'hello@46spaces.com',
  contactPhone: '', address: '', instagram: '', linkedin: '', facebook: '', blogSectionTitle: 'Notes & perspectives',
  blogSectionDescription: 'Ideas, insights and stories from 46Spaces.', postsPerPage: 6, showBlogSection: true,
  seoTitle: '46Spaces — Land. Ideas. Possibility.', seoDescription: '', seoKeywords: '', maintenanceMode: false
})

function safeEqual(a, b) {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
function sign(value) { return crypto.createHmac('sha256', SESSION_SECRET || 'missing-production-secret').update(value).digest('base64url') }
function createSession(username) {
  const payload = Buffer.from(JSON.stringify({ username, exp: Date.now() + SESSION_TTL })).toString('base64url')
  return `${payload}.${sign(payload)}`
}
function getCookie(req, name) {
  const raw = req.headers.cookie || ''
  const item = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))
  return item ? decodeURIComponent(item.slice(name.length + 1)) : ''
}
function requireAdmin(req, res, next) {
  const token = getCookie(req, 'spaces_admin')
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return res.status(401).json({ message: 'Please sign in to continue.' })
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!session.username || session.exp < Date.now()) return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
    req.admin = session
    next()
  } catch { return res.status(401).json({ message: 'Invalid admin session.' }) }
}
const loginAttempts = new Map()
app.get('/api/health', (_req, res) => res.json({ ok: true, service: '46spaces-api' }))
app.post('/api/admin/login', async (req, res, next) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const attempt = loginAttempts.get(ip) || { count: 0, until: 0 }
    if (attempt.until > Date.now() && attempt.count >= 8) return res.status(429).json({ message: 'Too many attempts. Try again in a few minutes.' })
    if (attempt.until < Date.now()) { attempt.count = 0; attempt.until = Date.now() + 10 * 60 * 1000 }
    const credentials = await ensureAdminCredentials()
    const { username, password } = req.body || {}
    if (!safeEqual(username || '', credentials.username) || !verifyPassword(password || '', credentials)) {
      attempt.count += 1; loginAttempts.set(ip, attempt)
      return res.status(401).json({ message: 'Incorrect username or password.' })
    }
    loginAttempts.delete(ip)
    res.cookie('spaces_admin', createSession(credentials.username), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: SESSION_TTL, path: '/' })
    res.json({ ok: true, username: credentials.username })
  } catch (error) { next(error) }
})
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ ok: true, username: req.admin.username }))
app.post('/api/admin/logout', (_req, res) => { res.clearCookie('spaces_admin', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' }); res.json({ ok: true }) })
app.put('/api/admin/password', requireAdmin, async (req, res, next) => {
  try { const credentials = await ensureAdminCredentials(); const { currentPassword, newPassword } = req.body || {}; if (!verifyPassword(currentPassword || '', credentials)) return res.status(400).json({ message: 'Current password is incorrect.' }); if (typeof newPassword !== 'string' || newPassword.length < 12) return res.status(400).json({ message: 'New password must be at least 12 characters.' }); await writeJson(ADMIN_FILE, { username: credentials.username, ...passwordRecord(newPassword) }); res.json({ ok: true }) } catch (error) { next(error) }
})

app.get('/api/blogs', async (_req, res, next) => {
  try { const blogs = await readBlogs(); res.json(blogs.filter(blog => blog.status === 'published').sort((a,b) => new Date(b.publishedAt || b.updatedAt) - new Date(a.publishedAt || a.updatedAt))) }
  catch (error) { next(error) }
})
app.get('/api/blogs/:slug', async (req, res, next) => {
  try { const blogs = await readBlogs(); const blog = blogs.find(item => item.slug === req.params.slug && item.status === 'published'); if (!blog) return res.status(404).json({ message: 'Blog not found.' }); res.json(blog) }
  catch (error) { next(error) }
})
app.get('/api/admin/blogs', requireAdmin, async (_req, res, next) => { try { res.json((await readBlogs()).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))) } catch (e) { next(e) } })
function normalizeBlog(body, existing = {}) {
  const title = String(body.title || '').trim()
  const slug = String(body.slug || title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!title || !slug || !String(body.content || '').trim()) return { error: 'Title, slug and content are required.' }
  return { ...existing, title, slug, excerpt: String(body.excerpt || '').trim(), content: String(body.content || '').trim(), category: String(body.category || 'Insights').trim(), author: String(body.author || '46Spaces').trim(), coverImage: String(body.coverImage || '').trim(), status: body.status === 'published' ? 'published' : 'draft', seoTitle: String(body.seoTitle || '').trim(), seoDescription: String(body.seoDescription || '').trim(), updatedAt: new Date().toISOString() }
}
app.post('/api/admin/blogs', requireAdmin, async (req, res, next) => {
  try {
    const blogs = await readBlogs(); const blog = normalizeBlog(req.body)
    if (blog.error) return res.status(400).json({ message: blog.error })
    if (blogs.some(item => item.slug === blog.slug)) return res.status(409).json({ message: 'This slug is already in use.' })
    blog.id = crypto.randomUUID(); blog.createdAt = new Date().toISOString(); if (blog.status === 'published') blog.publishedAt = blog.createdAt
    blogs.push(blog); await writeJson(BLOGS_FILE, blogs); res.status(201).json(blog)
  } catch (e) { next(e) }
})
app.put('/api/admin/blogs/:id', requireAdmin, async (req, res, next) => {
  try {
    const blogs = await readBlogs(); const index = blogs.findIndex(item => item.id === req.params.id)
    if (index < 0) return res.status(404).json({ message: 'Blog not found.' })
    const blog = normalizeBlog(req.body, blogs[index]); if (blog.error) return res.status(400).json({ message: blog.error })
    if (blogs.some((item, i) => i !== index && item.slug === blog.slug)) return res.status(409).json({ message: 'This slug is already in use.' })
    if (blog.status === 'published' && !blog.publishedAt) blog.publishedAt = new Date().toISOString()
    blogs[index] = blog; await writeJson(BLOGS_FILE, blogs); res.json(blog)
  } catch (e) { next(e) }
})
app.delete('/api/admin/blogs/:id', requireAdmin, async (req, res, next) => {
  try { const blogs = await readBlogs(); const nextBlogs = blogs.filter(item => item.id !== req.params.id); if (nextBlogs.length === blogs.length) return res.status(404).json({ message: 'Blog not found.' }); await writeJson(BLOGS_FILE, nextBlogs); res.json({ ok: true }) }
  catch (e) { next(e) }
})
app.get('/api/settings', async (_req, res, next) => { try { const settings = await readSettings(); res.json({ ...settings, maintenanceMode: false }) } catch (e) { next(e) } })
app.get('/api/admin/settings', requireAdmin, async (_req, res, next) => { try { res.json(await readSettings()) } catch (e) { next(e) } })
app.put('/api/admin/settings', requireAdmin, async (req, res, next) => {
  try { const current = await readSettings(); const allowed = ['siteName','tagline','description','contactEmail','contactPhone','address','instagram','linkedin','facebook','blogSectionTitle','blogSectionDescription','postsPerPage','showBlogSection','seoTitle','seoDescription','seoKeywords','maintenanceMode']; const nextSettings = { ...current }; for (const key of allowed) if (req.body?.[key] !== undefined) nextSettings[key] = req.body[key]; nextSettings.postsPerPage = Math.min(24, Math.max(1, Number(nextSettings.postsPerPage) || 6)); await writeJson(SETTINGS_FILE, nextSettings); res.json(nextSettings) }
  catch (e) { next(e) }
})
app.get('/api/admin/enquiries', requireAdmin, async (_req, res, next) => { try { res.json((await readEnquiries()).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))) } catch (e) { next(e) } })
app.post('/api/enquiries', async (req, res, next) => {
  try {
    const { type, name, email, message, consent } = req.body || {}
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ message: 'Please enter a valid email address.' })
    if (!consent) return res.status(400).json({ message: 'Please accept the privacy policy.' })
    const enquiry = { id: Date.now().toString(36), type: type || 'General contact', name: String(name).trim(), email: String(email).trim().toLowerCase(), phone: req.body.phone ? String(req.body.phone).trim() : '', location: req.body.location ? String(req.body.location).trim() : '', landType: req.body.landType || '', partnerType: req.body.partnerType || '', interest: req.body.interest || '', topic: req.body.topic || '', message: message ? String(message).trim() : '', createdAt: new Date().toISOString() }
    const enquiries = await readEnquiries(); enquiries.push(enquiry); await writeJson(ENQUIRIES_FILE, enquiries); res.status(201).json({ ok: true, id: enquiry.id })
  } catch (e) { next(e) }
})

app.use(express.static(CLIENT_DIST))
app.get(/.*/, (_req, res, next) => res.sendFile(path.join(CLIENT_DIST, 'index.html'), error => { if (error) next(error) }))
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Something went wrong. Please try again.' }) })
app.listen(PORT, () => console.log(`46Spaces API running on http://localhost:${PORT}`))
=======
const DATA_FILE = path.join(DATA_DIR, 'enquiries.json')
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist')

app.use(cors())
app.use(express.json({ limit: '32kb' }))

async function readEnquiries() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function writeEnquiries(enquiries) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(enquiries, null, 2))
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: '46spaces-api' })
})

app.post('/api/enquiries', async (req, res) => {
  const { type, name, email, message, consent } = req.body || {}

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ message: 'Please enter a valid email address.' })
  }
  if (!consent) {
    return res.status(400).json({ message: 'Please accept the privacy policy.' })
  }

  const enquiry = {
    id: Date.now().toString(36),
    type: type || 'General contact',
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: req.body.phone ? String(req.body.phone).trim() : '',
    location: req.body.location ? String(req.body.location).trim() : '',
    landType: req.body.landType || '',
    partnerType: req.body.partnerType || '',
    interest: req.body.interest || '',
    topic: req.body.topic || '',
    message: message ? String(message).trim() : '',
    createdAt: new Date().toISOString()
  }

  const enquiries = await readEnquiries()
  enquiries.push(enquiry)
  await writeEnquiries(enquiries)

  res.status(201).json({ ok: true, id: enquiry.id })
})

app.use(express.static(CLIENT_DIST))
app.get(/.*/, (_req, res, next) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (error) => {
    if (error) next()
  })
})

app.listen(PORT, () => {
  console.log(`46Spaces API running on http://localhost:${PORT}`)
})
>>>>>>> a2c25c8ff7d08cfe2bb5612765c4b2f0300f6134
