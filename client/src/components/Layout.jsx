import { useEffect, useState } from 'react'
import { Link, useRouter } from '../lib/router.jsx'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/contact', label: 'Contact' }
]

const MOBILE_NAV = [
  ...NAV.slice(0, 4),
  { to: '/approach', label: 'Our approach' },
  NAV[4]
]

export default function Layout({ children }) {
  const { path } = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const year = new Date().getFullYear()

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
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
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [path])

  return (
    <>
      <div className="mobile-progress" aria-hidden="true" style={{ width: `${progress}%` }} />

      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <Link className="brand" to="/" aria-label="46Spaces home">
          <img className="brand-logo" src="/assets/logo.png" alt="46Spaces" />
        </Link>
        <nav className="header-links" aria-label="Main navigation">
          {NAV.map((item) => (
            <Link className="nav-link" to={item.to} key={item.to}>
              {item.label}
            </Link>
          ))}
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

      <nav className={`mobile-menu ${menuOpen ? 'is-open' : ''}`} id="mobileMenu" aria-label="Mobile navigation">
        {MOBILE_NAV.map((item) => (
          <Link to={item.to} key={item.to} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
        <p className="eyebrow">Land · Ideas · Possibility</p>
      </nav>

      {children}

      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <Link className="brand footer-logo" to="/">
              <img className="brand-logo" src="/assets/logo.png" alt="46Spaces" />
            </Link>
            <p className="eyebrow footer-tagline">Land. Ideas. Possibility.</p>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            {NAV.map((item) => (
              <Link className="nav-link" to={item.to} key={item.to}>
                {item.label}
              </Link>
            ))}
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
