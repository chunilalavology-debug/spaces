
import { useEffect } from 'react'
import { Link, useRouter } from '../lib/router.jsx'
import { PROJECTS } from './projectData.js'

export default function ProjectDetail() {
  const { path } = useRouter()
  const slug = path.split('/')[2]
  const project = PROJECTS.find(item => item.slug === slug)

  useEffect(() => {
    if (!project) {
      document.title = 'Project Not Found | 46Spaces'
      return
    }

    document.title = `${project.title} | 46Spaces`

    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }

    meta.content = project.summary
  }, [project])

  if (!project) {
    return (
      <main className="blog-not-found">
        <p className="eyebrow">404 — PROJECT NOT FOUND</p>
        <h1>This project isn’t here.</h1>
        <Link to="/projects">Return to all projects ↗</Link>
      </main>
    )
  }

  return (
    <main className="single-blog single-project">
      <div className="single-blog-inner">
        <Link className="blog-back" to="/projects">
          ← Back to all projects
        </Link>

        <header>
          <p className="eyebrow">
            {project.label} · {project.location}
          </p>
          <h1>{project.title}</h1>
          <p className="single-blog-excerpt">{project.summary}</p>
        </header>

        <img
          className="single-blog-cover"
          src={project.image}
          alt={project.alt}
        />

        <article className="single-blog-content">
          <p>{project.summary}</p>
          <p>
            For more information about this project, its availability
            and details, please get in touch with the 46Spaces team.
          </p>
        </article>

        <div className="single-blog-end">
          <span>46SPACES</span>
          <Link to="/contact">Enquire about this project →</Link>
        </div>
      </div>
    </main>
  )
}
