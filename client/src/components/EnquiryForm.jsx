import { useEffect, useRef, useState } from 'react'
import { ArrowIcon } from './Icons.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\s+().-]{7,20}$/

function validateForm(form) {
  const errors = {}
  const fields = form.querySelectorAll('input, textarea, select')

  fields.forEach((field) => {
    if (field.type === 'checkbox' || field.type === 'hidden') return

    const name = field.name
    if (!name) return

    const value = typeof field.value === 'string' ? field.value.trim() : ''
    const required =
      field.required || field.getAttribute('aria-required') === 'true'

    if (required && !value) {
      errors[name] = 'This field is required.'
      return
    }

    if (!value) return

    const type = (field.type || 'text').toLowerCase()

    if (type === 'email' && !EMAIL_RE.test(value)) {
      errors[name] = 'Enter a valid email address.'
    } else if (type === 'tel' && !PHONE_RE.test(value)) {
      errors[name] = 'Enter a valid phone number.'
    }
  })

  const consent = form.querySelector('input[name="consent"]')
  if (consent?.required && !consent.checked) {
    errors.consent = 'Please confirm you agree to continue.'
  }

  return errors
}

export default function EnquiryForm({
  type,
  fields,
  submitLabel,
  className,
  extraNote
}) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [schema, setSchema] = useState(null)
  const formRef = useRef(null)

  useEffect(() => {
    const id = /landowner/i.test(type)
      ? 'landowner'
      : /channel partner/i.test(type)
        ? 'partner'
        : 'contact'

    fetch('/api/forms')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const found = Array.isArray(list)
          ? list.find((item) => item.id === id)
          : null
        if (found) setSchema(found)
      })
      .catch(() => {})
  }, [type])

  function clearFeedback() {
    if (status || error || Object.keys(fieldErrors).length) {
      setStatus('')
      setError(false)
      setFieldErrors({})
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting) return

    const form = event.currentTarget
    const errors = validateForm(form)

    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setError(true)
      setStatus('Please check the highlighted fields and try again.')
      return
    }

    const data = Object.fromEntries(new FormData(form).entries())
    setSubmitting(true)
    setStatus('')
    setError(false)
    setFieldErrors({})

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          type,
          formId: schema?.id || '',
          ...data,
          consent: Boolean(data.consent)
        })
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.message || 'Could not send enquiry.')
      }

      setError(false)
      setStatus(
        schema?.successMessage ||
          'Thank you. We have received your enquiry and will be in touch.'
      )
      form.reset()
    } catch (err) {
      setError(true)
      setStatus(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={handleSubmit}
      onInput={clearFeedback}
      onChange={clearFeedback}
      noValidate
    >
      {schema
        ? schema.fields.map((field, index) => (
            <label
              className="cms-form-field"
              key={`${field.name}-${index}`}
            >
              {field.label}
              {field.type === 'textarea' ? (
                <textarea
                  className={`field ${
                    fieldErrors[field.name] ? 'field--invalid' : ''
                  }`}
                  name={field.name}
                  placeholder={field.placeholder || field.label}
                  required={!!field.required}
                  aria-invalid={fieldErrors[field.name] ? 'true' : undefined}
                />
              ) : field.type === 'select' ? (
                <select
                  className={`field ${
                    fieldErrors[field.name] ? 'field--invalid' : ''
                  }`}
                  name={field.name}
                  required={!!field.required}
                  aria-invalid={fieldErrors[field.name] ? 'true' : undefined}
                >
                  <option value="">Select {field.label}</option>
                  {(field.options || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  name={field.name}
                  value="Yes"
                  required={!!field.required}
                />
              ) : (
                <input
                  className={`field ${
                    fieldErrors[field.name] ? 'field--invalid' : ''
                  }`}
                  type={
                    ['text', 'email', 'tel', 'number', 'date'].includes(
                      field.type
                    )
                      ? field.type
                      : 'text'
                  }
                  name={field.name}
                  placeholder={field.placeholder || field.label}
                  required={!!field.required}
                  aria-invalid={fieldErrors[field.name] ? 'true' : undefined}
                />
              )}
              {fieldErrors[field.name] && (
                <span className="field-error">{fieldErrors[field.name]}</span>
              )}
            </label>
          ))
        : fields}

      <label className="consent">
        <input type="checkbox" name="consent" required />
        I agree to the processing of my information in line with the privacy
        policy.
      </label>
      {fieldErrors.consent && (
        <span className="field-error">{fieldErrors.consent}</span>
      )}

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : schema?.submitLabel || submitLabel}
        <span className="button-arrow" aria-hidden="true">
          <ArrowIcon />
        </span>
      </button>

      <p
        className={`form-status ${
          error ? 'is-error' : status ? 'is-success' : ''
        }`}
        aria-live="polite"
      >
        {status}
      </p>
      {extraNote}
    </form>
  )
}
