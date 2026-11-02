import Layout from './components/Layout.jsx'
import { Router, useRouter } from './lib/router.jsx'
import About from './pages/About.jsx'
<<<<<<< HEAD
import Admin from './pages/Admin.jsx'
import Blog from './pages/Blog.jsx'
=======
>>>>>>> a2c25c8ff7d08cfe2bb5612765c4b2f0300f6134
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
  '/contact': Contact
}

function AppRoutes() {
  const { path } = useRouter()
<<<<<<< HEAD
  if (path === '/admin' || path.startsWith('/admin/')) return <Admin />
  const Page = path.startsWith('/blog/') ? Blog : (ROUTES[path] || NotFound)
=======
  const Page = ROUTES[path] || NotFound
>>>>>>> a2c25c8ff7d08cfe2bb5612765c4b2f0300f6134

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
