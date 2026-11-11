const API = process.env.API_BASE || 'https://server-theta-nine-16.vercel.app'

async function check(path, { method = 'GET', body, expectStatus = 200 } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })

  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }

  const ok = response.status === expectStatus
  console.log(`${ok ? 'PASS' : 'FAIL'} ${method} ${path} -> ${response.status}`)
  if (!ok) console.log(json)
  return ok
}

const results = []

results.push(await check('/api/health'))
results.push(await check('/api/settings'))
results.push(await check('/api/projects'))
results.push(await check('/api/blogs'))
results.push(await check('/api/menus'))
results.push(await check('/api/forms'))
results.push(
  await check('/api/admin/session', { expectStatus: 401 })
)
results.push(
  await check('/api/admin/blogs', { expectStatus: 401 })
)
results.push(
  await check('/api/enquiries', {
    method: 'POST',
    body: { name: 'Smoke', email: 'not-an-email', consent: true },
    expectStatus: 400
  })
)

const failed = results.filter((item) => !item).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
