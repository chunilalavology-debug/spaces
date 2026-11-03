
import { useEffect, useState } from 'react'
import { Link, useRouter } from '../lib/router.jsx'
import { PROJECTS } from './projectData.js'

export default function ProjectDetail() {
  const { path } = useRouter()
  const slug = path.split('/')[2]

  const [cmsProjects, setCmsProjects] = useState(null)

  useEffect(() => {
    let isMounted = true

    fetch('/api/projects')
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => {
        if (isMounted) {
          setCmsProjects(Array.isArray(rows) ? rows : [])
        }
      })
      .catch(() => {
        if (isMounted) {
          setCmsProjects([])
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const cmsProject = Array.isArray(cmsProjects)
    ? cmsProjects.find((item) => item.slug === slug)
    : null

  const project =
    cmsProjects === null
      ? PROJECTS.find((item) => item.slug === slug)
      : cmsProject
        ? {
            ...cmsProject,
            image: cmsProject.coverImage || cmsProject.image,
            alt: cmsProject.title,
            label:
              cmsProject.statusLabel ||
              cmsProject.status ||
              'Project',
          }
        : PROJECTS.find((item) => item.slug === slug)

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

    meta.content = project.summary || project.description || ''
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

  const summary = project.summary || project.description || ''

  return (
    <main className="single-blog single-project">
      <div className="single-blog-inner">
        <Link className="blog-back" to="/projects">
          ← Back to all projects
        </Link>

        <header>
          <p className="eyebrow">
            {project.label || 'Project'}
            {project.location ? ` · ${project.location}` : ''}
          </p>

          <h1>{project.title}</h1>

          <p className="single-blog-excerpt">{summary}</p>
        </header>

        {project.image && (
          <img
            className="single-blog-cover"
            src={project.image}
            alt={project.alt || project.title}
          />
        )}

        <article className="single-blog-content">
          <p>{summary}</p>

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
