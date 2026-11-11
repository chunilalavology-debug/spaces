import crypto from 'crypto'

export function passwordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false
  const actual = crypto.scryptSync(String(password), record.salt, 64)
  const expected = Buffer.from(record.hash, 'hex')
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  )
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export function createSecretKey(secret) {
  return crypto.createHash('sha256').update(String(secret || 'missing')).digest()
}

export function encryptSecret(value, secret) {
  if (!value) return ''
  const key = createSecretKey(secret)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptSecret(payload, secret) {
  if (!payload) return ''
  const [ivPart, tagPart, dataPart] = String(payload).split('.')
  if (!ivPart || !tagPart || !dataPart) return ''
  const key = createSecretKey(secret)
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivPart, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final()
  ])
  return decrypted.toString('utf8')
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}
