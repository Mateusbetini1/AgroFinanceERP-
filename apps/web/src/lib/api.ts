import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Queue de requisições que falharam enquanto o token estava sendo renovado
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

function clearAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('agrofinance:access')
  localStorage.removeItem('agrofinance:refresh')
  localStorage.removeItem('agrofinance:membership')
  window.location.href = '/login'
}

// Injeta token de acesso e company ID em toda requisição
api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config

  const token = localStorage.getItem('agrofinance:access')
  const membershipRaw = localStorage.getItem('agrofinance:membership')

  if (token) config.headers.Authorization = `Bearer ${token}`
  if (membershipRaw) {
    try {
      const membership = JSON.parse(membershipRaw)
      config.headers['x-company-id'] = membership.company.id
    } catch {}
  }

  return config
})

// Intercepta 401: tenta renovar token e reprocessa a fila
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    const isAuthEndpoint = original?.url?.includes('/auth/')
    if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('agrofinance:refresh') : null
    if (!refreshToken) {
      clearAuth()
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken })
      const newAccess: string = data.data.accessToken
      const newRefresh: string = data.data.refreshToken

      localStorage.setItem('agrofinance:access', newAccess)
      localStorage.setItem('agrofinance:refresh', newRefresh)

      processQueue(null, newAccess)
      original.headers.Authorization = `Bearer ${newAccess}`
      return api(original)
    } catch (err) {
      processQueue(err, null)
      clearAuth()
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)
