const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' }
]

function blankField() {
  return {
    name: `field_${Date.now()}`,
    label: 'New field',
    type: 'text',
    required: false,
    placeholder: '',
    options: []
  }
}

function OptionsEditor({ options, onChange }) {
  const list = Array.isArray(options) ? options : []

  return (
    <div className="admin-builder-stack">
      <div className="admin-row-actions">
        <strong>Options</strong>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onChange([...list, ''])}
        >
          + Add option
        </button>
      </div>
      {list.map((option, index) => (
        <div className="admin-row-actions" key={index}>
          <input
            value={option}
            onChange={(e) => {
              const next = [...list]
              next[index] = e.target.value
              onChange(next)
            }}
            placeholder={`Option ${index + 1}`}
          />
          <button
            type="button"
            className="admin-secondary"
            onClick={() => onChange(list.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}

export default function FormBuilder({
  forms,
  setForms,
  selectedFormId,
  setSelectedFormId
}) {
  const list = Array.isArray(forms) ? forms : []
  const selected =
    list.find((form) => form.id === selectedFormId) || list[0] || null

  function updateSelected(patch) {
    if (!selected) return
    setForms((current) =>
      current.map((form) =>
        form.id === selected.id ? { ...form, ...patch } : form
      )
    )
  }

  function updateField(index, nextField) {
    const fields = [...(selected.fields || [])]
    fields[index] = nextField
    updateSelected({ fields })
  }

  function moveField(index, direction) {
    const fields = [...(selected.fields || [])]
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    ;[fields[index], fields[target]] = [fields[target], fields[index]]
    updateSelected({ fields })
  }

  return (
    <div className="admin-builder">
      <div className="admin-form-grid">
        <label>
          Select form
          <select
            value={selected?.id || ''}
            onChange={(e) => setSelectedFormId(e.target.value)}
          >
            {list.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title} ({form.id})
              </option>
            ))}
          </select>
        </label>
        <label>
          Form title
          <input
            value={selected?.title || ''}
            onChange={(e) => updateSelected({ title: e.target.value })}
            disabled={!selected}
            required
          />
        </label>
        <label>
          Submit button label
          <input
            value={selected?.submitLabel || ''}
            onChange={(e) => updateSelected({ submitLabel: e.target.value })}
            disabled={!selected}
          />
        </label>
        <label>
          Success message
          <input
            value={selected?.successMessage || ''}
            onChange={(e) => updateSelected({ successMessage: e.target.value })}
            disabled={!selected}
          />
        </label>
      </div>

      {!selected ? (
        <p className="admin-empty">No forms available.</p>
      ) : (
        <>
          <div className="admin-page-intro" style={{ margin: '24px 0 12px' }}>
            <div>
              <h2 style={{ fontSize: 20, margin: 0 }}>Fields</h2>
              <p className="admin-muted">
                Build the form with visual controls. No JSON editing required.
              </p>
            </div>
            <button
              type="button"
              className="admin-secondary"
              onClick={() =>
                updateSelected({
                  fields: [...(selected.fields || []), blankField()]
                })
              }
            >
              + Add field
            </button>
          </div>

          <div className="admin-builder-stack">
            {(selected.fields || []).map((field, index) => {
              const needsOptions = ['select', 'checkbox', 'radio'].includes(field.type)

              return (
                <div className="admin-builder-card" key={field.name || index}>
                  <div className="admin-form-grid">
                    <label>
                      Field label
                      <input
                        value={field.label || ''}
                        onChange={(e) =>
                          updateField(index, { ...field, label: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Field name
                      <input
                        value={field.name || ''}
                        onChange={(e) =>
                          updateField(index, {
                            ...field,
                            name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_')
                          })
                        }
                      />
                    </label>
                    <label>
                      Field type
                      <select
                        value={field.type || 'text'}
                        onChange={(e) =>
                          updateField(index, { ...field, type: e.target.value })
                        }
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Placeholder
                      <input
                        value={field.placeholder || ''}
                        onChange={(e) =>
                          updateField(index, {
                            ...field,
                            placeholder: e.target.value
                          })
                        }
                      />
                    </label>
                  </div>

                  <label className="admin-toggle" style={{ marginTop: 12 }}>
                    <span>Required</span>
                    <input
                      type="checkbox"
                      checked={Boolean(field.required)}
                      onChange={(e) =>
                        updateField(index, {
                          ...field,
                          required: e.target.checked
                        })
                      }
                    />
                    <i />
                  </label>

                  {needsOptions && (
                    <div style={{ marginTop: 14 }}>
                      <OptionsEditor
                        options={field.options}
                        onChange={(options) =>
                          updateField(index, { ...field, options })
                        }
                      />
                    </div>
                  )}

                  <div className="admin-row-actions" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => moveField(index, -1)}
                    >
                      ↑ Move up
                    </button>
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => moveField(index, 1)}
                    >
                      ↓ Move down
                    </button>
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() =>
                        updateSelected({
                          fields: (selected.fields || []).filter((_, i) => i !== index)
                        })
                      }
                    >
                      Delete field
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="admin-builder-card" style={{ marginTop: 24 }}>
            <p className="admin-eyebrow">PREVIEW</p>
            <h3 style={{ marginTop: 0 }}>{selected.title}</h3>
            <div className="admin-form-grid">
              {(selected.fields || []).map((field) => (
                <label key={field.name}>
                  {field.label}
                  {field.required ? ' *' : ''}
                  {field.type === 'textarea' ? (
                    <textarea rows="3" placeholder={field.placeholder || ''} disabled />
                  ) : field.type === 'select' ? (
                    <select disabled>
                      {(field.options || []).map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
                      placeholder={field.placeholder || ''}
                      disabled
                    />
                  )}
                </label>
              ))}
            </div>
            <button type="button" className="admin-primary" disabled>
              {selected.submitLabel || 'Submit'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
