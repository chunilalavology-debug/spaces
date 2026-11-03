
import { useEffect, useState } from 'react'
import { PROJECTS } from './projectData.js'
import PageHero from '../components/PageHero.jsx'
import { Link, useRouter } from '../lib/router.jsx'
import { ArrowIcon } from '../components/Icons.jsx'
import useReveal from '../hooks/useReveal.js'

const FILTERS = [
  { id: 'all', label: 'All projects' },
  { id: 'launching', label: 'Launching soon' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' }
]

export default function Projects() {
  const { path } = useRouter()
  const [filter, setFilter] = useState('all')
  const [cmsProjects, setCmsProjects] = useState(null)
  useEffect(() => { fetch('/api/projects').then(r => r.ok ? r.json() : []).then(rows => { if (Array.isArray(rows)) setCmsProjects(rows.map(p => ({...p, image:p.coverImage || p.image, alt:p.title, label:p.statusLabel || p.status || 'Project'}))) }).catch(() => {}) }, [])

  useReveal(path)

  const visibleProjects = (cmsProjects || PROJECTS).filter(
    (project) => filter === 'all' || project.status === filter
  )

  return (
    <main>
      <PageHero
        eyebrow="Projects — 02"
        title="Where things stand, right now."
        lede="Selected land and living opportunities. Status labels and descriptions below are dummy placeholders — replace them with live project details when you have them."
      />

      <section className="section projects-section">
        <div className="container">
          <div className="section-topline reveal">
            <div>
              <p className="eyebrow">Selected opportunities</p>
              <h2 className="section-heading">A considered shortlist.</h2>
            </div>

            <div
              className="project-filters"
              role="group"
              aria-label="Filter projects"
            >
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  className={`filter-btn ${
                    filter === item.id ? 'is-active' : ''
                  }`}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="projects-grid">
            {visibleProjects.map((project) => (
              <Link
                className="project-card reveal"
                to={`/projects/${project.slug}`}
                key={project.slug}
              >
                <div className="media project-image">
                  <img
                    src={project.image}
                    alt={project.alt}
                    loading="lazy"
                  />
                </div>

                <div className="project-meta">
                  <div>
                    <h3 className="project-title">{project.title}</h3>
                    <p className="project-location">{project.location}</p>
                  </div>

                  <span className="project-status">
                    {project.label}
                  </span>

                  <span className="project-arrow" aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </div>

                <p className="body-copy project-summary">
                  {project.summary}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-10 reveal">
            <Link className="button" to="/contact">
              Discuss a project
              <span className="button-arrow" aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
