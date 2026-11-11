import AboutStage from '../components/AboutStage.jsx'
import { Link, useRouter } from '../lib/router.jsx'
import { ArrowIcon } from '../components/Icons.jsx'
import useReveal from '../hooks/useReveal.js'
import { ABOUT_NOTES, ABOUT_VALUES } from '../lib/aboutContent.js'

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
            {ABOUT_VALUES.map((item) => (
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
          {ABOUT_NOTES.map((note) => (
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
