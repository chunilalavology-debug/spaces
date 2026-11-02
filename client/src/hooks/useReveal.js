import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function useReveal(pathname) {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return undefined

    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
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
    })

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    ScrollTrigger.refresh()

    return () => {
      window.removeEventListener('load', refresh)
      ctx.revert()
    }
  }, [pathname])
}
