import { createContext, useContext, useEffect, useState } from 'react'

const RouterContext = createContext({
  path: '/',
  navigate: () => {}
})

function currentPath() {
  return window.location.pathname.replace(/\/$/, '') || '/'
}

export function Router({ children }) {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onPop = () => setPath(currentPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function navigate(to) {
    const nextPath = (to.split('#')[0] || '/').replace(/\/$/, '') || '/'
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to)
    }
    setPath(nextPath)
    window.scrollTo(0, 0)
  }

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export function Link({ to, className = '', children, onClick, ...props }) {
  const { path, navigate } = useRouter()
  const hrefPath = (to.split('#')[0] || '/').replace(/\/$/, '') || '/'
  const active = path === hrefPath

  function handleClick(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    onClick?.(event)
    navigate(to)
  }

  return (
    <a href={to} className={`${className}${active ? ' is-active' : ''}`.trim()} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

export function useRouter() {
  return useContext(RouterContext)
}
