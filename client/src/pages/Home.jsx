
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AboutStage from '../components/AboutStage.jsx'
import EnquiryForm from '../components/EnquiryForm.jsx'
import { ArrowIcon, DownArrowIcon } from '../components/Icons.jsx'
import { ABOUT_NOTES, ABOUT_VALUES } from '../lib/aboutContent.js'
import {
  Link,
  syncHomeSection,
  useRouter
} from '../lib/router.jsx'
import { PROJECTS } from './projectData.js'

const FILTERS = [
  { id: 'all', label: 'All projects' },
  { id: 'launching', label: 'Launching soon' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' }
]

const SECTIONS = [
  'home',
  'about',
  'projects',
  'blogs',
  'opportunities',
  'approach',
  'contact'
]

const SECTION_LABELS = {
  home: 'Home',
  about: 'About',
  projects: 'Projects',
  blogs: 'Blogs',
  opportunities: 'Opportunities',
  approach: 'Approach',
  contact: 'Contact'
}

export default function Home() {
  const { scrollToSection, hash } = useRouter()
  const [filter, setFilter] = useState('all')
  const [activeSection, setActiveSection] = useState('home')
  const [slideIndex, setSlideIndex] = useState(0)
  const [blogs, setBlogs] = useState([])
  const [cmsProjects, setCmsProjects] = useState(null)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const sliderRef = useRef(null)

  const [siteSettings, setSiteSettings] = useState({
    blogSectionTitle: 'Notes & perspectives',
    blogSectionDescription: 'Ideas, insights and stories from 46Spaces.',
    postsPerPage: 6,
    showBlogSection: true
  })

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (Array.isArray(rows)) {
          setCmsProjects(
            rows.map((p) => ({
              ...p,
              image: p.coverImage || p.image,
              alt: p.title,
              label: p.statusLabel || p.status || 'Project'
            }))
          )
        } else {
          setCmsProjects([])
        }
      })
      .catch(() => setCmsProjects([]))
      .finally(() => setProjectsLoading(false))
    fetch('/api/blogs')
      .then((response) => response.ok ? response.json() : [])
      .then((data) => {
        setBlogs(Array.isArray(data) ? data : [])
      })
      .catch(() => {})

    fetch('/api/settings')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data) {
          setSiteSettings((current) => ({ ...current, ...data }))

          if (data.seoTitle) {
            document.title = data.seoTitle
          }

          if (data.seoDescription) {
            let meta = document.querySelector(
              'meta[name="description"]'
            )

            if (!meta) {
              meta = document.createElement('meta')
              meta.name = 'description'
              document.head.appendChild(meta)
            }

            meta.content = data.seoDescription
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion) return undefined

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      gsap.from('.hero-logo', {
        y: 28,
        opacity: 0,
        duration: 1.15,
        ease: 'power3.out',
        delay: 0.12
      })

      gsap.from('.hero-intro', {
        y: 12,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power2.out',
        delay: 0.2
      })

      gsap.from('.hero-bottom', {
        opacity: 0,
        y: 8,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.7
      })

      gsap.to('.scroll-cue-arrow', {
        y: 7,
        duration: 0.7,
        ease: 'power1.inOut',
        repeat: -1,
        yoyo: true
      })

      gsap.utils.toArray('.reveal').forEach((element) => {
        gsap.fromTo(
          element,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 88%',
              once: true
            }
          }
        )
      })

      if (window.matchMedia('(min-width: 701px)').matches) {
        gsap.utils
          .toArray('.intro-image img, .project-image img')
          .forEach((image) => {
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
            if (self.isActive) {
              const id = section.dataset.section
              setActiveSection(id)
              syncHomeSection(id)
            }
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

  const projectSource =
    cmsProjects === null ? PROJECTS : cmsProjects.length ? cmsProjects : PROJECTS

  const visibleProjects = projectSource.filter(
    (project) => filter === 'all' || project.status === filter
  )

  const [slidesPerView, setSlidesPerView] = useState(2)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)')
    const update = () => setSlidesPerView(mq.matches ? 1 : 2)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const maxSlide = Math.max(0, visibleProjects.length - slidesPerView)

  function scrollSliderTo(index) {
    const viewport = sliderRef.current
    if (!viewport) return
    const card = viewport.querySelector('.project-card--slide')
    if (!card) return
    const gap = 22
    const step = card.getBoundingClientRect().width + gap
    viewport.scrollTo({ left: index * step, behavior: 'smooth' })
  }

  useEffect(() => {
    setSlideIndex(0)
    window.requestAnimationFrame(() => scrollSliderTo(0))
  }, [filter, visibleProjects.length])

  useEffect(() => {
    setSlideIndex((index) => Math.min(index, maxSlide))
  }, [maxSlide])

  useEffect(() => {
    window.requestAnimationFrame(() => scrollSliderTo(slideIndex))
  }, [slideIndex, slidesPerView])

  function goPrev() {
    setSlideIndex((index) => Math.max(0, index - 1))
  }

  function goNext() {
    setSlideIndex((index) => Math.min(maxSlide, index + 1))
  }

  useEffect(() => {
    if (hash) {
      window.requestAnimationFrame(() => scrollToSection(hash))
    }
    // Deep-link scroll once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <nav className="scroll-tracker" aria-label="Page sections">
        {SECTIONS.map((id, index) => (
          <span key={id} style={{ display: 'contents' }}>
            {index > 0 ? <span className="tracker-line" /> : null}

            <button
              type="button"
              className={`tracker-dot ${
                activeSection === id ? 'is-active' : ''
              }`}
              aria-label={SECTION_LABELS[id] || id}
              aria-current={activeSection === id ? 'true' : undefined}
              onClick={() => scrollToSection(id)}
            />
          </span>
        ))}
      </nav>

      <main className="home-page">
        <section className="hero" id="home" data-section="home">
          <p className="eyebrow hero-kicker hero-intro">
            Independent thinking. Grounded in land.
          </p>

          <h1 className="hero-title" aria-label="46Spaces">
            <img
              className="hero-logo"
              src="/assets/logo.png"
              alt="46Spaces"
            />
          </h1>

          <p className="hero-subtitle hero-intro">
            Spaces, Redefined.
          </p>

          <div className="hero-bottom">
            <span className="hero-location">
              Thoughtful spaces, built around possibility
            </span>

            <Link className="scroll-cue" to="/#about">
              <span>Scroll to explore</span>
              <span className="scroll-cue-arrow" aria-hidden="true">
                <DownArrowIcon />
              </span>
            </Link>
          </div>
        </section>

        <section className="section home-about" id="about" data-section="about">
          <AboutStage embedded />

          <div className="container intro-copy reveal about-story" style={{ maxWidth: 640 }}>
            <p className="eyebrow">Our point of view</p>
            <h2 className="section-heading">
              Land is in our DNA. Every parcel we take on carries that forward.
            </h2>
            <div className="thin-rule" />
            <p className="body-copy">
              46Spaces exists to recognise potential in land and to bring the right
              people together to move it forward. This is the home version of our
              story — see the full page for founding notes, team bios and milestones
              when they are ready.
            </p>
            <p className="body-copy" style={{ marginTop: 18 }}>
              A small, focused team; a preference for considered sites over volume;
              and a process that stays human from first call to follow-through.
            </p>
          </div>

          <div className="section split-section about-values-wrap">
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
          </div>

          <div className="container notes-grid reveal-group">
            {ABOUT_NOTES.map((note) => (
              <article className="reveal" key={note.title}>
                <p className="eyebrow">{note.title}</p>
                <p className="body-copy">{note.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="section projects-section"
          id="projects"
          data-section="projects"
        >
          <div className="container">
            <div className="section-topline reveal">
              <div>
                <p className="eyebrow">02 — Selected opportunities</p>
                <h2 className="section-heading">
                  Where things stand, right now.
                </h2>
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

            <div className="projects-slider-wrap reveal">
              <div className="projects-slider-head">
                <div className="projects-slider-controls" aria-label="Project carousel">
                  <button
                    type="button"
                    className="slider-btn"
                    onClick={goPrev}
                    disabled={slideIndex <= 0}
                    aria-label="Previous projects"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="slider-btn"
                    onClick={goNext}
                    disabled={slideIndex >= maxSlide || !visibleProjects.length}
                    aria-label="Next projects"
                  >
                    →
                  </button>
                </div>
              </div>

              <div
                className="projects-slider-viewport"
                ref={sliderRef}
                aria-busy={projectsLoading}
              >
                {projectsLoading ? (
                  <p className="projects-slider-status body-copy">Loading projects…</p>
                ) : visibleProjects.length ? (
                  <div
                    className="projects-slider-track"
                    style={{ '--slides-visible': slidesPerView }}
                  >
                    {visibleProjects.map((project) => (
                      <Link
                        className="project-card project-card--slide"
                        to={`/projects/${project.slug}`}
                        key={project.slug}
                      >
                        <div className="media project-image">
                          <img
                            src={project.image}
                            alt={project.alt || project.title}
                            loading="lazy"
                          />
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
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="projects-slider-status body-copy">
                    No projects in this category yet. Try another filter or check back soon.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-10 reveal">
              <Link className="button" to="/#contact">
                Discuss a project
                <span className="button-arrow" aria-hidden="true">
                  <ArrowIcon />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {siteSettings.showBlogSection !== false &&
          (blogs.length > 0 || import.meta.env.DEV) && (
            <section
              className="section blogs-section"
              id="blogs"
              data-section="blogs"
            >
              <div className="container">
                <div className="section-topline reveal">
                  <div>
                    <p className="eyebrow">03 — Journal</p>

                    <h2 className="section-heading">
                      {siteSettings.blogSectionTitle ||
                        'Notes & perspectives'}
                    </h2>

                    <p className="body-copy blog-section-description">
                      {siteSettings.blogSectionDescription ||
                        'Ideas, insights and stories from 46Spaces.'}
                    </p>
                  </div>

                  <span className="blog-count">
                    {String(blogs.length).padStart(2, '0')} STORIES
                  </span>
                </div>

                {blogs.length ? (
                  <div className="blogs-grid">
                    {blogs
                      .slice(0, Number(siteSettings.postsPerPage) || 6)
                      .map((blog) => (
                        <Link
                          className="blog-card reveal"
                          to={`/blog/${blog.slug}`}
                          key={blog.id}
                        >
                          <div className="blog-card-image">
                            {blog.coverImage ? (
                              <img
                                src={blog.coverImage}
                                alt=""
                                loading="lazy"
                              />
                            ) : (
                              <div className="blog-image-placeholder">
                                <span>46</span>
                                <small>SPACES JOURNAL</small>
                              </div>
                            )}

                            <span className="blog-card-arrow">↗</span>
                          </div>

                          <div className="blog-card-meta">
                            <span>{blog.category || 'Insights'}</span>

                            <span>
                              {new Date(
                                blog.publishedAt || blog.createdAt
                              ).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          <h3>{blog.title}</h3>

                          {blog.excerpt && <p>{blog.excerpt}</p>}

                          <span className="blog-read-link">
                            Read story <span>↗</span>
                          </span>
                        </Link>
                      ))}
                  </div>
                ) : (
                  <div className="blogs-empty reveal">
                    <p>Stories and perspectives coming soon.</p>
                  </div>
                )}
              </div>
            </section>
          )}

        <section
          className="section split-section"
          id="opportunities"
          data-section="opportunities"
        >
          <div className="container">
            <div className="split-heading reveal">
              <p className="eyebrow">04 — Open the conversation</p>

              <h2 className="section-heading">
                Bring land, or bring buyers.
              </h2>

              <p className="body-copy">
                The best opportunities begin with the right conversation.
                Tell us where you fit, and we’ll take it from there.
              </p>
            </div>

            <div className="form-columns">
              <div className="reveal">
                <p className="eyebrow">For landowners</p>

                <h3 className="form-title">
                  Have land to bring forward?
                </h3>

                <p className="form-intro">
                  Share a few details about your property and what you would
                  like to achieve. Our team will review the opportunity and
                  get in touch.
                </p>

                <EnquiryForm
                  type="Landowner enquiry"
                  className="form-stack"
                  submitLabel="Submit land details"
                  fields={(
                    <>
                      <div className="form-grid">
                        <input
                          className="field"
                          name="name"
                          placeholder="Your name"
                          autoComplete="name"
                          required
                        />

                        <input
                          className="field"
                          name="email"
                          type="email"
                          placeholder="Email address"
                          autoComplete="email"
                          required
                        />
                      </div>

                      <input
                        className="field"
                        name="phone"
                        type="tel"
                        placeholder="Phone number"
                        autoComplete="tel"
                      />

                      <input
                        className="field"
                        name="location"
                        placeholder="Land location"
                      />

                      <select
                        className="field"
                        name="landType"
                        aria-label="Land type"
                        defaultValue=""
                      >
                        <option value="">Type of land</option>
                        <option>Residential</option>
                        <option>Commercial</option>
                        <option>Agricultural</option>
                        <option>Mixed use</option>
                        <option>Other</option>
                      </select>

                      <textarea
                        className="field"
                        name="message"
                        placeholder="Tell us a little about the property"
                      />
                    </>
                  )}
                />
              </div>

              <div className="reveal">
                <p className="eyebrow">
                  For channel partners & consultants
                </p>

                <h3 className="form-title">
                  Have the right connection?
                </h3>

                <p className="form-intro">
                  We work with people who understand the value of a good
                  introduction. Tell us about your network, expertise or
                  buyer requirement.
                </p>

                <EnquiryForm
                  type="Channel partner enquiry"
                  className="form-stack"
                  submitLabel="Start a conversation"
                  fields={(
                    <>
                      <div className="form-grid">
                        <input
                          className="field"
                          name="name"
                          placeholder="Your name"
                          autoComplete="name"
                          required
                        />

                        <input
                          className="field"
                          name="email"
                          type="email"
                          placeholder="Email address"
                          autoComplete="email"
                          required
                        />
                      </div>

                      <input
                        className="field"
                        name="phone"
                        type="tel"
                        placeholder="Phone number"
                        autoComplete="tel"
                      />

                      <select
                        className="field"
                        name="partnerType"
                        aria-label="Partner type"
                        defaultValue=""
                      >
                        <option value="">I am a…</option>
                        <option>Channel partner</option>
                        <option>Property consultant</option>
                        <option>Buyer representative</option>
                        <option>Investor</option>
                        <option>Other</option>
                      </select>

                      <select
                        className="field"
                        name="interest"
                        aria-label="Area of interest"
                        defaultValue=""
                      >
                        <option value="">Area of interest</option>
                        <option>Land sourcing</option>
                        <option>Buyer introductions</option>
                        <option>Development opportunities</option>
                        <option>Investment partnership</option>
                        <option>Other</option>
                      </select>

                      <textarea
                        className="field"
                        name="message"
                        placeholder="Tell us how we could work together"
                      />
                    </>
                  )}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          className="section"
          id="approach"
          data-section="approach"
        >
          <div className="container approach-grid">
            <div className="approach-intro reveal">
              <p className="eyebrow">05 — The way we work</p>

              <h2 className="section-heading">
                Build spaces with us.
              </h2>

              <p className="body-copy" style={{ marginTop: 22 }}>
                We bring people, place and possibility together. A considered
                process helps good opportunities become clear, practical
                next steps.
              </p>

              <Link className="button mt-8" to="/#contact">
                Work with 46Spaces
                <span className="button-arrow" aria-hidden="true">
                  <ArrowIcon />
                </span>
              </Link>
            </div>

            <div className="approach-list">
              <article className="approach-item reveal">
                <span className="approach-number">01</span>

                <div>
                  <h3 className="approach-title">
                    Understand the place
                  </h3>

                  <p className="body-copy">
                    We start with context: the land, the people involved, and
                    what the opportunity could become.
                  </p>
                </div>
              </article>

              <article className="approach-item reveal">
                <span className="approach-number">02</span>

                <div>
                  <h3 className="approach-title">
                    Make the right connections
                  </h3>

                  <p className="body-copy">
                    We bring together aligned owners, buyers, consultants
                    and partners to build shared momentum.
                  </p>
                </div>
              </article>

              <article className="approach-item reveal">
                <span className="approach-number">03</span>

                <div>
                  <h3 className="approach-title">
                    Move forward with clarity
                  </h3>

                  <p className="body-copy">
                    We keep communication focused and the next steps clear,
                    from first conversation to follow-through.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          className="section contact-section"
          id="contact"
          data-section="contact"
        >
          <div className="container contact-grid">
            <div className="reveal">
              <p className="eyebrow">06 — Get in touch</p>

              <h2 className="section-heading">
                Every good thing starts somewhere.
              </h2>

              <p
                className="body-copy"
                style={{ maxWidth: 400, marginTop: 22 }}
              >
                Have a property, a question or an idea worth exploring? Tell
                us a little about it. We’d be glad to hear from you.
              </p>

              <div className="contact-info">
                <div>
                  <span className="contact-label">Email</span>

                  <a
                    className="contact-value"
                    href={`mailto:${
                      siteSettings.contactEmail || 'hello@46spaces.com'
                    }`}
                  >
                    {siteSettings.contactEmail || 'hello@46spaces.com'}
                  </a>
                </div>

                <div>
                  <span className="contact-label">Phone</span>

                  <a
                    className="contact-value"
                    href={`tel:${
                      siteSettings.contactPhone || '+91 00000 00000'
                    }`}
                  >
                    {siteSettings.contactPhone || '+91 00000 00000'}
                  </a>
                </div>

                <div>
                  <span className="contact-label">Office</span>

                  <span className="text-muted">
                    {siteSettings.address || 'Address to be added'}
                  </span>
                </div>
              </div>
            </div>

            <EnquiryForm
              type="General contact"
              className="contact-form reveal"
              submitLabel="Send enquiry"
              extraNote={
                <p className="privacy-note">
                  Your information will only be used to respond to your
                  enquiry.
                </p>
              }
              fields={(
                <>
                  <input
                    className="field"
                    name="name"
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />

                  <input
                    className="field"
                    name="email"
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    required
                  />

                  <input
                    className="field"
                    name="phone"
                    type="tel"
                    placeholder="Phone number (optional)"
                    autoComplete="tel"
                  />

                  <select
                    className="field"
                    name="topic"
                    aria-label="Enquiry type"
                    defaultValue=""
                  >
                    <option value="">
                      What would you like to discuss?
                    </option>
                    <option>Land opportunity</option>
                    <option>Project enquiry</option>
                    <option>Channel partnership</option>
                    <option>Careers</option>
                    <option>General enquiry</option>
                  </select>

                  <textarea
                    className="field"
                    name="message"
                    placeholder="Your message"
                    required
                  />
                </>
              )}
            />
          </div>
        </section>
      </main>
    </>
  )
}
