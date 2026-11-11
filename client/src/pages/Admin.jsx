
import { UserRound, Eye, EyeOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import FormBuilder from '../components/admin/FormBuilder'
import MenuEditor from '../components/admin/MenuEditor'
import '../admin.css'

const emptyBlog = {
  title: '',
  slug: '',
  excerpt: '',
  category: 'Insights',
  author: '46Spaces',
  coverImage: '',
  content: '',
  status: 'draft',
  seoTitle: '',
  seoDescription: ''
}

const defaults = {
  siteName: '46Spaces',
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

let sessionCsrf = ''

const CSRF_SKIP = ['/admin/login', '/admin/forgot-password', '/admin/reset-password']

function readCsrfCookie() {
  const match = document.cookie.match(/(?:^|;\s*)spaces_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function resolveCsrfToken() {
  return sessionCsrf || readCsrfCookie()
}

function storeCsrfToken(token) {
  if (token) sessionCsrf = token
}

async function api(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const skipCsrf =
    options.skipCsrf ||
    CSRF_SKIP.some((path) => url === path || url.startsWith(`${path}?`))

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers
  }

  if (mutating && !skipCsrf) {
    const token = resolveCsrfToken()
    if (token) headers['x-csrf-token'] = token
  }

  const response = await fetch(`/api${url}`, {
    credentials: 'include',
    ...options,
    headers
  })

  const data =
    response.status === 204
      ? {}
      : await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

async function refreshCsrf() {
  try {
    const data = await api('/admin/csrf', { skipCsrf: true })
    storeCsrfToken(data.csrfToken)
    return data.csrfToken
  } catch {
    return resolveCsrfToken()
  }
}

const defaultSmtp = {
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

const emptyProfile = {
  name: '',
  email: '',
  phone: '',
  additionalContact: '',
  avatar: '',
  username: ''
}

function isResetPasswordPath() {
  return window.location.pathname.replace(/\/+$/, '') === '/admin/reset-password'
}

function resetTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token') || ''
}

const dateLabel = value =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—'

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [authScreen, setAuthScreen] = useState(() =>
    isResetPasswordPath() ? 'reset' : 'login'
  )
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotNotice, setForgotNotice] = useState('')
  const [resetToken] = useState(() => resetTokenFromUrl())
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)

  const [error, setError] = useState('')
  const [section, setSection] = useState('overview')
  const [loadWarnings, setLoadWarnings] = useState([])

  const [blogs, setBlogs] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [settings, setSettings] = useState(defaults)

  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [projects, setProjects] = useState([])
  const [projectEditor, setProjectEditor] = useState(null)
const [menus, setMenus] = useState({ header: [], footer: [] })
const [forms, setForms] = useState([])
const [selectedFormId, setSelectedFormId] = useState('')
  const [media, setMedia] = useState([])
  const [profile, setProfile] = useState(emptyProfile)
  const [profileMessage, setProfileMessage] = useState('')
  const [smtp, setSmtp] = useState(defaultSmtp)
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpTestEmail, setSmtpTestEmail] = useState('')
  const [smtpMessage, setSmtpMessage] = useState('')
  const [emailTemplates, setEmailTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateMessage, setTemplateMessage] = useState('')

  function applySessionPayload(data) {
    storeCsrfToken(data?.csrfToken)
    const nextProfile = {
      ...emptyProfile,
      ...(data?.profile || {})
    }
    if (data?.username) nextProfile.username = data.username
    setProfile(nextProfile)
    setLoginId(data?.username || nextProfile.username || '')
  }

  // Load dashboard data safely
  async function loadData() {
    const labels = [
      'blogs',
      'settings',
      'enquiries',
      'projects',
      'menus',
      'forms',
      'session',
      'media',
      'smtp',
      'email-templates'
    ]

    const results = await Promise.allSettled([
      api('/admin/blogs'),
      api('/admin/settings'),
      api('/admin/enquiries'),
      api('/admin/projects'),
      api('/menus'),
      api('/forms'),
      api('/admin/session'),
      api('/admin/media'),
      api('/admin/smtp'),
      api('/admin/email-templates')
    ])

    const warnings = []
    const pick = (index, fallback) => {
      const result = results[index]
      if (result.status === 'fulfilled') return result.value
      warnings.push(`${labels[index]}: ${result.reason?.message || 'failed'}`)
      return fallback
    }

    const blogData = pick(0, [])
    const settingsData = pick(1, {})
    const enquiryData = pick(2, [])
    const projectData = pick(3, [])
    const menuData = pick(4, { header: [], footer: [] })
    const formData = pick(5, [])
    const profileData = pick(6, {})
    const mediaData = pick(7, [])
    const smtpData = pick(8, defaultSmtp)
    const templatesData = pick(9, [])

    const safeBlogs = Array.isArray(blogData)
      ? blogData
      : Array.isArray(blogData?.blogs)
        ? blogData.blogs
        : []

    const safeEnquiries = Array.isArray(enquiryData)
      ? enquiryData
      : Array.isArray(enquiryData?.enquiries)
        ? enquiryData.enquiries
        : []

    const safeSettings =
      settingsData &&
      typeof settingsData === 'object' &&
      !Array.isArray(settingsData)
        ? settingsData
        : {}

    setBlogs(safeBlogs)
    setEnquiries(safeEnquiries)
    setSettings({ ...defaults, ...safeSettings })
    setProjects(Array.isArray(projectData) ? projectData : [])
    setMenus({
      header: Array.isArray(menuData?.header) ? menuData.header : [],
      footer: Array.isArray(menuData?.footer) ? menuData.footer : []
    })

    const loadedForms = Array.isArray(formData)
      ? formData
      : Array.isArray(formData?.value)
        ? formData.value
        : []

    setForms(loadedForms)
    setSelectedFormId((current) => current || loadedForms[0]?.id || '')

    if (profileData?.ok || profileData?.profile) {
      applySessionPayload(profileData)
    }

    setMedia(Array.isArray(mediaData) ? mediaData : [])
    setSmtp({ ...defaultSmtp, ...(smtpData && typeof smtpData === 'object' ? smtpData : {}) })
    setSmtpPassword('')

    const templates = Array.isArray(templatesData) ? templatesData : []
    setEmailTemplates(templates)
    setSelectedTemplateId((current) => {
      if (current && templates.some((t) => t.id === current)) return current
      return templates[0]?.id || ''
    })

    setLoadWarnings(warnings)
  }

  // Check admin session
  useEffect(() => {
    api('/admin/session')
      .then((data) => {
        applySessionPayload(data)
        setAuthenticated(true)
        return loadData()
      })
      .catch(async () => {
        if (!resolveCsrfToken()) await refreshCsrf().catch(() => {})
      })
      .finally(() => setChecking(false))
  }, [])

  // Admin login
  async function login(event) {
    event.preventDefault()
    setError('')

    try {
      const data = await api('/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: loginId,
          password,
          rememberMe
        })
      })

      applySessionPayload(data)
      setAuthenticated(true)
      setAuthScreen('login')
      await loadData()
    } catch (e) {
      setError(e.message)
    }
  }

  async function submitForgotPassword(event) {
    event.preventDefault()
    setError('')
    setForgotNotice('')

    try {
      const data = await api('/admin/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail })
      })
      setForgotNotice(
        data.message ||
          'If that email matches an admin account, a reset link has been sent.'
      )
    } catch (e) {
      setError(e.message)
    }
  }

  async function submitResetPassword(event) {
    event.preventDefault()
    setError('')

    if (resetPassword.length < 12) {
      setError('Choose a new password with at least 12 characters.')
      return
    }

    if (resetPassword !== resetConfirm) {
      setError('Passwords do not match.')
      return
    }

    if (!resetToken) {
      setError('Reset token is missing from the link. Request a new reset email.')
      return
    }

    try {
      const data = await api('/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword: resetPassword })
      })
      setForgotNotice(data.message || 'Password updated. You can sign in now.')
      setResetPassword('')
      setResetConfirm('')
      setAuthScreen('login')
      if (window.history.replaceState) {
        window.history.replaceState({}, '', '/admin')
      }
    } catch (e) {
      setError(e.message)
    }
  }

  // Admin logout
  async function logout() {
    try {
      await api('/admin/logout', { method: 'POST' })
      sessionCsrf = ''
      setAuthenticated(false)
      setPassword('')
      setSection('overview')
      setEditor(null)
      setProjectEditor(null)
      setNotice('')
    } catch (e) {
      setError(e.message)
    }
  }

  // Save blog
  async function saveBlog(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const saved = await api(
        editor.id
          ? `/admin/blogs/${editor.id}`
          : '/admin/blogs',
        {
          method: editor.id ? 'PUT' : 'POST',
          body: JSON.stringify(editor)
        }
      )

      setBlogs(current => {
        const list = Array.isArray(current) ? current : []

        if (editor.id) {
          return list.map(item =>
            item.id === editor.id ? saved : item
          )
        }

        return [saved, ...list]
      })

      setEditor(null)
      setNotice('Blog saved successfully.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Delete blog
  async function deleteBlog(blog) {
    if (
      !window.confirm(
        `Delete "${blog.title}"? This cannot be undone.`
      )
    ) {
      return
    }

    try {
      await api(`/admin/blogs/${blog.id}`, {
        method: 'DELETE'
      })

      setBlogs(current =>
        Array.isArray(current)
          ? current.filter(item => item.id !== blog.id)
          : []
      )

      setNotice('Blog deleted.')
    } catch (e) {
      setError(e.message)
    }
  }

  // Save website settings
  async function saveSettings(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const saved = await api('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      })

      setSettings({
        ...defaults,
        ...(saved && typeof saved === 'object' ? saved : {})
      })

      setNotice('Settings updated successfully.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Change admin password
  async function changePassword() {
    setSaving(true)
    setPasswordMessage('')
    setError('')

    try {
      await api('/admin/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      setCurrentPassword('')
      setNewPassword('')
      setPasswordMessage('Password updated successfully.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }


  async function saveProject(event) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const saved = await api(projectEditor.id ? `/admin/projects/${projectEditor.id}` : '/admin/projects', {
        method: projectEditor.id ? 'PUT' : 'POST', body: JSON.stringify(projectEditor)
      })
      setProjects(list => projectEditor.id ? list.map(x => x.id === saved.id ? saved : x) : [saved, ...list])
      setProjectEditor(null); setNotice('Project saved successfully.')
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  async function deleteProject(item) {
    if (!confirm(`Delete "${item.title}"?`)) return
    try { await api(`/admin/projects/${item.id}`, { method: 'DELETE' }); setProjects(x => x.filter(p => p.id !== item.id)); setNotice('Project deleted.') }
    catch (e) { setError(e.message) }
  }
async function saveMenus(event) {
  event.preventDefault()
  setSaving(true)
  setError('')

  try {
    const saved = await api('/admin/menus', {
      method: 'PUT',
      body: JSON.stringify({
        header: menus.header,
        footer: menus.footer
      })
    })

    setMenus({
      header: Array.isArray(saved?.header) ? saved.header : menus.header,
      footer: Array.isArray(saved?.footer) ? saved.footer : menus.footer
    })

    setNotice('Navigation menus saved successfully.')
  } catch (e) {
    setError(e.message)
  } finally {
    setSaving(false)
  }
}

async function saveForms(event) {
  event.preventDefault()
  setSaving(true)
  setError('')

  try {
    const saved = await api('/admin/forms', {
      method: 'PUT',
      body: JSON.stringify(forms)
    })

    const updatedForms = Array.isArray(saved)
      ? saved
      : Array.isArray(saved?.value)
        ? saved.value
        : forms

    setForms(updatedForms)
    setNotice('Form definitions saved successfully.')
  } catch (e) {
    setError(e.message)
  } finally {
    setSaving(false)
  }
}
  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setProfileMessage('')

    try {
      const saved = await api('/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      })
      applySessionPayload({ profile: saved, username: profile.username || loginId })
      setProfileMessage('Profile updated successfully.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveSmtp(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSmtpMessage('')

    try {
      const payload = {
        host: smtp.host,
        port: Number(smtp.port) || 587,
        username: smtp.username,
        encryption: smtp.encryption,
        fromEmail: smtp.fromEmail,
        fromName: smtp.fromName,
        replyTo: smtp.replyTo,
        notificationsEnabled: smtp.notificationsEnabled
      }
      if (smtpPassword) payload.password = smtpPassword

      const saved = await api('/admin/smtp', {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      setSmtp({ ...defaultSmtp, ...saved })
      setSmtpPassword('')
      setSmtpMessage('SMTP settings saved.')
      setNotice('SMTP settings updated.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function testSmtpConnection() {
    setSaving(true)
    setError('')
    setSmtpMessage('')

    try {
      const data = await api('/admin/smtp/test', {
        method: 'POST',
        body: JSON.stringify({
          email: smtpTestEmail.trim() || undefined
        })
      })
      setSmtpMessage(data.message || 'SMTP connection verified.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveEmailTemplate(event) {
    event.preventDefault()
    const template = emailTemplates.find((t) => t.id === selectedTemplateId)
    if (!template) return

    setSaving(true)
    setError('')
    setTemplateMessage('')

    try {
      const saved = await api(`/admin/email-templates/${template.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: template.name,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          enabled: template.enabled
        })
      })
      setEmailTemplates((list) =>
        list.map((item) => (item.id === saved.id ? saved : item))
      )
      setTemplateMessage('Template saved.')
      setNotice('Email template updated.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function updateSelectedTemplate(patch) {
    setEmailTemplates((list) =>
      list.map((item) =>
        item.id === selectedTemplateId ? { ...item, ...patch } : item
      )
    )
  }

  async function deleteEnquiry(item) {
    if (
      !window.confirm(
        `Delete enquiry from "${item.name || 'visitor'}"? This cannot be undone.`
      )
    ) {
      return
    }

    try {
      await api(`/admin/enquiries/${item.id}`, { method: 'DELETE' })
      setEnquiries((list) => list.filter((entry) => entry.id !== item.id))
      setNotice('Enquiry deleted.')
    } catch (e) {
      setError(e.message)
    }
  }

  async function deleteMediaItem(item) {
    const label = item.filename || item.name || item.id
    if (
      !window.confirm(`Delete "${label}" from the media library? This cannot be undone.`)
    ) {
      return
    }

    try {
      await api(`/admin/media/${item.id}`, { method: 'DELETE' })
      setMedia((list) => list.filter((entry) => entry.id !== item.id))
      setNotice('Media deleted.')
    } catch (e) {
      setError(e.message)
    }
  }
  async function uploadImage(event, target) {
    const file = event.target.files?.[0]; if (!file) return
    if (file.size > 8 * 1024 * 1024) { setError('Please choose an image smaller than 8 MB.'); return }
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const uploaded = await api('/admin/uploads', { method: 'POST', body: JSON.stringify({ data: reader.result, filename: file.name.replace(/\.[^.]+$/, '') }) })
        if (target === 'logoUrl' || target === 'faviconUrl') setSettings(v => ({ ...v, [target]: uploaded.url }))
        if (target === 'avatar') setProfile(v => ({ ...v, avatar: uploaded.url }))
        if (target === 'projectCoverImage') setProjectEditor(v => ({ ...v, coverImage: uploaded.url }))
        setMedia((v) => [
          {
            id: uploaded.id || uploaded.filename,
            filename: uploaded.filename,
            name: uploaded.filename,
            url: uploaded.url
          },
          ...v
        ])
        setNotice('Image uploaded.')
      } catch (e) { setError(e.message) }
    }
    reader.readAsDataURL(file)
  }

  // Safe blog list
  const safeBlogList = Array.isArray(blogs) ? blogs : []

  const safeEnquiryList = Array.isArray(enquiries)
    ? enquiries
    : []

  const published = safeBlogList.filter(
    item => item.status === 'published'
  ).length

  const filteredBlogs = useMemo(
    () =>
      (Array.isArray(blogs) ? blogs : []).filter(blog =>
        `${blog.title || ''} ${blog.category || ''} ${blog.status || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [blogs, search]
  )

  const selectedTemplate = useMemo(
    () => emailTemplates.find((t) => t.id === selectedTemplateId) || null,
    [emailTemplates, selectedTemplateId]
  )

  if (checking) {
    return (
      <div className="admin-loading">
        Loading admin workspace…
      </div>
    )
  }

  // Login / forgot / reset screens
  if (!authenticated) {
  const authTitle =
    authScreen === 'reset'
      ? 'Set a new password'
      : authScreen === 'forgot'
        ? 'Forgot password'
        : 'Welcome back.'

  const authSubtitle =
    authScreen === 'reset'
      ? 'Choose a strong password with at least 12 characters.'
      : authScreen === 'forgot'
        ? 'Enter the email on your admin account and we will send a reset link.'
        : 'Sign in to manage your website.'

    return (
      <main className="admin-login-shell">
        <form
          className="admin-login-card"
          onSubmit={
            authScreen === 'reset'
              ? submitResetPassword
              : authScreen === 'forgot'
                ? submitForgotPassword
                : login
          }
        >
          <a
            className="admin-login-logo"
            href="/"
            aria-label="46Spaces home"
          >
            <img src="/assets/logo.png" alt="46Spaces" />
          </a>

          <p className="admin-eyebrow">CONTENT MANAGEMENT</p>

          <h1>{authTitle}</h1>

          <p className="admin-muted">{authSubtitle}</p>

          {error && <div className="admin-alert">{error}</div>}
          {forgotNotice && (
            <div className="admin-notice" style={{ marginBottom: 16 }}>
              {forgotNotice}
            </div>
          )}

          {authScreen === 'login' && (
            <>
              <label>
                Username or email
                <input
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </label>

              <label>
                Password
                <div className="admin-password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>

              <label className="admin-login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me on this device</span>
              </label>

              <button className="admin-primary" type="submit">
                Sign in <span>→</span>
              </button>

              <button
                type="button"
                className="admin-text-button admin-forgot-trigger"
                onClick={() => {
                  setError('')
                  setForgotNotice('')
                  setAuthScreen('forgot')
                }}
              >
                Forgot password?
              </button>
            </>
          )}

          {authScreen === 'forgot' && (
            <>
              <label>
                Admin email
                <input
                  type="email"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </label>

              <button className="admin-primary" type="submit">
                Send reset link <span>→</span>
              </button>

              <button
                type="button"
                className="admin-text-button admin-forgot-trigger"
                onClick={() => {
                  setError('')
                  setForgotNotice('')
                  setAuthScreen('login')
                }}
              >
                ← Back to sign in
              </button>
            </>
          )}

          {authScreen === 'reset' && (
            <>
              {!resetToken && (
                <div className="admin-alert">
                  This reset link is invalid. Request a new link from the sign-in page.
                </div>
              )}

              <label>
                New password
                <div className="admin-password-wrap">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={12}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    disabled={!resetToken}
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setShowResetPassword((prev) => !prev)}
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>

              <label>
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  required
                  disabled={!resetToken}
                />
              </label>

              <button
                className="admin-primary"
                type="submit"
                disabled={!resetToken}
              >
                Update password <span>→</span>
              </button>

              <button
                type="button"
                className="admin-text-button admin-forgot-trigger"
                onClick={() => {
                  setError('')
                  setAuthScreen('login')
                  if (window.history.replaceState) {
                    window.history.replaceState({}, '', '/admin')
                  }
                }}
              >
                ← Back to sign in
              </button>
            </>
          )}

          <a className="admin-back-link" href="/">
            ← Back to website
          </a>
        </form>
      </main>
    )
  }

  // Admin dashboard
  return (
    <div className="admin-app">

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <a
          className="admin-login-logo"
          href="/"
          aria-label="46Spaces home"
        >
          <img src="/assets/logo.png" alt="46Spaces" />
        </a>

        <div className="admin-side-label">
          WORKSPACE
        </div>

        <nav>
          {[
            ['overview', '▦', 'Overview'],
            ['blogs', '▤', 'Blogs'],
            ['projects', '▦', 'Projects'],
            ['menus', '☷', 'Navigation menus'],
            ['forms', '▧', 'Form builder'],
            ['media', '▣', 'Media library'],
            ['settings', '⚙', 'Website settings'],
            ['smtp', '✉', 'Email / SMTP'],
            ['email-templates', '◇', 'Email templates'],
            ['profile', '◉', 'Admin profile'],
            ['enquiries', '✉', 'Enquiries']
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              onClick={() => {
                setSection(id)
                setEditor(null)
                setError('')
              }}
            >
              <span>{icon}</span>
              {label}
              {id === 'blogs' && (
                <small>{safeBlogList.length}</small>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-user-avatar">
            {profile.avatar ? <img src={profile.avatar} alt="" /> : <UserRound size={21} strokeWidth={1.7} />}
          </div>
          <div className="admin-user-meta"><strong>{profile.name || profile.username || loginId || 'Admin'}</strong><small>{profile.email || 'Administrator'}</small></div>

          <button
            type="button"
            className="admin-logout-button"
            onClick={logout}
          >
            Logout →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">

        <header className="admin-topbar">
          <div>
            <span className="admin-top-kicker">
              46SPACES / ADMIN
            </span>

            <span className="admin-top-title">
              {editor
                ? editor.id
                  ? 'Edit blog'
                  : 'New blog'
                : {
                    overview: 'Overview',
                    blogs: 'Blog management',
                    settings: 'Website settings',
                    projects: 'Project management',
                    menus: 'Navigation menus',
                    forms: 'Form builder',
                    media: 'Media library',
                    smtp: 'Email / SMTP',
                    'email-templates': 'Email templates',
                    profile: 'Admin profile',
                    enquiries: 'Enquiries'
                  }[section]}
            </span>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="admin-view-site"
          >
            View website →
          </a>
        </header>

        <div className="admin-content">

          {notice && (
            <div className="admin-notice">
              {notice}
              <button onClick={() => setNotice('')}>
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="admin-alert">
              {error}
              <button onClick={() => setError('')}>
                ×
              </button>
            </div>
          )}

          {!!loadWarnings.length && section === 'overview' && (
            <div className="admin-alert admin-alert-soft">
              Some dashboard data could not be loaded: {loadWarnings.join(' · ')}
            </div>
          )}

          {/* OVERVIEW */}
          {section === 'overview' && !editor && (
            <>
              <div className="admin-page-intro">
                <div>
                  <p className="admin-eyebrow">
                    YOUR WEBSITE AT A GLANCE
                  </p>

                  <h1>
                    Good to see you
                    {profile.name || profile.username
                      ? `, ${profile.name || profile.username}`
                      : ''}
                    .
                  </h1>

                  <p className="admin-muted">
                    Here’s what’s happening with your website today.
                  </p>
                </div>

                <button
                  className="admin-primary compact"
                  onClick={() => {
                    setSection('blogs')
                    setEditor({ ...emptyBlog })
                  }}
                >
                  ＋ Create a blog
                </button>
              </div>

              <div className="admin-stats">
                <article>
                  <span>Total articles</span>
                  <strong>
                    {safeBlogList.length.toString().padStart(2, '0')}
                  </strong>
                  <small>All blog posts</small>
                </article>

                <article>
                  <span>Published</span>
                  <strong>
                    {published.toString().padStart(2, '0')}
                  </strong>
                  <small>Visible on website</small>
                </article>

                <article>
                  <span>Drafts</span>
                  <strong>
                    {(safeBlogList.length - published)
                      .toString()
                      .padStart(2, '0')}
                  </strong>
                  <small>Not yet published</small>
                </article>

                <article>
                  <span>Enquiries</span>
                  <strong>
                    {safeEnquiryList.length.toString().padStart(2, '0')}
                  </strong>
                  <small>Website submissions</small>
                </article>
              </div>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <p className="admin-eyebrow">CONTENT</p>
                    <h2>Recent articles</h2>
                  </div>

                  <button
                    className="admin-text-button"
                    onClick={() => setSection('blogs')}
                  >
                    View all articles →
                  </button>
                </div>

                <BlogTable
                  blogs={safeBlogList.slice(0, 5)}
                  onEdit={blog => {
                    setSection('blogs')
                    setEditor({ ...blog })
                  }}
                  onDelete={deleteBlog}
                />
              </section>

              <div className="admin-quick-grid">
                <button
                  onClick={() => {
                    setSection('blogs')
                    setEditor({ ...emptyBlog })
                  }}
                >
                  <span>＋</span>
                  <strong>Write a new article</strong>
                  <small>Add a story to your website</small>
                </button>

                <button onClick={() => setSection('settings')}>
                  <span>⚙</span>
                  <strong>Configure website</strong>
                  <small>Update SEO and site details</small>
                </button>
              </div>
            </>
          )}

          {/* BLOG LIST */}
          {section === 'blogs' && !editor && (
            <>
              <div className="admin-page-intro">
                <div>
                  <p className="admin-eyebrow">PUBLISHING</p>
                  <h1>All articles</h1>
                  <p className="admin-muted">
                    Create and manage the stories shown on your homepage.
                  </p>
                </div>

                <button
                  className="admin-primary compact"
                  onClick={() => {
                    setError('')
                    setEditor({ ...emptyBlog })
                  }}
                >
                  ＋ New article
                </button>
              </div>

              <div className="admin-toolbar">
                <input
                  placeholder="Search articles…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />

                <span>{filteredBlogs.length} articles</span>
              </div>

              <section className="admin-panel">
                <BlogTable
                  blogs={filteredBlogs}
                  onEdit={blog => setEditor({ ...blog })}
                  onDelete={deleteBlog}
                />
              </section>
            </>
          )}

          {/* BLOG EDITOR */}
          {section === 'blogs' && editor && (
            <form
              className="admin-editor"
              onSubmit={saveBlog}
            >
              <div className="admin-editor-actions">
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => setEditor(null)}
                >
                  ← Back to articles
                </button>

                <div>
                  <button
                    type="button"
                    className="admin-secondary"
                    onClick={() =>
                      setEditor(v => ({ ...v, status: 'draft' }))
                    }
                  >
                    Save as draft
                  </button>

                  <button
                    className="admin-primary compact"
                    disabled={saving}
                  >
                    {saving
                      ? 'Saving…'
                      : editor.status === 'published'
                        ? 'Update & publish'
                        : 'Save article'}
                  </button>
                </div>
              </div>

              <div className="admin-editor-grid">
                <div className="admin-panel admin-editor-main">

                  <label>
                    Article title
                    <input
                      value={editor.title}
                      onChange={e =>
                        setEditor(v => ({
                          ...v,
                          title: e.target.value,
                          slug: v.slugTouched
                            ? v.slug
                            : e.target.value
                                .toLowerCase()
                                .trim()
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/^-|-$/g, '')
                        }))
                      }
                      placeholder="Give your article a title"
                      required
                    />
                  </label>

                  <label>
                    URL slug
                    <input
                      value={editor.slug}
                      onChange={e =>
                        setEditor(v => ({
                          ...v,
                          slug: e.target.value,
                          slugTouched: true
                        }))
                      }
                      placeholder="article-url-slug"
                      required
                    />
                    <small>
                      Public URL: /blog/{editor.slug || 'your-article'}
                    </small>
                  </label>

                  <label>
                    Excerpt
                    <textarea
                      rows="3"
                      value={editor.excerpt}
                      onChange={e =>
                        setEditor(v => ({
                          ...v,
                          excerpt: e.target.value
                        }))
                      }
                      placeholder="A short introduction for the blog card…"
                    />
                  </label>

                  <label>
                    Article content
                    <textarea
                      className="admin-content-input"
                      rows="18"
                      value={editor.content}
                      onChange={e =>
                        setEditor(v => ({
                          ...v,
                          content: e.target.value
                        }))
                      }
                      placeholder="Write your article here…"
                      required
                    />
                  </label>

                  <p className="admin-field-hint">
                    Plain text is supported. Separate paragraphs with a blank line.
                  </p>
                </div>

                <div className="admin-editor-side">

                  <div className="admin-panel">
                    <h3>Publish</h3>

                    <label className="admin-select-label">
                      Visibility
                      <select
                        value={editor.status}
                        onChange={e =>
                          setEditor(v => ({
                            ...v,
                            status: e.target.value
                          }))
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </label>

                    <div className="admin-publish-note">
                      {editor.status === 'published'
                        ? 'This article will be visible in the homepage blog section.'
                        : 'Draft articles are only visible in the admin panel.'}
                    </div>
                  </div>

                  <div className="admin-panel">
                    <h3>Article details</h3>

                    <label>
                      Category
                      <input
                        value={editor.category}
                        onChange={e =>
                          setEditor(v => ({
                            ...v,
                            category: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      Author
                      <input
                        value={editor.author}
                        onChange={e =>
                          setEditor(v => ({
                            ...v,
                            author: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      Cover image URL
                      <input
                        value={editor.coverImage}
                        onChange={e =>
                          setEditor(v => ({
                            ...v,
                            coverImage: e.target.value
                          }))
                        }
                        placeholder="https://…"
                      />
                    </label>

                    {editor.coverImage && (
                      <img
                        className="admin-cover-preview"
                        src={editor.coverImage}
                        alt="Cover preview"
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                  </div>

                  <div className="admin-panel">
                    <h3>Search engine preview</h3>

                    <label>
                      SEO title
                      <input
                        value={editor.seoTitle}
                        onChange={e =>
                          setEditor(v => ({
                            ...v,
                            seoTitle: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      SEO description
                      <textarea
                        rows="3"
                        value={editor.seoDescription}
                        onChange={e =>
                          setEditor(v => ({
                            ...v,
                            seoDescription: e.target.value
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* WEBSITE SETTINGS */}
          {section === 'settings' && (
            <form
              onSubmit={saveSettings}
              className="admin-settings-grid"
            >
              <div className="admin-page-intro">
                <div>
                  <p className="admin-eyebrow">CONFIGURATION</p>
                  <h1>Website settings</h1>
                  <p className="admin-muted">
                    Manage your site identity, contact details, blog and SEO.
                  </p>
                </div>
              </div>

              <div className="admin-panel">
                <h2>Brand identity</h2>
                <p className="admin-muted">Upload the logo and browser favicon used across the website.</p>
                <div className="admin-form-grid">
                  <label>Website logo <input type="file" accept="image/*" onChange={e => uploadImage(e, 'logoUrl')} />{settings.logoUrl && <img src={settings.logoUrl} alt="Current logo" style={{maxWidth:180,maxHeight:65,objectFit:'contain',marginTop:10}} />}</label>
                  <label>Favicon <input type="file" accept="image/*" onChange={e => uploadImage(e, 'faviconUrl')} />{settings.faviconUrl && <img src={settings.faviconUrl} alt="Current favicon" style={{width:40,height:40,objectFit:'contain',marginTop:10}} />}</label>
                </div>
                <SettingField label="Logo URL" value={settings.logoUrl} onChange={v => setSettings(s => ({...s, logoUrl:v}))} />
                <SettingField label="Favicon URL" value={settings.faviconUrl} onChange={v => setSettings(s => ({...s, faviconUrl:v}))} />
              </div>

              <div className="admin-panel">
                <h2>General information</h2>
                <p className="admin-muted">
                  Your brand details and website identity.
                </p>

                <div className="admin-form-grid">
                  <SettingField
                    label="Website name"
                    value={settings.siteName}
                    onChange={v =>
                      setSettings(s => ({ ...s, siteName: v }))
                    }
                  />

                  <SettingField
                    label="Tagline"
                    value={settings.tagline}
                    onChange={v =>
                      setSettings(s => ({ ...s, tagline: v }))
                    }
                  />

                  <SettingField
                    label="Contact email"
                    value={settings.contactEmail}
                    onChange={v =>
                      setSettings(s => ({ ...s, contactEmail: v }))
                    }
                  />

                  <SettingField
                    label="Contact phone"
                    value={settings.contactPhone}
                    onChange={v =>
                      setSettings(s => ({ ...s, contactPhone: v }))
                    }
                  />

                  <SettingField
                    label="Instagram URL"
                    value={settings.instagram}
                    onChange={v =>
                      setSettings(s => ({ ...s, instagram: v }))
                    }
                  />

                  <SettingField
                    label="LinkedIn URL"
                    value={settings.linkedin}
                    onChange={v =>
                      setSettings(s => ({ ...s, linkedin: v }))
                    }
                  />

                  <SettingField
                    label="Facebook URL"
                    value={settings.facebook}
                    onChange={v =>
                      setSettings(s => ({ ...s, facebook: v }))
                    }
                  />

                  <SettingField
                    label="Office address"
                    value={settings.address}
                    onChange={v =>
                      setSettings(s => ({ ...s, address: v }))
                    }
                  />
                </div>

                <label>
                  Website description
                  <textarea
                    rows="3"
                    value={settings.description}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        description: e.target.value
                      }))
                    }
                  />
                </label>
              </div>

              <div className="admin-panel">
                <h2>Blog section</h2>
                <p className="admin-muted">
                  Control the blog area displayed on your homepage.
                </p>

                <label>
                  Section heading
                  <input
                    value={settings.blogSectionTitle}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        blogSectionTitle: e.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  Section description
                  <textarea
                    rows="2"
                    value={settings.blogSectionDescription}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        blogSectionDescription: e.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  Posts to show
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={settings.postsPerPage}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        postsPerPage: e.target.value
                      }))
                    }
                  />
                </label>

                <Toggle
                  label="Show blog section on homepage"
                  checked={settings.showBlogSection}
                  onChange={v =>
                    setSettings(s => ({
                      ...s,
                      showBlogSection: v
                    }))
                  }
                />
              </div>

              <div className="admin-panel">
                <h2>SEO settings</h2>
                <p className="admin-muted">
                  Default metadata for search engines.
                </p>

                <label>
                  SEO title
                  <input
                    value={settings.seoTitle}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        seoTitle: e.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  SEO description
                  <textarea
                    rows="3"
                    value={settings.seoDescription}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        seoDescription: e.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  SEO keywords
                  <input
                    value={settings.seoKeywords}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        seoKeywords: e.target.value
                      }))
                    }
                  />
                </label>
              </div>

              <div className="admin-panel">
                <h2>Advanced</h2>
                <p className="admin-muted">
                  Additional website controls.
                </p>

                <Toggle
                  label="Maintenance mode (configuration only)"
                  checked={settings.maintenanceMode}
                  onChange={v =>
                    setSettings(s => ({
                      ...s,
                      maintenanceMode: v
                    }))
                  }
                />

                <p className="admin-field-hint">
                  Maintenance mode is stored as a setting; public traffic is not blocked by this switch yet.
                </p>
              </div>

              <div className="admin-panel">
                <PasswordChangePanel
                  currentPassword={currentPassword}
                  setCurrentPassword={setCurrentPassword}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  passwordMessage={passwordMessage}
                  saving={saving}
                  onSubmit={changePassword}
                />
              </div>

              <div className="admin-settings-save">
                <button
                  className="admin-primary"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? 'Saving…' : 'Save all settings'}
                </button>
              </div>
            </form>
          )}


          {section === 'projects' && (
            <>
              <div className="admin-page-intro"><div><p className="admin-eyebrow">PORTFOLIO</p><h1>Projects</h1><p className="admin-muted">Create and maintain the projects displayed on the website.</p></div><button className="admin-primary" onClick={() => setProjectEditor({ title:'', slug:'', category:'Residential', location:'', summary:'', description:'', coverImage:'', gallery:[], status:'launching', featured:false })}>＋ Add project</button></div>
              {projectEditor ? <form className="admin-panel" onSubmit={saveProject}>
                <div className="admin-form-grid">
                  {['title','slug','category','location','coverImage'].map(key => <label key={key}>{key}<input value={projectEditor[key] || ''} onChange={e => setProjectEditor(v => ({...v,[key]:e.target.value}))} required={key==='title'} /></label>)}
                  <label>Upload cover image<input type="file" accept="image/*" onChange={e => uploadImage(e, 'projectCoverImage')} /></label>
                  <label>Status<select value={projectEditor.status || 'published'} onChange={e => setProjectEditor(v => ({...v,status:e.target.value}))}><option value="launching">Launching soon</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="draft">Draft</option></select></label>
                  <label>Featured<select value={String(!!projectEditor.featured)} onChange={e => setProjectEditor(v => ({...v,featured:e.target.value==='true'}))}><option value="false">No</option><option value="true">Yes</option></select></label>
                </div>
                <label>Short summary<textarea rows="3" value={projectEditor.summary || ''} onChange={e => setProjectEditor(v => ({...v,summary:e.target.value}))}/></label>
                <label>Project description<textarea rows="7" value={projectEditor.description || ''} onChange={e => setProjectEditor(v => ({...v,description:e.target.value}))}/></label>
                <div className="admin-row-actions"><button className="admin-primary" disabled={saving}>Save project</button><button type="button" className="admin-secondary" onClick={() => setProjectEditor(null)}>Cancel</button></div>
              </form> : <div className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PROJECT</th><th>CATEGORY</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{projects.map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.location}</small></td><td>{item.category}</td><td>{item.status}</td><td><div className="admin-row-actions"><button onClick={() => setProjectEditor({...item})}>Edit</button><button onClick={() => deleteProject(item)}>Delete</button></div></td></tr>)}</tbody></table>{!projects.length && <p className="admin-empty">No projects added yet. Add your first project.</p>}</div></div>}
            </>
          )}

{section === 'menus' && (
  <form className="admin-panel" onSubmit={saveMenus}>
    <p className="admin-eyebrow">APPEARANCE / MENUS</p>
    <h1>Navigation menus</h1>
    <p className="admin-muted">
      Manage your website header, footer and dropdown navigation links.
    </p>

    <MenuEditor menus={menus} setMenus={setMenus} />

    <button className="admin-primary" disabled={saving}>
      {saving ? 'Saving...' : 'Save navigation'}
    </button>
  </form>
)}

{section === 'forms' && (
  <form className="admin-panel" onSubmit={saveForms}>
    <p className="admin-eyebrow">LEAD CAPTURE</p>
    <h1>Form builder</h1>
    <p className="admin-muted">
      Create and manage the forms displayed on your website.
      Existing submissions remain available in Enquiries.
    </p>

    <FormBuilder
      forms={forms}
      setForms={setForms}
      selectedFormId={selectedFormId}
      setSelectedFormId={setSelectedFormId}
    />

    <button
      className="admin-primary"
      disabled={saving}
      style={{ marginTop: 24 }}
    >
      {saving ? 'Saving...' : 'Save all forms'}
    </button>
  </form>
)}

          {section === 'smtp' && (
            <form className="admin-smtp-layout" onSubmit={saveSmtp}>
              <div className="admin-page-intro">
                <div>
                  <p className="admin-eyebrow">EMAIL DELIVERY</p>
                  <h1>SMTP settings</h1>
                  <p className="admin-muted">
                    Configure outgoing mail for enquiry notifications and password resets.
                  </p>
                </div>
              </div>

              <div className="admin-panel">
                <div className="admin-form-grid">
                  <label>
                    SMTP host
                    <input
                      value={smtp.host}
                      onChange={(e) => setSmtp((v) => ({ ...v, host: e.target.value }))}
                      placeholder="smtp.example.com"
                    />
                  </label>
                  <label>
                    Port
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={smtp.port}
                      onChange={(e) =>
                        setSmtp((v) => ({ ...v, port: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Username
                    <input
                      value={smtp.username}
                      onChange={(e) =>
                        setSmtp((v) => ({ ...v, username: e.target.value }))
                      }
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder={
                        smtp.passwordSet
                          ? 'Leave blank to keep current password'
                          : 'Enter SMTP password'
                      }
                      autoComplete="new-password"
                    />
                    {smtp.passwordSet && (
                      <small className="admin-field-hint">
                        A password is stored on the server. Enter a new value only to replace it.
                      </small>
                    )}
                  </label>
                  <label>
                    Encryption
                    <select
                      value={smtp.encryption}
                      onChange={(e) =>
                        setSmtp((v) => ({ ...v, encryption: e.target.value }))
                      }
                    >
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                  <label>
                    From email
                    <input
                      type="email"
                      value={smtp.fromEmail}
                      onChange={(e) =>
                        setSmtp((v) => ({ ...v, fromEmail: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    From name
                    <input
                      value={smtp.fromName}
                      onChange={(e) =>
                        setSmtp((v) => ({ ...v, fromName: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Reply-to email
                    <input
                      type="email"
                      value={smtp.replyTo}
                      onChange={(e) =>
                        setSmtp((v) => ({ ...v, replyTo: e.target.value }))
                      }
                    />
                  </label>
                </div>

                <Toggle
                  label="Enable email notifications"
                  checked={smtp.notificationsEnabled}
                  onChange={(v) =>
                    setSmtp((s) => ({ ...s, notificationsEnabled: v }))
                  }
                />

                {smtpMessage && (
                  <p className="admin-password-success">{smtpMessage}</p>
                )}

                <div className="admin-row-actions" style={{ marginTop: 20 }}>
                  <button className="admin-primary" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save SMTP settings'}
                  </button>
                </div>
              </div>

              <div className="admin-panel">
                <h2>Test connection</h2>
                <p className="admin-muted">
                  Verify SMTP credentials. Optionally send a test message to an inbox.
                </p>
                <label>
                  Test recipient (optional)
                  <input
                    type="email"
                    value={smtpTestEmail}
                    onChange={(e) => setSmtpTestEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <button
                  type="button"
                  className="admin-secondary"
                  disabled={saving}
                  onClick={testSmtpConnection}
                >
                  {saving ? 'Testing…' : 'Test connection'}
                </button>
              </div>
            </form>
          )}

          {section === 'email-templates' && (
            <form className="admin-templates-layout" onSubmit={saveEmailTemplate}>
              <div className="admin-page-intro">
                <div>
                  <p className="admin-eyebrow">MESSAGING</p>
                  <h1>Email templates</h1>
                  <p className="admin-muted">
                    Edit notification copy sent by the website. Use placeholders like{' '}
                    <code>{'{{name}}'}</code> and <code>{'{{fieldsTable}}'}</code> where noted.
                  </p>
                </div>
              </div>

              <div className="admin-templates-grid">
                <div className="admin-panel admin-template-list">
                  <h2>Templates</h2>
                  {emailTemplates.length ? (
                    <ul className="admin-template-menu">
                      {emailTemplates.map((template) => (
                        <li key={template.id}>
                          <button
                            type="button"
                            className={
                              selectedTemplateId === template.id ? 'is-active' : ''
                            }
                            onClick={() => {
                              setSelectedTemplateId(template.id)
                              setTemplateMessage('')
                            }}
                          >
                            <strong>{template.name}</strong>
                            <small>{template.enabled ? 'Enabled' : 'Disabled'}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-empty">No templates found.</p>
                  )}
                </div>

                <div className="admin-panel">
                  {selectedTemplate ? (
                    <>
                      <label>
                        Template name
                        <input
                          value={selectedTemplate.name || ''}
                          onChange={(e) =>
                            updateSelectedTemplate({ name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Email subject
                        <input
                          value={selectedTemplate.subject || ''}
                          onChange={(e) =>
                            updateSelectedTemplate({ subject: e.target.value })
                          }
                          required
                        />
                      </label>
                      <label>
                        Email body
                        <textarea
                          className="admin-template-body"
                          rows="14"
                          value={selectedTemplate.bodyHtml || ''}
                          onChange={(e) =>
                            updateSelectedTemplate({ bodyHtml: e.target.value })
                          }
                          required
                        />
                        <small className="admin-field-hint">
                          HTML is supported. Common placeholders include{' '}
                          <code>{'{{name}}'}</code>, <code>{'{{resetUrl}}'}</code>, and{' '}
                          <code>{'{{fieldsTable}}'}</code> for form submissions.
                        </small>
                      </label>
                      <Toggle
                        label="Template enabled"
                        checked={selectedTemplate.enabled}
                        onChange={(v) => updateSelectedTemplate({ enabled: v })}
                      />
                      {templateMessage && (
                        <p className="admin-password-success">{templateMessage}</p>
                      )}
                      <button
                        className="admin-primary"
                        type="submit"
                        disabled={saving}
                        style={{ marginTop: 16 }}
                      >
                        {saving ? 'Saving…' : 'Save template'}
                      </button>
                    </>
                  ) : (
                    <p className="admin-empty">Select a template to edit.</p>
                  )}
                </div>
              </div>
            </form>
          )}

          {section === 'media' && (
            <div className="admin-panel">
              <p className="admin-eyebrow">ASSET MANAGER</p>
              <h1>Media library</h1>
              <p className="admin-muted">
                Uploaded images can be reused in projects, branding, blogs and forms.
              </p>
              <label>
                Upload image
                <input type="file" accept="image/*" onChange={(e) => uploadImage(e, 'media')} />
              </label>
              <div className="admin-media-grid">
                {media.map((item) => (
                  <div key={item.id || item.filename || item.name}>
                    <img
                      src={item.url}
                      alt={item.filename || item.name || 'Media'}
                    />
                    <small>{item.filename || item.name}</small>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(item.url)}
                      >
                        Copy URL
                      </button>
                      <button type="button" onClick={() => deleteMediaItem(item)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {!media.length && (
                <p className="admin-empty">No uploaded media yet.</p>
              )}
            </div>
          )}

          {section === 'profile' && (
            <>
              <form className="admin-panel" onSubmit={saveProfile}>
                <p className="admin-eyebrow">ACCOUNT</p>
                <h1>Admin profile</h1>
                <p className="admin-muted">
                  Update your sign-in identity, contact details, and avatar.
                </p>
                <div className="admin-profile-avatar">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="Admin profile" />
                  ) : (
                    <UserRound />
                  )}
                </div>
                <label>
                  Profile picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadImage(e, 'avatar')}
                  />
                </label>
                <div className="admin-form-grid">
                  <label>
                    Full name
                    <input
                      value={profile.name || ''}
                      onChange={(e) =>
                        setProfile((v) => ({ ...v, name: e.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Username
                    <input
                      value={profile.username || ''}
                      onChange={(e) =>
                        setProfile((v) => ({ ...v, username: e.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={profile.email || ''}
                      onChange={(e) =>
                        setProfile((v) => ({ ...v, email: e.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      type="tel"
                      value={profile.phone || ''}
                      onChange={(e) =>
                        setProfile((v) => ({ ...v, phone: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <label>
                  Additional contact
                  <textarea
                    rows="2"
                    value={profile.additionalContact || ''}
                    onChange={(e) =>
                      setProfile((v) => ({
                        ...v,
                        additionalContact: e.target.value
                      }))
                    }
                    placeholder="Secondary email, messaging handle, etc."
                  />
                </label>
                {profileMessage && (
                  <p className="admin-password-success">{profileMessage}</p>
                )}
                <button className="admin-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </form>

              <div className="admin-panel" style={{ marginTop: 20 }}>
                <PasswordChangePanel
                  currentPassword={currentPassword}
                  setCurrentPassword={setCurrentPassword}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  passwordMessage={passwordMessage}
                  saving={saving}
                  onSubmit={changePassword}
                />
              </div>
            </>
          )}

          {/* ENQUIRIES */}
          {section === 'enquiries' && (
            <>
              <div className="admin-page-intro">
                <div>
                  <p className="admin-eyebrow">INBOX</p>
                  <h1>Website enquiries</h1>
                  <p className="admin-muted">
                    Messages submitted through your website forms.
                  </p>
                </div>
              </div>

              <div className="admin-panel">
                <div className="admin-enquiries">
                  {safeEnquiryList.length ? (
                    safeEnquiryList.map(item => (
                      <article key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {item.type} · {dateLabel(item.createdAt)}
                          </span>
                        </div>

                        <a href={`mailto:${item.email}`}>
                          {item.email}
                        </a>

                        {item.phone && (
                          <span>{item.phone}</span>
                        )}

                        {item.message && (
                          <p>{item.message}</p>
                        )}
                        {item.fields && (
                          <div className="admin-enquiry-fields">
                            {Object.entries(item.fields)
                              .filter(([key]) => !['name', 'email', 'phone', 'message', 'consent'].includes(key))
                              .map(([key, value]) => (
                                <p key={key}><strong>{key}:</strong> {String(value)}</p>
                              ))}
                          </div>
                        )}

                        <div className="admin-row-actions">
                          <button
                            type="button"
                            onClick={() => deleteEnquiry(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="admin-empty">
                      No enquiries received yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}

// Blog table
function BlogTable({ blogs, onEdit, onDelete }) {
  const safeBlogs = Array.isArray(blogs) ? blogs : []

  if (!safeBlogs.length) {
    return (
      <div className="admin-empty">
        <strong>No articles yet.</strong>
        <p>Create your first blog post to get started.</p>
      </div>
    )
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ARTICLE</th>
            <th>CATEGORY</th>
            <th>STATUS</th>
            <th>UPDATED</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {safeBlogs.map(blog => (
            <tr key={blog.id}>
              <td>
                <strong>{blog.title}</strong>
                <small>/blog/{blog.slug}</small>
              </td>

              <td>{blog.category}</td>

              <td>
                <span className={`admin-status ${blog.status}`}>
                  {blog.status}
                </span>
              </td>

              <td>{dateLabel(blog.updatedAt)}</td>

              <td>
                <div className="admin-row-actions">
                  <button onClick={() => onEdit(blog)}>
                    Edit
                  </button>

                  <button onClick={() => onDelete(blog)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Settings field
function SettingField({ label, value, onChange }) {
  return (
    <label>
      {label}
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function PasswordChangePanel({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  passwordMessage,
  saving,
  onSubmit
}) {
  return (
    <>
      <h2>Change admin password</h2>
      <p className="admin-muted">
        Use a unique password with at least 12 characters.
      </p>

      <label>
        Current password
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault()
          }}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </label>

      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={newPassword}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault()
          }}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </label>

      {passwordMessage && (
        <p className="admin-password-success">{passwordMessage}</p>
      )}

      <button
        type="button"
        className="admin-secondary"
        disabled={saving || !currentPassword || newPassword.length < 12}
        onClick={onSubmit}
        style={{ marginTop: 16 }}
      >
        {saving ? 'Updating…' : 'Update password'}
      </button>
    </>
  )
}

// Toggle component
function Toggle({ label, checked, onChange }) {
  return (
    <label className="admin-toggle">
      <span>{label}</span>

      <input
        type="checkbox"
        checked={!!checked}
        onChange={e => onChange(e.target.checked)}
      />

      <i />
    </label>
  )
}
