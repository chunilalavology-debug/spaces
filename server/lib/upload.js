import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import prisma from './prisma.js'

const ALLOWED = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}

export function parseImageDataUrl(data) {
  const match =
    /^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(
      String(data || '')
    )

  if (!match) return null

  const mimeType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  return { mimeType, buffer, ext: ALLOWED[mimeType] }
}

export async function saveUpload({
  data,
  filename,
  uploadDir,
  maxBytes = 8 * 1024 * 1024
}) {
  const parsed = parseImageDataUrl(data)
  if (!parsed) {
    const error = new Error('Please upload a valid image (PNG, JPG, WEBP, GIF or SVG).')
    error.status = 400
    throw error
  }

  if (parsed.buffer.length > maxBytes) {
    const error = new Error('Image must be smaller than 8 MB.')
    error.status = 413
    throw error
  }

  const safeName = String(filename || 'image')
    .replace(/[^a-z0-9_-]/gi, '-')
    .slice(0, 40)
  const name = `${Date.now()}-${safeName || 'image'}.${parsed.ext}`
  const id = crypto.randomUUID()

  let storage = 'disk'
  let url = `/uploads/${name}`

  try {
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(path.join(uploadDir, name), parsed.buffer)
  } catch {
    storage = 'database'
    url = `/api/media/${id}`
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      id,
      filename: name,
      mimeType: parsed.mimeType,
      size: parsed.buffer.length,
      url,
      storage,
      dataBase64: storage === 'database' ? parsed.buffer.toString('base64') : null
    }
  })

  return {
    id: asset.id,
    url: asset.url,
    filename: asset.filename,
    size: asset.size,
    storage: asset.storage
  }
}

export async function listMedia(uploadDir) {
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      url: true,
      size: true,
      mimeType: true,
      storage: true,
      createdAt: true
    }
  })

  if (assets.length) return assets

  let files = []
  try {
    files = await fs.readdir(uploadDir)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  return files
    .filter((file) => /\.(png|jpe?g|webp|gif|svg)$/i.test(file))
    .map((file) => ({
      id: file,
      filename: file,
      url: `/uploads/${file}`,
      storage: 'disk'
    }))
}

export async function deleteMedia(id, uploadDir) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } })
  if (!asset) {
    const diskPath = path.join(uploadDir, id)
    try {
      await fs.unlink(diskPath)
      return { ok: true }
    } catch {
      const error = new Error('Media not found.')
      error.status = 404
      throw error
    }
  }

  if (asset.storage === 'disk') {
    try {
      await fs.unlink(path.join(uploadDir, asset.filename))
    } catch {
      // File may already be gone on ephemeral hosts.
    }
  }

  await prisma.mediaAsset.delete({ where: { id: asset.id } })
  return { ok: true }
}
