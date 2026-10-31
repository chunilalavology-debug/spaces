import PageHero from '../components/PageHero.jsx'
import EnquiryForm from '../components/EnquiryForm.jsx'
import { Link, useRouter } from '../lib/router.jsx'
import { ArrowIcon } from '../components/Icons.jsx'
import useReveal from '../hooks/useReveal.js'

const PATHS = [
  {
    title: 'Landowners',
    copy: 'Bring a parcel, a holding or a family asset. Dummy note: we review location, intent and timing before we suggest a next step.'
  },
  {
    title: 'Channel partners',
    copy: 'Share a buyer, a consultant network or a live requirement. Placeholder copy until partnership terms are published here.'
  },
  {
    title: 'Investors',
    copy: 'Looking at land as a longer view. This section can later hold sample ticket sizes, markets and a short process note.'
  }
]

export default function Opportunities() {
  const { path } = useRouter()
  useReveal(path)

  return (
    <main>
      <PageHero
        eyebrow="Opportunities — 03"
        title="Bring land, or bring buyers."
        lede="The best opportunities begin with the right conversation. Tell us where you fit — landowner, partner or investor — and we will take it from there. Forms below use dummy supporting copy for now."
      />

      <section className="section">
        <div className="container page-cards">
          {PATHS.map((item, index) => (
            <article className="page-card reveal" key={item.title}>
              <span className="approach-number">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="form-title">{item.title}</h3>
              <p className="body-copy">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split-section">
        <div className="container">
          <div className="split-heading reveal">
            <p className="eyebrow">Open the conversation</p>
            <h2 className="section-heading">Two doors in. Same care on the other side.</h2>
            <p className="body-copy">Share a few details. Our team will review the note and get in touch. Replace any of this copy with live FAQs or process steps later.</p>
          </div>

          <div className="form-columns">
            <div className="reveal">
              <p className="eyebrow">For landowners</p>
              <h3 className="form-title">Have land to bring forward?</h3>
              <p className="form-intro">Share a few details about your property and what you would like to achieve. Dummy fields for acreage and intent can be added here later.</p>
              <EnquiryForm
                type="Landowner enquiry"
                className="form-stack"
                submitLabel="Submit land details"
                fields={(
                  <>
                    <div className="form-grid">
                      <input className="field" name="name" placeholder="Your name" autoComplete="name" required />
                      <input className="field" name="email" type="email" placeholder="Email address" autoComplete="email" required />
                    </div>
                    <input className="field" name="phone" type="tel" placeholder="Phone number" autoComplete="tel" />
                    <input className="field" name="location" placeholder="Land location" />
                    <select className="field" name="landType" aria-label="Land type" defaultValue="">
                      <option value="">Type of land</option>
                      <option>Residential</option>
                      <option>Commercial</option>
                      <option>Agricultural</option>
                      <option>Mixed use</option>
                      <option>Other</option>
                    </select>
                    <textarea className="field" name="message" placeholder="Tell us a little about the property" />
                  </>
                )}
              />
            </div>

            <div className="reveal">
              <p className="eyebrow">For channel partners & consultants</p>
              <h3 className="form-title">Have the right connection?</h3>
              <p className="form-intro">We work with people who understand the value of a good introduction. Tell us about your network, expertise or buyer requirement.</p>
              <EnquiryForm
                type="Channel partner enquiry"
                className="form-stack"
                submitLabel="Start a conversation"
                fields={(
                  <>
                    <div className="form-grid">
                      <input className="field" name="name" placeholder="Your name" autoComplete="name" required />
                      <input className="field" name="email" type="email" placeholder="Email address" autoComplete="email" required />
                    </div>
                    <input className="field" name="phone" type="tel" placeholder="Phone number" autoComplete="tel" />
                    <select className="field" name="partnerType" aria-label="Partner type" defaultValue="">
                      <option value="">I am a…</option>
                      <option>Channel partner</option>
                      <option>Property consultant</option>
                      <option>Buyer representative</option>
                      <option>Investor</option>
                      <option>Other</option>
                    </select>
                    <select className="field" name="interest" aria-label="Area of interest" defaultValue="">
                      <option value="">Area of interest</option>
                      <option>Land sourcing</option>
                      <option>Buyer introductions</option>
                      <option>Development opportunities</option>
                      <option>Investment partnership</option>
                      <option>Other</option>
                    </select>
                    <textarea className="field" name="message" placeholder="Tell us how we could work together" />
                  </>
                )}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container reveal">
          <p className="eyebrow">Prefer a short note?</p>
          <h2 className="section-heading">Write to us directly.</h2>
          <p className="body-copy" style={{ maxWidth: 420, margin: '22px 0 0' }}>
            If a form feels like too much, the contact page is enough. Dummy line: typical replies within a few working days.
          </p>
          <Link className="button mt-8" to="/contact">
            Go to contact
            <span className="button-arrow" aria-hidden="true"><ArrowIcon /></span>
          </Link>
        </div>
      </section>
    </main>
  )
}
