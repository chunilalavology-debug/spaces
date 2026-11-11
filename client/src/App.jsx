import { useEffect, useState } from 'react'
import Layout from './components/Layout.jsx'
import { Router, useRouter } from './lib/router.jsx'

import About from './pages/About.jsx'
import Admin from './pages/Admin.jsx'
import Blog from './pages/Blog.jsx'
import Approach from './pages/Approach.jsx'
import Contact from './pages/Contact.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import Opportunities from './pages/Opportunities.jsx'
import Projects from './pages/Projects.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'

const ROUTES = {
  '/': Home,
  '/about': About,
  '/projects': Projects,
  '/opportunities': Opportunities,
  '/approach': Approach,
  '/contact': Contact
}

function AppRoutes() {
  const { path } = useRouter()
  const [maintenance, setMaintenance] = useState({
    active: false,
    message: ''
  })

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.maintenanceMode) {
          setMaintenance({
            active: true,
            message: data.maintenanceMessage || ''
          })
        }
      })
      .catch(() => {})
  }, [])

  const isAdmin = path === '/admin' || path.startsWith('/admin/')

  if (isAdmin) {
    return <Admin />
  }

  if (path.startsWith('/blog/')) {
    return (
      <Layout
        maintenanceMode={maintenance.active}
        maintenanceMessage={maintenance.message}
      >
        <Blog />
      </Layout>
    )
  }

  if (path.startsWith('/projects/')) {
    return (
      <Layout
        maintenanceMode={maintenance.active}
        maintenanceMessage={maintenance.message}
      >
        <ProjectDetail />
      </Layout>
    )
  }

  const Page = ROUTES[path] || NotFound

  return (
    <Layout
      maintenanceMode={maintenance.active}
      maintenanceMessage={maintenance.message}
    >
      <Page />
    </Layout>
  )
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}
