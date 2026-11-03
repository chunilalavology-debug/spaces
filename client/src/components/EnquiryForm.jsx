import { useEffect, useState } from 'react'
import { ArrowIcon } from './Icons.jsx'

export default function EnquiryForm({ type, fields, submitLabel, className, extraNote }) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [schema, setSchema] = useState(null)
  useEffect(() => {
    const id = /landowner/i.test(type) ? 'landowner' : /channel partner/i.test(type) ? 'partner' : 'contact'
    fetch('/api/forms').then(r => r.ok ? r.json() : []).then(list => {
      const found = Array.isArray(list) ? list.find(item => item.id === id) : null
      if (found) setSchema(found)
    }).catch(() => {})
  }, [type])

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    setSubmitting(true)
    setStatus('')
    setError(false)

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, formId: schema?.id || '', ...data, consent: Boolean(data.consent) })
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Could not send enquiry.')
      }
      setStatus(schema?.successMessage || 'Thank you. We have received your enquiry and will be in touch.')
      form.reset()
    } catch (err) {
      setError(true)
      setStatus(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      {schema ? schema.fields.map((field, index) => (
        <label className="cms-form-field" key={`${field.name}-${index}`}>
          {field.label}
          {field.type === 'textarea'
            ? <textarea className="field" name={field.name} placeholder={field.placeholder || field.label} required={!!field.required} />
            : field.type === 'select'
              ? <select className="field" name={field.name} required={!!field.required}><option value="">Select {field.label}</option>{(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}</select>
              : field.type === 'checkbox'
                ? <input type="checkbox" name={field.name} value="Yes" required={!!field.required} />
                : <input className="field" type={['text','email','tel','number','date'].includes(field.type) ? field.type : 'text'} name={field.name} placeholder={field.placeholder || field.label} required={!!field.required} />}
        </label>
      )) : fields}
      <label className="consent">
        <input type="checkbox" name="consent" required />
        I agree to the processing of my information in line with the privacy policy.
      </label>
      <button className="button" type="submit" disabled={submitting}>
        {submitting ? 'Sending' : (schema?.submitLabel || submitLabel)}
        <span className="button-arrow" aria-hidden="true">
          <ArrowIcon />
        </span>
      </button>
      <p className={`form-status ${error ? 'is-error' : status ? 'is-success' : ''}`} aria-live="polite">
        {status}
      </p>
      {extraNote}
    </form>
  )
}
