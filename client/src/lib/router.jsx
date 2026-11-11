
import { createContext, useContext, useEffect, useState } from 'react'

const HEADER_SCROLL_OFFSET = 96

const RouterContext = createContext({
  path: '/',
  hash: '',
  navigate: () => {},
  scrollToSection: () => {},
})

function currentPath() {
  return window.location.pathname.replace(/\/$/, '') || '/'
}

function currentHash() {
  return window.location.hash.replace(/^#/, '')
}

function scrollToId(id, behavior = 'smooth') {
  if (!id) {
    window.scrollTo({ top: 0, behavior })
    return
  }

  const element = document.getElementById(decodeURIComponent(id))

  if (!element) return

  const header = document.querySelector('.site-header')
  const offset = header
    ? Math.ceil(header.getBoundingClientRect().height)
    : HEADER_SCROLL_OFFSET
  const top =
    element.getBoundingClientRect().top + window.scrollY - offset

  window.scrollTo({ top: Math.max(0, top), behavior })
}

export function Router({ children }) {
  const [path, setPath] = useState(currentPath)
  const [hash, setHash] = useState(currentHash)

  useEffect(() => {
    const onPop = () => {
      setPath(currentPath())
      setHash(currentHash())
    }

    const onHashChange = () => setHash(currentHash())

    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onHashChange)

    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  function navigate(to) {
    const hashPart = to.includes('#') ? to.slice(to.indexOf('#') + 1) : ''
    const nextPath = (to.split('#')[0] || '/').replace(/\/$/, '') || '/'
    const samePath = currentPath() === nextPath
    const target =
      to.startsWith('http') || to.startsWith('//')
        ? to
        : nextPath + (hashPart ? `#${hashPart}` : '')

    if (
      window.location.pathname +
        window.location.search +
        window.location.hash !==
      target
    ) {
      window.history.pushState({}, '', target)
    }

    setPath(nextPath)
    setHash(hashPart)

    window.requestAnimationFrame(() => {
      if (hashPart) {
        scrollToId(hashPart)
      } else if (!samePath) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  function scrollToSection(id) {
    const sectionId = !id || id === 'home' ? '' : id
    const url = sectionId ? `/#${sectionId}` : '/'
    navigate(url)

    if (!sectionId) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    }
  }

  return (
    <RouterContext.Provider
      value={{ path, hash, navigate, scrollToSection }}
    >
      {children}
    </RouterContext.Provider>
  )
}

export function syncHomeSection(sectionId) {
  const id = sectionId || 'home'
  const hash = id === 'home' ? '' : id
  const next = hash ? `/#${hash}` : '/'

  if ((window.location.pathname.replace(/\/$/, '') || '/') !== '/') return

  if (`${window.location.pathname}${window.location.hash}` !== next) {
    window.history.replaceState({}, '', next)
  }

  window.dispatchEvent(
    new CustomEvent('homesection', { detail: id })
  )
}

export function Link({ to, className = '', children, onClick, ...props }) {
  const { navigate } = useRouter()

  function handleClick(event) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }

    event.preventDefault()
    onClick?.(event)
    navigate(to)
  }

  return (
    <a
      href={to}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  )
}

export function useRouter() {
  return useContext(RouterContext)
}
