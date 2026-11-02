import AboutStage from '../components/AboutStage.jsx'
import { Link, useRouter } from '../lib/router.jsx'
import { ArrowIcon } from '../components/Icons.jsx'
import useReveal from '../hooks/useReveal.js'

const VALUES = [
  {
    number: '01',
    title: 'Context first',
    copy: 'Every parcel sits in a neighbourhood, a landscape and a set of relationships. We start there, not with a generic template.'
  },
  {
    number: '02',
    title: 'Right people, right time',
    copy: 'Good land needs aligned owners, buyers and advisors. We spend as much time on the conversation as on the site itself.'
  },
  {
    number: '03',
    title: 'Quiet confidence',
    copy: 'We prefer clear next steps over noise. The work should feel considered, even when the opportunity is moving quickly.'
  }
]

const NOTES = [
  {
    title: 'Who we are',
    copy: '46Spaces is an independent studio working at the meeting point of land, ideas and possibility. Dummy copy for now — replace with the real company story.'
  },
  {
    title: 'Where we work',
    copy: 'Our current focus is North India, with selected opportunities reviewed on their own merit. Locations and market notes will be added here.'
  },
  {
    title: 'How we think',
    copy: 'We look past boundaries and square footage. A place has a past, a present and a future that can be shaped with the right partners.'
  }
]

export default function About() {
  const { path } = useRouter()
  useReveal(path)

  return (
    <main>
      <AboutStage />

      <section className="section about-story">
        <div className="container intro-copy reveal" style={{ maxWidth: 640 }}>
          <p className="eyebrow">Our point of view</p>
          <h2 className="section-heading">Land is in our DNA. Every parcel we take on carries that forward.</h2>
          <div className="thin-rule" />
          <p className="body-copy">
            46Spaces exists to recognise potential in land and to bring the right people together to move it forward. This page is a longer version of the home story — add founding notes, team bios and real milestones when they are ready.
          </p>
          <p className="body-copy" style={{ marginTop: 18 }}>
            Dummy details for now: a small, focused team; a preference for considered sites over volume; and a process that stays human from first call to follow-through.
          </p>
        </div>
      </section>

      <section className="section split-section">
        <div className="container">
          <div className="split-heading reveal">
            <p className="eyebrow">What we hold to</p>
            <h2 className="section-heading">Three ideas that shape the work.</h2>
          </div>
          <div className="page-cards">
            {VALUES.map((item) => (
              <article className="page-card reveal" key={item.number}>
                <span className="approach-number">{item.number}</span>
                <h3 className="form-title">{item.title}</h3>
                <p className="body-copy">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container notes-grid">
          {NOTES.map((note) => (
            <article className="reveal" key={note.title}>
              <p className="eyebrow">{note.title}</p>
              <p className="body-copy">{note.copy}</p>
            </article>
          ))}
        </div>
        <div className="container mt-10 reveal">
          <Link className="button" to="/approach">
            See our approach
            <span className="button-arrow" aria-hidden="true"><ArrowIcon /></span>
          </Link>
        </div>
      </section>
    </main>
  )
}
