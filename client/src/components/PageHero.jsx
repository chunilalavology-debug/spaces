export default function PageHero({ eyebrow, title, lede }) {
  return (
    <section className="page-hero">
      <div className="container">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="section-heading">{title}</h1>
        {lede ? <p className="body-copy page-lede">{lede}</p> : null}
      </div>
    </section>
  )
}
