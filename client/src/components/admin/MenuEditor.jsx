import { useState } from 'react'

function blankItem() {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    url: '/#',
    children: []
  }
}

function MenuItemEditor({ item, onChange, onRemove, depth = 0 }) {
  const children = Array.isArray(item.children) ? item.children : []

  return (
    <div className="admin-builder-card" style={{ marginLeft: depth ? 18 : 0 }}>
      <div className="admin-form-grid">
        <label>
          Label
          <input
            value={item.label || ''}
            onChange={(e) => onChange({ ...item, label: e.target.value })}
            required
          />
        </label>
        <label>
          URL / section
          <input
            value={item.url || ''}
            onChange={(e) => onChange({ ...item, url: e.target.value })}
            placeholder="/#about"
            required
          />
        </label>
      </div>

      <div className="admin-row-actions" style={{ marginTop: 12 }}>
        {depth < 1 && (
          <button
            type="button"
            className="admin-secondary"
            onClick={() =>
              onChange({
                ...item,
                children: [...children, blankItem()]
              })
            }
          >
            + Add child link
          </button>
        )}
        <button type="button" className="admin-secondary" onClick={onRemove}>
          Delete
        </button>
      </div>

      {children.length > 0 && (
        <div className="admin-builder-stack" style={{ marginTop: 14 }}>
          {children.map((child, index) => (
            <MenuItemEditor
              key={child.id || index}
              item={child}
              depth={depth + 1}
              onChange={(next) => {
                const nextChildren = children.map((entry, i) =>
                  i === index ? next : entry
                )
                onChange({ ...item, children: nextChildren })
              }}
              onRemove={() =>
                onChange({
                  ...item,
                  children: children.filter((_, i) => i !== index)
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MenuList({ title, items, onChange }) {
  const list = Array.isArray(items) ? items : []

  function move(index, direction) {
    const next = [...list]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="admin-builder-section">
      <div className="admin-page-intro" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0 }}>{title}</h2>
          <p className="admin-muted">Add links and optional dropdown children.</p>
        </div>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onChange([...list, blankItem()])}
        >
          + Add link
        </button>
      </div>

      <div className="admin-builder-stack">
        {list.map((item, index) => (
          <div key={item.id || index}>
            <div className="admin-row-actions" style={{ marginBottom: 8 }}>
              <button type="button" className="admin-secondary" onClick={() => move(index, -1)}>
                ↑
              </button>
              <button type="button" className="admin-secondary" onClick={() => move(index, 1)}>
                ↓
              </button>
            </div>
            <MenuItemEditor
              item={item}
              onChange={(next) => {
                const copy = [...list]
                copy[index] = next
                onChange(copy)
              }}
              onRemove={() => onChange(list.filter((_, i) => i !== index))}
            />
          </div>
        ))}
        {!list.length && <p className="admin-empty">No links yet. Add your first navigation item.</p>}
      </div>
    </div>
  )
}

export default function MenuEditor({ menus, setMenus }) {
  const [tab, setTab] = useState('header')

  return (
    <div className="admin-builder">
      <div className="admin-tabs" role="tablist">
        <button
          type="button"
          className={tab === 'header' ? 'is-active' : ''}
          onClick={() => setTab('header')}
        >
          Header menu
        </button>
        <button
          type="button"
          className={tab === 'footer' ? 'is-active' : ''}
          onClick={() => setTab('footer')}
        >
          Footer menu
        </button>
      </div>

      {tab === 'header' ? (
        <MenuList
          title="Header navigation"
          items={menus.header}
          onChange={(header) => setMenus((current) => ({ ...current, header }))}
        />
      ) : (
        <MenuList
          title="Footer navigation"
          items={menus.footer}
          onChange={(footer) => setMenus((current) => ({ ...current, footer }))}
        />
      )}
    </div>
  )
}
