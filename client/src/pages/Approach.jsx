import PageHero from '../components/PageHero.jsx'
import { Link, useRouter } from '../lib/router.jsx'
import { ArrowIcon } from '../components/Icons.jsx'
import useReveal from '../hooks/useReveal.js'

const STEPS = [
  {
    number: '01',
    title: 'Understand the place',
    copy: 'We start with context: the land, the people involved, and what the opportunity could become. Dummy add-on: site notes, access, neighbouring uses and a first read of intent.'
  },
  {
    number: '02',
    title: 'Make the right connections',
    copy: 'We bring together aligned owners, buyers, consultants and partners to build shared momentum. Later this can list typical counterparties and how introductions are handled.'
  },
  {
    number: '03',
    title: 'Move forward with clarity',
    copy: 'We keep communication focused and the next steps clear, from first conversation to follow-through. Placeholder: timelines, documents and a simple status rhythm.'
  }
]

const PRINCIPLES = [
  {
    title: 'One conversation at a time',
    copy: 'We do not flood a site with competing interest. Dummy copy for how exclusivity and discretion will be described later.'
  },
  {
    title: 'Written next steps',
    copy: 'Every call should end with something concrete. Replace this with the real checklist you send after a first meeting.'
  },
  {
    title: 'No theatre',
    copy: 'The work is the work. This line can later become a short note on fees, roles and what we do not do.'
  }
]

export default function Approach() {
  const { path } = useRouter()
  useReveal(path)

  return (
    <main>
      <PageHero
        eyebrow="Our approach — 04"
        title="Build spaces with us."
        lede="We bring people, place and possibility together. A considered process helps good opportunities become clear, practical next steps. The wording below is dummy scaffolding for the real method."
      />

      <section className="section">
        <div className="container approach-grid">
          <div className="approach-intro reveal">
            <p className="eyebrow">The way we work</p>
            <h2 className="section-heading">From first look to follow-through.</h2>
            <p className="body-copy" style={{ marginTop: 22 }}>
              Three movements, used on every engagement. Expand each with case notes, sample timelines and team roles when you have them.
            </p>
            <Link className="button mt-8" to="/contact">
              Work with 46Spaces
              <span className="button-arrow" aria-hidden="true"><ArrowIcon /></span>
            </Link>
          </div>
          <div className="approach-list">
            {STEPS.map((step) => (
              <article className="approach-item reveal" key={step.number}>
                <span className="approach-number">{step.number}</span>
                <div>
                  <h3 className="approach-title">{step.title}</h3>
                  <p className="body-copy">{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section split-section">
        <div className="container">
          <div className="split-heading reveal">
            <p className="eyebrow">How it feels to work together</p>
            <h2 className="section-heading">Quiet, specific, and useful.</h2>
          </div>
          <div className="page-cards">
            {PRINCIPLES.map((item) => (
              <article className="page-card reveal" key={item.title}>
                <h3 className="form-title">{item.title}</h3>
                <p className="body-copy">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
