
import { useEffect, useState } from 'react'
import { Link, useRouter } from '../lib/router.jsx'
import '../blog.css'

export default function Blog() {
  const { path } = useRouter()
  const slug = path.split('/')[2]

  const [blog, setBlog] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true

    setBlog(null)
    setError(false)

    fetch(`/api/blogs/${encodeURIComponent(slug)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Article not found')
        }
        return response.json()
      })
      .then((data) => {
        if (!active) return

        setBlog(data)

        document.title = `${data.seoTitle || data.title} | 46Spaces`

        if (data.seoDescription) {
          let meta = document.querySelector('meta[name="description"]')

          if (!meta) {
            meta = document.createElement('meta')
            meta.name = 'description'
            document.head.appendChild(meta)
          }

          meta.content = data.seoDescription
        }
      })
      .catch(() => {
        if (active) setError(true)
      })

    return () => {
      active = false
    }
  }, [slug])

  if (error) {
    return (
      <main className="blog-not-found">
        <p className="eyebrow">404 — ARTICLE NOT FOUND</p>
        <h1>This story isn’t here.</h1>
        <p>The article may have been removed or is no longer available.</p>
        <Link className="blog-back" to="/#blogs">
          ← Return to Journal
        </Link>
      </main>
    )
  }

  if (!blog) {
    return (
      <main className="blog-loading">
        <span className="blog-loading-line" />
        <p className="eyebrow">46SPACES JOURNAL</p>
        <h2>Loading story...</h2>
      </main>
    )
  }

  const publishedDate = blog.publishedAt || blog.createdAt
  const date = publishedDate
    ? new Date(publishedDate)
    : null

  const formattedDate =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : ''

  const paragraphs = String(blog.content || '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <main className="single-blog">
      <div className="single-blog-inner">

        <Link className="blog-back" to="/#blogs">
          <span>←</span> Back to Journal
        </Link>

        <header className="single-blog-header">

          <div className="single-blog-category">
            {blog.category || '46Spaces Journal'}
          </div>

          <h1>{blog.title}</h1>

          {blog.excerpt && (
            <p className="single-blog-excerpt">
              {blog.excerpt}
            </p>
          )}

          <div className="single-blog-author">
            <span>By {blog.author || '46Spaces'}</span>
            {formattedDate && (
              <>
                <span className="blog-meta-dot">·</span>
                <time dateTime={date.toISOString()}>
                  {formattedDate}
                </time>
              </>
            )}
          </div>

        </header>

        {blog.coverImage && (
          <div className="single-blog-image-wrap">
            <img
              className="single-blog-cover"
              src={blog.coverImage}
              alt={blog.title}
            />
          </div>
        )}

        <article className="single-blog-content">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))
          ) : (
            <p>More details about this story will be available soon.</p>
          )}
        </article>

        <div className="single-blog-end">
          <div>
            <span className="blog-end-brand">46SPACES</span>
            <p>Land. Ideas. Possibility.</p>
          </div>

          <Link to="/#blogs" className="blog-explore-link">
            Explore more stories <span>→</span>
          </Link>
        </div>

      </div>
    </main>
  )
}
