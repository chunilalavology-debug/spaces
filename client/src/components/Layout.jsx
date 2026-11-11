import { useEffect, useState } from 'react'
import { Link, useRouter } from '../lib/router.jsx'

const FALLBACK_NAV = [
  { id: 'home', url: '/#home', label: 'Home' },
  { id: 'about', url: '/#about', label: 'About' },
  { id: 'projects', url: '/#projects', label: 'Projects' },
  { id: 'journal', url: '/#blogs', label: 'Journal' },
  { id: 'opportunities', url: '/#opportunities', label: 'Opportunities' },
  { id: 'approach', url: '/#approach', label: 'Approach' },
  { id: 'contact', url: '/#contact', label: 'Contact' }
]

const SECTION_FROM_PATH = {
  '/': 'home',
  '/about': 'about',
  '/projects': 'projects',
  '/opportunities': 'opportunities',
  '/approach': 'approach',
  '/contact': 'contact'
}

function navTargetSection(item) {
  const target = item.url || item.to || '#'
  const label = (item.label || '').toLowerCase()

  if (target.includes('#')) {
    return target.split('#')[1]
  }

  if (target === '/' || label === 'home') return 'home'
  if (label === 'journal') return 'blogs'

  const pathOnly = (target.split('?')[0] || '').replace(/\/$/, '') || '/'
  return SECTION_FROM_PATH[pathOnly] || null
}

function MenuItems({ items, isActive, onNavigate }) {
  return items.map((item) => (
    <div className="nav-item-wrap" key={item.id || item.url || item.label}>
      <Link
        className={`nav-link ${isActive(item) ? 'is-active' : ''}`}
        to={item.url || item.to || '#'}
        onClick={onNavigate}
      >
        {item.label}
      </Link>
      {Array.isArray(item.children) && item.children.length > 0 && (
        <div className="nav-dropdown">
          <MenuItems
            items={item.children}
            isActive={isActive}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  ))
}

export default function Layout({
  children,
  maintenanceMode = false,
  maintenanceMessage = ''
}) {
  const { path, hash } = useRouter()

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [navItems, setNavItems] = useState(FALLBACK_NAV)
  const [footerItems, setFooterItems] = useState([])
  const [siteSettings, setSiteSettings] = useState({
    logoUrl: '/assets/logo.png',
    siteName: '46Spaces'
  })
  const [homeSection, setHomeSection] = useState('home')

  useEffect(() => {
    fetch('/api/menus')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.header?.length) setNavItems(data.header)
        if (data?.footer?.length) setFooterItems(data.footer)
      })
      .catch(() => {})

    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSiteSettings((v) => ({ ...v, ...data }))
          if (data.faviconUrl) {
            let icon = document.querySelector('link[rel="icon"]')
            if (!icon) {
              icon = document.createElement('link')
              icon.rel = 'icon'
              document.head.appendChild(icon)
            }
            icon.href = data.faviconUrl
          }
        }
      })
      .catch(() => {})
  }, [])

  const year = new Date().getFullYear()
  const currentPath = (path || '/').split('?')[0].split('#')[0] || '/'
  const onHome = currentPath === '/'
  const resolvedHomeSection = hash || homeSection || 'home'

  useEffect(() => {
    if (!onHome) return undefined

    setHomeSection(hash || 'home')

    const onSection = (event) => {
      setHomeSection(event.detail || 'home')
    }

    window.addEventListener('homesection', onSection)

    return () => window.removeEventListener('homesection', onSection)
  }, [onHome, hash])

  const isActive = (item) => {
    const target = item.url || item.to || '#'
    const label = (item.label || '').toLowerCase()
    const section = navTargetSection(item)

    if (onHome && section) {
      return resolvedHomeSection === section
    }

    if (target === '/' || label === 'home') {
      return currentPath === '/'
    }

    if (target === '/#blogs' || label === 'journal') {
      return (
        currentPath === '/blog' || currentPath.startsWith('/blog/')
      )
    }

    const pathOnly = (target.split('#')[0] || '/').replace(/\/$/, '') || '/'

    return (
      currentPath === pathOnly || currentPath.startsWith(`${pathOnly}/`)
    )
  }

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)

      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight

      setProgress(maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener('scroll', onScroll)
  }, [path])

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)

    return () => document.body.classList.remove('menu-open')
  }, [menuOpen])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', onKey)

    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [path])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      {maintenanceMode && (
        <div className="maintenance-banner" role="status">
          <span>
            {maintenanceMessage ||
              'We are making a few updates. The site remains available — thank you for your patience.'}
          </span>
        </div>
      )}

      <div
        className="mobile-progress"
        aria-hidden="true"
        style={{ width: `${progress}%` }}
      />

      <header
        className={`site-header ${scrolled ? 'is-scrolled' : ''} ${
          maintenanceMode ? 'has-maintenance' : ''
        }`}
      >
        <Link className="brand" to="/" aria-label="46Spaces home">
          <img
            className="brand-logo"
            src={siteSettings.logoUrl || '/assets/logo.png'}
            alt={siteSettings.siteName || '46Spaces'}
          />
        </Link>

        <nav className="header-links" aria-label="Main navigation">
          <MenuItems items={navItems} isActive={isActive} />
        </nav>

        <button
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobileMenu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close ' : 'Menu '}
          <span>{menuOpen ? '×' : '+'}</span>
        </button>
      </header>

      <nav
        className={`mobile-menu ${menuOpen ? 'is-open' : ''}`}
        id="mobileMenu"
        aria-label="Mobile navigation"
      >
        <MenuItems
          items={navItems}
          isActive={isActive}
          onNavigate={closeMenu}
        />

        <p className="eyebrow">Land · Ideas · Possibility</p>
      </nav>

      {children}

      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <Link className="brand footer-logo" to="/">
              <img
                className="brand-logo"
                src={siteSettings.logoUrl || '/assets/logo.png'}
                alt={siteSettings.siteName || '46Spaces'}
              />
            </Link>

            <p className="eyebrow footer-tagline">
              Land. Ideas. Possibility.
            </p>
          </div>

          <nav className="footer-nav" aria-label="Footer navigation">
            <MenuItems
              items={footerItems.length ? footerItems : navItems}
              isActive={isActive}
            />
          </nav>
        </div>

        <div className="footer-bottom">
          <span>© {year} 46Spaces. All rights reserved.</span>
          <span>Thoughtfully grounded. Forward looking.</span>
        </div>
      </footer>
    </>
  )
}
