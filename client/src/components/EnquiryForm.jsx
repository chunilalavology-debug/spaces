import { useState } from 'react'
import { ArrowIcon } from './Icons.jsx'

export default function EnquiryForm({ type, fields, submitLabel, className, extraNote }) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
        body: JSON.stringify({ type, ...data, consent: Boolean(data.consent) })
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Could not send enquiry.')
      }
      setStatus('Thank you. We have received your enquiry and will be in touch.')
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
      {fields}
      <label className="consent">
        <input type="checkbox" name="consent" required />
        I agree to the processing of my information in line with the privacy policy.
      </label>
      <button className="button" type="submit" disabled={submitting}>
        {submitting ? 'Sending' : submitLabel}
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
