import PageHero from '../components/PageHero.jsx'
import EnquiryForm from '../components/EnquiryForm.jsx'
import { useRouter } from '../lib/router.jsx'
import useReveal from '../hooks/useReveal.js'

export default function Contact() {
  const { path } = useRouter()
  useReveal(path)

  return (
    <main>
      <PageHero
        eyebrow="Contact — 05"
        title="Every good thing starts somewhere."
        lede="Have a property, a question or an idea worth exploring? Tell us a little about it. Dummy office details below can be replaced with the live address, hours and people."
      />

      <section className="section contact-section">
        <div className="container contact-grid">
          <div className="reveal">
            <p className="eyebrow">Get in touch</p>
            <h2 className="section-heading">Write, call, or send a short brief.</h2>
            <p className="body-copy" style={{ maxWidth: 400, marginTop: 22 }}>
              We read every note. Typical reply window is a few working days — this line is placeholder until a real SLA is set.
            </p>
            <div className="contact-info">
              <div>
                <span className="contact-label">Email</span>
                <a className="contact-value" href="mailto:hello@46spaces.com">hello@46spaces.com</a>
              </div>
              <div>
                <span className="contact-label">Phone</span>
                <a className="contact-value" href="tel:+910000000000">+91 00000 00000</a>
              </div>
              <div>
                <span className="contact-label">Office</span>
                <span className="text-muted">Address to be added</span>
              </div>
              <div>
                <span className="contact-label">Hours</span>
                <span className="text-muted">Monday to Friday, 10:00–18:00 IST (dummy)</span>
              </div>
            </div>
          </div>
          <EnquiryForm
            type="General contact"
            className="contact-form reveal"
            submitLabel="Send enquiry"
            extraNote={<p className="privacy-note">Your information will only be used to respond to your enquiry.</p>}
            fields={(
              <>
                <input className="field" name="name" placeholder="Your name" autoComplete="name" required />
                <input className="field" name="email" type="email" placeholder="Email address" autoComplete="email" required />
                <input className="field" name="phone" type="tel" placeholder="Phone number (optional)" autoComplete="tel" />
                <select className="field" name="topic" aria-label="Enquiry type" defaultValue="">
                  <option value="">What would you like to discuss?</option>
                  <option>Land opportunity</option>
                  <option>Project enquiry</option>
                  <option>Channel partnership</option>
                  <option>Careers</option>
                  <option>General enquiry</option>
                </select>
                <textarea className="field" name="message" placeholder="Your message" required />
              </>
            )}
          />
        </div>
      </section>
    </main>
  )
}
