import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000
const DATA_DIR = path.join(__dirname, 'data')
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
