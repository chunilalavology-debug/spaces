import { useState } from 'react'
import PageHero from '../components/PageHero.jsx'
import { Link, useRouter } from '../lib/router.jsx'
import { ArrowIcon } from '../components/Icons.jsx'
import useReveal from '../hooks/useReveal.js'

const PROJECTS = [
  {
    status: 'launching',
    image: '/assets/project-1.jpg',
    alt: 'Open green landscape and gently rolling land',
    title: 'A New Perspective',
    location: 'North India · Location details on enquiry',
    label: 'Launching soon',
    summary: 'A new chapter on open land. Dummy brief: scale, use-mix and timings will be published closer to launch.'
  },
  {
    status: 'ongoing',
    image: '/assets/project-2.jpg',
    alt: 'Architectural interior with natural materials and soft daylight',
    title: 'The Quiet Collection',
    location: 'Project location · Details available soon',
    label: 'Ongoing',
    summary: 'An interior-led collection in progress. Replace this paragraph with the live project description, unit mix and status.'
  },
  {
    status: 'completed',
    image: '/assets/project-3.jpg',
    alt: 'Modern residence with clean lines and a landscaped setting',
    title: 'Grounded Living',
    location: 'Project location · Completed',
    label: 'Completed',
    summary: 'A completed residence set in a landscaped plot. Dummy copy — add handover year, typology and a short case note.'
  },
  {
    status: 'launching',
    image: '/assets/project-4.jpg',
    alt: 'Minimal modern architecture framed against the sky',
    title: 'A Place to Begin',
    location: 'Project location · Enquire for details',
    label: 'Launching soon',
    summary: 'A starting point for a new community. Placeholder text until the real opportunity pack is ready to share.'
  },
  {
    status: 'ongoing',
    image: '/assets/about.jpg',
    alt: 'Warm architectural facade with natural materials',
    title: 'The Long View',
    location: 'Selected location · Under review',
    label: 'Ongoing',
    summary: 'Dummy project for this page only. Use it as a template when a fifth live opportunity is added.'
  },
  {
    status: 'completed',
    image: '/assets/project-2.jpg',
    alt: 'Quiet interior with daylight and natural finishes',
    title: 'Studio Fields',
    location: 'Project location · Completed',
    label: 'Completed',
    summary: 'A completed study in light and material. Swap this card for an actual case study when the photography is ready.'
  }
]

const FILTERS = [
  { id: 'all', label: 'All projects' },
  { id: 'launching', label: 'Launching soon' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' }
]

export default function Projects() {
  const { path } = useRouter()
  const [filter, setFilter] = useState('all')
  useReveal(path)

  const visibleProjects = PROJECTS.filter((project) => filter === 'all' || project.status === filter)

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
            <div className="project-filters" role="group" aria-label="Filter projects">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  className={`filter-btn ${filter === item.id ? 'is-active' : ''}`}
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
              <article className="project-card reveal" key={project.title}>
                <div className="media project-image">
                  <img src={project.image} alt={project.alt} loading="lazy" />
                </div>
                <div className="project-meta">
                  <div>
                    <h3 className="project-title">{project.title}</h3>
                    <p className="project-location">{project.location}</p>
                  </div>
                  <span className="project-status">{project.label}</span>
                </div>
                <p className="body-copy project-summary">{project.summary}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 reveal">
            <Link className="button" to="/contact">
              Discuss a project
              <span className="button-arrow" aria-hidden="true"><ArrowIcon /></span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
