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
    fetch(`/api/blogs/${encodeURIComponent(slug)}`).then(response => { if (!response.ok) throw new Error('Not found'); return response.json() }).then(data => { if (active) { setBlog(data); document.title = `${data.seoTitle || data.title} | 46Spaces`; if (data.seoDescription) { let meta = document.querySelector('meta[name="description"]'); if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta) } meta.content = data.seoDescription } } }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [slug])
  if (error) return <main className="blog-not-found"><p className="eyebrow">404 — ARTICLE NOT FOUND</p><h1>This story isn’t here.</h1><Link to="/">Return to homepage ↗</Link></main>
  if (!blog) return <main className="blog-loading">Loading article…</main>
  return <main className="single-blog"><div className="single-blog-inner"><Link className="blog-back" to="/#blogs">← Back to all stories</Link><header><p className="eyebrow">{blog.category} · {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p><h1>{blog.title}</h1>{blog.excerpt && <p className="single-blog-excerpt">{blog.excerpt}</p>}<p className="single-blog-author">By {blog.author || '46Spaces'}</p></header>{blog.coverImage && <img className="single-blog-cover" src={blog.coverImage} alt={blog.title}/>}<article className="single-blog-content">{blog.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article><div className="single-blog-end"><span>46SPACES</span><Link to="/#blogs">Explore more stories ↗</Link></div></div></main>
}
