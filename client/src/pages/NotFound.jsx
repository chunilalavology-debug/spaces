import PageHero from '../components/PageHero.jsx'
import { Link } from '../lib/router.jsx'
import { ArrowIcon } from '../components/Icons.jsx'

export default function NotFound() {
  return (
    <main>
      <PageHero
        eyebrow="404"
        title="This page is not on the map yet."
        lede="The link may have moved. Head home, or open any of the menu pages."
      />
      <section className="section">
        <div className="container">
          <Link className="button" to="/">
            Back to home
            <span className="button-arrow" aria-hidden="true"><ArrowIcon /></span>
          </Link>
        </div>
      </section>
    </main>
  )
}
