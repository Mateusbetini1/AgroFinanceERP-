import axios from 'axios'
import { API_BASE_URL } from '@/lib/config'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((item) => (error ? item.reject(error) : item.resolve(token!)))
  failedQueue = []
}

function clearAuth() {
  if (typeof window === 'undefined') return

  localStorage.removeItem('agrofinance:access')
  localStorage.removeItem('agrofinance:refresh')
  localStorage.removeItem('agrofinance:membership')
  localStorage.removeItem('agrofinance:company-id')
  window.location.href = '/login'
}

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config

  const token = localStorage.getItem('agrofinance:access')
  const companyId = localStorage.getItem('agrofinance:company-id')

  if (token) config.headers.Authorization = `Bearer ${token}`
  if (companyId) config.headers['x-company-id'] = companyId

  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    const isAuthEndpoint = original?.url?.includes('/auth/')

    if (error.response?.status !== 401 || original?._retry || isAuthEndpoint) {
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

    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('agrofinance:refresh') : null

    if (!refreshToken) {
      clearAuth()
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
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
