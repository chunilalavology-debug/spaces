import nodemailer from 'nodemailer'
import prisma from './prisma.js'
import { decryptSecret } from './crypto.js'

const TEMPLATE_DEFAULTS = [
  {
    id: 'contact_admin',
    name: 'Contact form — admin notification',
    subject: 'New contact enquiry from {{name}}',
    bodyHtml: `
      <p>A new contact form submission was received.</p>
      {{fieldsTable}}
    `
  },
  {
    id: 'enquiry_admin',
    name: 'Enquiry form — admin notification',
    subject: 'New enquiry: {{type}}',
    bodyHtml: `
      <p>A new enquiry was submitted on the website.</p>
      {{fieldsTable}}
    `
  },
  {
    id: 'project_enquiry_admin',
    name: 'Project enquiry — admin notification',
    subject: 'Project enquiry from {{name}}',
    bodyHtml: `
      <p>A project-related enquiry was submitted.</p>
      {{fieldsTable}}
    `
  },
  {
    id: 'admin_notification',
    name: 'Generic admin notification',
    subject: '{{subject}}',
    bodyHtml: `<p>{{message}}</p>{{fieldsTable}}`
  },
  {
    id: 'customer_confirmation',
    name: 'Customer confirmation',
    subject: 'We received your message — {{siteName}}',
    bodyHtml: `
      <p>Hello {{name}},</p>
      <p>Thank you for contacting {{siteName}}. We have received your message and will respond shortly.</p>
      {{fieldsTable}}
      <p>Warm regards,<br/>{{siteName}}</p>
    `
  },
  {
    id: 'forgot_password',
    name: 'Forgot password',
    subject: 'Reset your {{siteName}} admin password',
    bodyHtml: `
      <p>We received a request to reset your admin password.</p>
      <p><a href="{{resetUrl}}" style="display:inline-block;padding:12px 18px;background:#1f1f1f;color:#fff;text-decoration:none;border-radius:4px;">Reset password</a></p>
      <p>This link expires in {{expiresMinutes}} minutes. If you did not request this, you can ignore this email.</p>
    `
  },
  {
    id: 'password_reset_confirmation',
    name: 'Password reset confirmation',
    subject: 'Your {{siteName}} password was changed',
    bodyHtml: `
      <p>Your admin password was successfully updated.</p>
      <p>If you did not make this change, sign in and reset your password immediately, or contact your site administrator.</p>
    `
  }
]

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function absoluteUrl(url, baseUrl) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  const base = String(baseUrl || '').replace(/\/$/, '')
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

function fieldsTable(fields = {}) {
  const rows = Object.entries(fields)
    .filter(([key, value]) => value != null && String(value).trim() !== '' && key !== 'consent')
    .map(
      ([key, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e7e2d9;font-weight:600;text-transform:capitalize;">${escapeHtml(key)}</td><td style="padding:8px 12px;border:1px solid #e7e2d9;">${escapeHtml(value)}</td></tr>`
    )
    .join('')

  if (!rows) return ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:20px 0;">${rows}</table>`
}

function renderTemplate(html, vars) {
  return String(html || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    if (key === 'fieldsTable') return vars.fieldsTable || ''
    return escapeHtml(vars[key] ?? '')
  })
}

export function wrapEmailLayout({ logoUrl, siteName, contentHtml, baseUrl }) {
  const logo = absoluteUrl(logoUrl || '/assets/logo.png', baseUrl)
  const brand = escapeHtml(siteName || '46Spaces')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f1f1f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e7e2d9;">
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid #e7e2d9;text-align:center;">
              <img src="${escapeHtml(logo)}" alt="${brand}" width="160" style="max-width:160px;height:auto;display:inline-block;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-size:16px;line-height:1.6;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e7e2d9;background:#faf8f4;font-size:13px;color:#6b655c;text-align:center;">
              ${brand} · Land. Ideas. Possibility.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function ensureEmailTemplates() {
  for (const template of TEMPLATE_DEFAULTS) {
    await prisma.emailTemplate.upsert({
      where: { id: template.id },
      create: template,
      update: {}
    })
  }

  return prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } })
}

export async function getSmtpConfig(sessionSecret) {
  const settings = await prisma.smtpSetting.findUnique({ where: { id: 'main' } })
  if (!settings) {
    return {
      host: '',
      port: 587,
      username: '',
      passwordSet: false,
      encryption: 'tls',
      fromEmail: '',
      fromName: '',
      replyTo: '',
      notificationsEnabled: false
    }
  }

  return {
    host: settings.host || '',
    port: settings.port || 587,
    username: settings.username || '',
    passwordSet: Boolean(settings.passwordEnc),
    encryption: settings.encryption || 'tls',
    fromEmail: settings.fromEmail || '',
    fromName: settings.fromName || '',
    replyTo: settings.replyTo || '',
    notificationsEnabled: settings.notificationsEnabled
  }
}

async function createTransport(sessionSecret) {
  const settings = await prisma.smtpSetting.findUnique({ where: { id: 'main' } })
  if (!settings?.host || !settings?.fromEmail) {
    throw new Error('SMTP is not configured. Add host and sender email in Email settings.')
  }

  const password = decryptSecret(settings.passwordEnc || '', sessionSecret)
  const port = Number(settings.port) || 587
  const encryption = String(settings.encryption || 'tls').toLowerCase()

  return {
    transporter: nodemailer.createTransport({
      host: settings.host,
      port,
      secure: encryption === 'ssl' || port === 465,
      requireTLS: encryption === 'tls',
      auth: settings.username
        ? {
            user: settings.username,
            pass: password
          }
        : undefined
    }),
    settings
  }
}

export async function sendMail({
  sessionSecret,
  to,
  subject,
  html,
  replyTo
}) {
  const { transporter, settings } = await createTransport(sessionSecret)

  return transporter.sendMail({
    from: `"${settings.fromName || '46Spaces'}" <${settings.fromEmail}>`,
    to,
    subject,
    html,
    replyTo: replyTo || settings.replyTo || undefined
  })
}

export async function sendTemplatedEmail({
  sessionSecret,
  templateId,
  to,
  vars = {},
  replyTo
}) {
  const [template, site] = await Promise.all([
    prisma.emailTemplate.findUnique({ where: { id: templateId } }),
    prisma.siteSetting.findUnique({ where: { id: 'main' } })
  ])

  if (!template || !template.enabled) {
    throw new Error(`Email template "${templateId}" is missing or disabled.`)
  }

  const baseUrl = process.env.CLIENT_ORIGIN || process.env.PUBLIC_BASE_URL || ''
  const merged = {
    siteName: site?.siteName || '46Spaces',
    fieldsTable: fieldsTable(vars.fields || {}),
    ...vars
  }

  const contentHtml = renderTemplate(template.bodyHtml, merged)
  const subject = renderTemplate(template.subject, merged)
  const html = wrapEmailLayout({
    logoUrl: site?.logoUrl,
    siteName: site?.siteName,
    contentHtml,
    baseUrl
  })

  return sendMail({
    sessionSecret,
    to,
    subject,
    html,
    replyTo
  })
}

export async function testSmtpConnection(sessionSecret, testEmail) {
  const { transporter, settings } = await createTransport(sessionSecret)
  await transporter.verify()

  if (testEmail) {
    const site = await prisma.siteSetting.findUnique({ where: { id: 'main' } })
    const baseUrl = process.env.CLIENT_ORIGIN || process.env.PUBLIC_BASE_URL || ''
    const html = wrapEmailLayout({
      logoUrl: site?.logoUrl,
      siteName: site?.siteName,
      contentHtml: '<p>This is a test email from your 46Spaces SMTP configuration. Delivery is working.</p>',
      baseUrl
    })

    await transporter.sendMail({
      from: `"${settings.fromName || '46Spaces'}" <${settings.fromEmail}>`,
      to: testEmail,
      subject: '46Spaces SMTP test',
      html,
      replyTo: settings.replyTo || undefined
    })
  }

  return { ok: true }
}

export function pickEnquiryTemplateId(type = '', formId = '') {
  const haystack = `${type} ${formId}`.toLowerCase()
  if (haystack.includes('project')) return 'project_enquiry_admin'
  if (haystack.includes('contact')) return 'contact_admin'
  return 'enquiry_admin'
}
