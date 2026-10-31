import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const STATS = [
  { value: '01', label: 'Understand' },
  { value: '02', label: 'Connect' },
  { value: '03', label: 'Move forward' }
]

export default function AboutStage() {
  const rootRef = useRef(null)
  const sceneRef = useRef(null)
  const floatRef = useRef(null)
  const shadowRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const scene = sceneRef.current
    const floatEl = floatRef.current
    const shadow = shadowRef.current
    if (!root || !scene || !floatEl) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      gsap.set(scene, { transformPerspective: 1200, transformOrigin: '50% 55%' })
      gsap.from('.about-visual-kicker, .about-visual-title, .about-visual-lede', {
        y: 28,
        opacity: 0,
        duration: 1.05,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.08
      })
      gsap.from('.about-stat', {
        x: -16,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        delay: 0.35,
        ease: 'power2.out'
      })
      gsap.from(scene, {
        y: 70,
        opacity: 0,
        scale: 0.9,
        duration: 1.35,
        ease: 'power3.out',
        delay: 0.18
      })

      if (reduced) return

      gsap.to(floatEl, {
        y: -16,
        duration: 3.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      })
      if (shadow) {
        gsap.to(shadow, {
          scaleX: 0.86,
          opacity: 0.55,
          duration: 3.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        })
      }
      gsap.to('.about-orb', {
        y: (i) => (i % 2 === 0 ? -18 : 14),
        x: (i) => (i % 2 === 0 ? 10 : -12),
        duration: (i) => 3.2 + i * 0.45,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      })
      gsap.to('.about-ring', {
        rotate: 360,
        duration: 28,
        ease: 'none',
        repeat: -1
      })
    }, root)

    if (reduced) {
      return () => ctx.revert()
    }

    const rotateX = gsap.quickTo(scene, 'rotateX', { duration: 0.7, ease: 'power3.out' })
    const rotateY = gsap.quickTo(scene, 'rotateY', { duration: 0.7, ease: 'power3.out' })
    const moveX = gsap.quickTo(scene, 'x', { duration: 0.7, ease: 'power3.out' })
    const moveY = gsap.quickTo(scene, 'y', { duration: 0.7, ease: 'power3.out' })

    function onMove(event) {
      const rect = root.getBoundingClientRect()
      const nx = (event.clientX - rect.left) / rect.width - 0.5
      const ny = (event.clientY - rect.top) / rect.height - 0.5
      rotateY(nx * 14)
      rotateX(ny * -8)
      moveX(nx * 18)
      moveY(ny * 10)
    }

    function onLeave() {
      rotateX(0)
      rotateY(0)
      moveX(0)
      moveY(0)
    }

    root.addEventListener('mousemove', onMove)
    root.addEventListener('mouseleave', onLeave)

    return () => {
      root.removeEventListener('mousemove', onMove)
      root.removeEventListener('mouseleave', onLeave)
      ctx.revert()
    }
  }, [])

  return (
    <section className="about-visual" ref={rootRef}>
      <div className="container about-visual-head">
        <p className="eyebrow about-visual-kicker">About — 01</p>
        <h1 className="section-heading about-visual-title">Land, seen as a living space.</h1>
        <p className="body-copy about-visual-lede">
          A dummy 3D model of a considered home — the kind of place we look for in land. Move your pointer to tilt the model. Replace this render with a real project visual later.
        </p>
      </div>

      <div className="about-stage">
        <aside className="about-stats" aria-label="How we work">
          {STATS.map((item) => (
            <div className="about-stat" key={item.value}>
              <span className="stat-number">{item.value}</span>
              <span className="stat-label">{item.label}</span>
            </div>
          ))}
        </aside>

        <div className="about-scene" ref={sceneRef}>
          <div className="about-glow" aria-hidden="true" />
          <div className="about-ring" aria-hidden="true" />
          <span className="about-orb about-orb-a" aria-hidden="true" />
          <span className="about-orb about-orb-b" aria-hidden="true" />
          <span className="about-orb about-orb-c" aria-hidden="true" />
          <div className="about-float" ref={floatRef}>
            <img
              className="about-3d-house"
              src="/assets/about-3d-house.jpg"
              alt="Dummy 3D architectural model of a contemporary house in a landscaped plot"
            />
          </div>
          <div className="about-ground-shadow" ref={shadowRef} aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
