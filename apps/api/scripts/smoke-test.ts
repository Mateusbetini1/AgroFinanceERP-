type JsonObject = Record<string, unknown>

const baseUrl = (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '')
const email = process.env.SMOKE_EMAIL ?? 'admin@agrofinance.com'
const password = process.env.SMOKE_PASSWORD ?? 'Admin@123456'

function fail(message: string): never {
  throw new Error(message)
}

async function requestJson(
  method: string,
  path: string,
  options: { token?: string; companyId?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = 'Bearer ' + options.token
  if (options.companyId) headers['x-company-id'] = options.companyId

  const response = await fetch(baseUrl + path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      fail(method + ' ' + path + ' returned non-JSON response: ' + text.slice(0, 200))
    }
  }

  if (!response.ok) {
    fail(method + ' ' + path + ' failed with HTTP ' + response.status + ': ' + text)
  }

  return json as JsonObject
}

function assertSuccess(name: string, json: JsonObject) {
  if (json.success === false) fail(name + ' returned success=false')
}

function assertPaginatedData(name: string, json: JsonObject) {
  assertSuccess(name, json)
  if (!Array.isArray(json.data)) fail(name + ' expected data array')
  if (json.data.length === 0) fail(name + ' expected at least one record')
}

function assertReportData(name: string, json: JsonObject) {
  assertSuccess(name, json)
  if (!Array.isArray(json.data)) fail(name + ' expected report data array')
  if (typeof json.count !== 'number') fail(name + ' expected numeric count')
}

function assertObjectData(name: string, json: JsonObject) {
  assertSuccess(name, json)
  if (!json.data || typeof json.data !== 'object' || Array.isArray(json.data)) {
    fail(name + ' expected data object')
  }
}

async function main() {
  console.log('Smoke test target: ' + baseUrl)

  const health = await requestJson('GET', '/health')
  if (health.status !== 'ok') fail('GET /health expected status=ok')
  console.log('OK GET /health')

  const login = await requestJson('POST', '/api/v1/auth/login', {
    body: { email, password },
  })

  assertObjectData('POST /api/v1/auth/login', login)
  const loginData = login.data as JsonObject
  const accessToken = loginData.accessToken
  if (typeof accessToken !== 'string') fail('Login response missing accessToken')

  const memberships = loginData.memberships
  if (!Array.isArray(memberships) || memberships.length === 0) {
    fail('Login response missing memberships')
  }

  const firstMembership = memberships[0] as JsonObject
  const company = firstMembership.company as JsonObject | undefined
  const companyId = company?.id
  if (typeof companyId !== 'string') fail('Login response missing memberships[0].company.id')
  console.log('OK login, companyId=' + companyId)

  const auth = { token: accessToken, companyId }

  const paginatedEndpoints = [
    '/api/v1/accounts',
    '/api/v1/products',
    '/api/v1/categories',
    '/api/v1/suppliers',
    '/api/v1/revenues',
    '/api/v1/expenses',
    '/api/v1/bills',
    '/api/v1/transfers',
    '/api/v1/employee-payments',
  ]

  for (const endpoint of paginatedEndpoints) {
    const json = await requestJson('GET', endpoint, auth)
    assertPaginatedData('GET ' + endpoint, json)
    console.log('OK GET ' + endpoint)
  }

  const dashboardOverview = await requestJson('GET', '/api/v1/dashboard/overview', auth)
  assertObjectData('GET /api/v1/dashboard/overview', dashboardOverview)
  const overviewData = dashboardOverview.data as JsonObject
  for (const key of ['totalBalance', 'revenueTotal', 'expenseTotal', 'netResult']) {
    if (!(key in overviewData)) fail('Dashboard overview missing ' + key)
  }
  console.log('OK GET /api/v1/dashboard/overview')

  const dashboardCashflow = await requestJson('GET', '/api/v1/dashboard/cashflow', auth)
  assertSuccess('GET /api/v1/dashboard/cashflow', dashboardCashflow)
  if (!('data' in dashboardCashflow)) fail('Dashboard cashflow missing data')
  console.log('OK GET /api/v1/dashboard/cashflow')

  for (const endpoint of ['/api/v1/reports/revenues', '/api/v1/reports/expenses', '/api/v1/reports/cashflow']) {
    const json = await requestJson('GET', endpoint, auth)
    assertReportData('GET ' + endpoint, json)
    console.log('OK GET ' + endpoint)
  }

  console.log('Smoke test completed successfully.')
}

main().catch((error) => {
  console.error('Smoke test failed:')
  console.error(error)
  process.exit(1)
})
