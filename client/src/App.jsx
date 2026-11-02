
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

const ROUTES = {
  '/': Home,
  '/about': About,
  '/projects': Projects,
  '/opportunities': Opportunities,
  '/approach': Approach,
  '/contact': Contact,
}

function AppRoutes() {
  const { path } = useRouter()

  if (path === '/admin' || path.startsWith('/admin/')) {
    return <Admin />
  }

  if (path.startsWith('/blog/')) {
    return (
      <Layout>
        <Blog />
      </Layout>
    )
  }

  const Page = ROUTES[path] || NotFound

  return (
    <Layout>
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
