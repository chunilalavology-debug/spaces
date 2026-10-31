import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import EnquiryForm from '../components/EnquiryForm.jsx'
import { ArrowIcon, DownArrowIcon } from '../components/Icons.jsx'

const PROJECTS = [
  {
    status: 'launching',
    image: '/assets/project-1.jpg',
    alt: 'Open green landscape and gently rolling land',
    title: 'A New Perspective',
    location: 'North India · Location details on enquiry',
    label: 'Launching soon'
  },
  {
    status: 'ongoing',
    image: '/assets/project-2.jpg',
    alt: 'Architectural interior with natural materials and soft daylight',
    title: 'The Quiet Collection',
    location: 'Project location · Details available soon',
    label: 'Ongoing'
  },
  {
    status: 'completed',
    image: '/assets/project-3.jpg',
    alt: 'Modern residence with clean lines and a landscaped setting',
    title: 'Grounded Living',
    location: 'Project location · Completed',
    label: 'Completed'
  },
  {
    status: 'launching',
    image: '/assets/project-4.jpg',
    alt: 'Minimal modern architecture framed against the sky',
    title: 'A Place to Begin',
    location: 'Project location · Enquire for details',
    label: 'Launching soon'
  }
]

const FILTERS = [
  { id: 'all', label: 'All projects' },
  { id: 'launching', label: 'Launching soon' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' }
]

const SECTIONS = ['home', 'about', 'projects', 'opportunities', 'approach', 'contact']

export default function Home() {
  const [filter, setFilter] = useState('all')
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return undefined

    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.from('.hero-logo', { y: 28, opacity: 0, duration: 1.15, ease: 'power3.out', delay: 0.12 })
      gsap.from('.hero-intro', { y: 12, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power2.out', delay: 0.2 })
      gsap.from('.hero-bottom', { opacity: 0, y: 8, duration: 0.7, ease: 'power2.out', delay: 0.7 })
      gsap.to('.scroll-cue-arrow', { y: 7, duration: 0.7, ease: 'power1.inOut', repeat: -1, yoyo: true })

      gsap.utils.toArray('.reveal').forEach((element) => {
        gsap.fromTo(
          element,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true }
          }
        )
      })

      if (window.matchMedia('(min-width: 701px)').matches) {
        gsap.utils.toArray('.intro-image img, .project-image img').forEach((image) => {
          gsap.fromTo(
            image,
            { yPercent: -2, scale: 1.04 },
            {
              yPercent: 2,
              scale: 1.04,
              ease: 'none',
              scrollTrigger: {
                trigger: image.closest('.media'),
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.5
              }
            }
          )
        })
      }

      gsap.utils.toArray('[data-section]').forEach((section) => {
        ScrollTrigger.create({
          trigger: section,
          start: 'top 48%',
          end: 'bottom 48%',
          onToggle: (self) => {
            if (self.isActive) setActiveSection(section.dataset.section)
          }
        })
      })
    })

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => {
      window.removeEventListener('load', refresh)
      ctx.revert()
    }
  }, [])

  const visibleProjects = PROJECTS.filter((project) => filter === 'all' || project.status === filter)

  return (
    <>
      <nav className="scroll-tracker" aria-label="Page sections">
        {SECTIONS.map((id, index) => (
          <span key={id} style={{ display: 'contents' }}>
            {index > 0 ? <span className="tracker-line" /> : null}
            <a
              className={`tracker-item ${activeSection === id ? 'is-active' : ''}`}
              href={`#${id}`}
              aria-label={`Section ${String(index + 1).padStart(2, '0')}`}
            >
              {String(index + 1).padStart(2, '0')}
            </a>
          </span>
        ))}
      </nav>

      <main>
        <section className="hero" id="home" data-section="home">
          <p className="eyebrow hero-kicker hero-intro">Independent thinking. Grounded in land.</p>
          <h1 className="hero-title" aria-label="46Spaces">
            <img className="hero-logo" src="/assets/logo.png" alt="46Spaces" />
          </h1>
          <p className="hero-subtitle hero-intro">Land. Ideas. Possibility.</p>
          <div className="hero-bottom">
            <span className="hero-location">Thoughtful spaces, built around possibility</span>
            <a className="scroll-cue" href="#about">
              <span>Scroll to explore</span>
              <span className="scroll-cue-arrow" aria-hidden="true">
                <DownArrowIcon />
              </span>
            </a>
            <span>01 / 06</span>
          </div>
        </section>

        <section className="section" id="about" data-section="about">
          <div className="container intro-grid">
            <div className="intro-copy reveal">
              <p className="eyebrow">01 — Our point of view</p>
              <h2 className="section-heading">Land is in our DNA. Every parcel we take on carries that forward.</h2>
              <div className="thin-rule" />
              <p className="body-copy">
                We look beyond boundaries and square footage. Every place has a story, a context and a future waiting to be considered. Our work is about recognising that potential and bringing the right people together to move it forward.
              </p>
              <div className="stats">
                <div><span className="stat-number">01</span><span className="stat-label">Understand</span></div>
                <div><span className="stat-number">02</span><span className="stat-label">Connect</span></div>
                <div><span className="stat-number">03</span><span className="stat-label">Move forward</span></div>
              </div>
            </div>
            <figure className="media intro-image reveal">
              <img src="/assets/about.jpg" alt="Contemporary architecture with natural light and warm neutral materials" loading="lazy" />
              <figcaption className="image-caption">A considered approach to every place</figcaption>
            </figure>
          </div>
        </section>

        <section className="section projects-section" id="projects" data-section="projects">
          <div className="container">
            <div className="section-topline reveal">
              <div>
                <p className="eyebrow">02 — Selected opportunities</p>
                <h2 className="section-heading">Where things stand, right now.</h2>
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
                <a className="project-card reveal" href="#contact" key={project.title}>
                  <div className="media project-image">
                    <img src={project.image} alt={project.alt} loading="lazy" />
                  </div>
                  <div className="project-meta">
                    <div>
                      <h3 className="project-title">{project.title}</h3>
                      <p className="project-location">{project.location}</p>
                    </div>
                    <span className="project-status">{project.label}</span>
                    <span className="project-arrow" aria-hidden="true">
                      <ArrowIcon />
                    </span>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-10 reveal">
              <a className="button" href="#contact">
                Discuss a project
                <span className="button-arrow" aria-hidden="true"><ArrowIcon /></span>
              </a>
            </div>
          </div>
        </section>

        <section className="section split-section" id="opportunities" data-section="opportunities">
          <div className="container">
            <div className="split-heading reveal">
              <p className="eyebrow">03 — Open the conversation</p>
              <h2 className="section-heading">Bring land, or bring buyers.</h2>
              <p className="body-copy">The best opportunities begin with the right conversation. Tell us where you fit, and we’ll take it from there.</p>
            </div>

            <div className="form-columns">
              <div className="reveal">
                <p className="eyebrow">For landowners</p>
                <h3 className="form-title">Have land to bring forward?</h3>
                <p className="form-intro">Share a few details about your property and what you would like to achieve. Our team will review the opportunity and get in touch.</p>
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

        <section className="section" id="approach" data-section="approach">
          <div className="container approach-grid">
            <div className="approach-intro reveal">
              <p className="eyebrow">04 — The way we work</p>
              <h2 className="section-heading">Build spaces with us.</h2>
              <p className="body-copy" style={{ marginTop: 22 }}>
                We bring people, place and possibility together. A considered process helps good opportunities become clear, practical next steps.
              </p>
              <a className="button mt-8" href="#contact">
                Work with 46Spaces
                <span className="button-arrow" aria-hidden="true"><ArrowIcon /></span>
              </a>
            </div>
            <div className="approach-list">
              <article className="approach-item reveal">
                <span className="approach-number">01</span>
                <div>
                  <h3 className="approach-title">Understand the place</h3>
                  <p className="body-copy">We start with context: the land, the people involved, and what the opportunity could become.</p>
                </div>
              </article>
              <article className="approach-item reveal">
                <span className="approach-number">02</span>
                <div>
                  <h3 className="approach-title">Make the right connections</h3>
                  <p className="body-copy">We bring together aligned owners, buyers, consultants and partners to build shared momentum.</p>
                </div>
              </article>
              <article className="approach-item reveal">
                <span className="approach-number">03</span>
                <div>
                  <h3 className="approach-title">Move forward with clarity</h3>
                  <p className="body-copy">We keep communication focused and the next steps clear, from first conversation to follow-through.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section contact-section" id="contact" data-section="contact">
          <div className="container contact-grid">
            <div className="reveal">
              <p className="eyebrow">05 — Get in touch</p>
              <h2 className="section-heading">Every good thing starts somewhere.</h2>
              <p className="body-copy" style={{ maxWidth: 400, marginTop: 22 }}>
                Have a property, a question or an idea worth exploring? Tell us a little about it. We’d be glad to hear from you.
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
    </>
  )
}
