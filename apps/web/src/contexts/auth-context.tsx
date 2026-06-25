'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { LoginResponse, Membership, User } from '@/types/api'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  membership: Membership | null
  memberships: Membership[]
  companyId: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (data: LoginResponse) => void
  selectMembership: (membership: Membership) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function persistMembership(membership: Membership | null) {
  if (!membership) {
    localStorage.removeItem('agrofinance:membership')
    localStorage.removeItem('agrofinance:company-id')
    return
  }

  localStorage.setItem('agrofinance:membership', JSON.stringify(membership))
  localStorage.setItem('agrofinance:company-id', membership.company.id)
}

function clearStoredAuth() {
  localStorage.removeItem('agrofinance:access')
  localStorage.removeItem('agrofinance:refresh')
  localStorage.removeItem('agrofinance:membership')
  localStorage.removeItem('agrofinance:company-id')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    membership: null,
    memberships: [],
    companyId: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('agrofinance:access')

    if (!token) {
      setState((current) => ({ ...current, isLoading: false }))
      return
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        const user = data.data
        const membershipRaw = localStorage.getItem('agrofinance:membership')
        const storedMembership = membershipRaw ? (JSON.parse(membershipRaw) as Membership) : null
        const membership = storedMembership ?? user.memberships?.[0] ?? null

        if (membership) persistMembership(membership)

        setState({
          user: { id: user.id, name: user.name, email: user.email },
          membership,
          memberships: user.memberships ?? [],
          companyId: membership?.company.id ?? null,
          isLoading: false,
          isAuthenticated: true,
        })
      })
      .catch(() => {
        clearStoredAuth()
        setState({
          user: null,
          membership: null,
          memberships: [],
          companyId: null,
          isLoading: false,
          isAuthenticated: false,
        })
      })
  }, [])

  const login = useCallback((data: LoginResponse) => {
    localStorage.setItem('agrofinance:access', data.accessToken)
    localStorage.setItem('agrofinance:refresh', data.refreshToken)

    const membership = data.memberships[0] ?? null
    persistMembership(membership)

    setState({
      user: data.user,
      membership,
      memberships: data.memberships,
      companyId: membership?.company.id ?? null,
      isLoading: false,
      isAuthenticated: true,
    })
  }, [])

  const selectMembership = useCallback((membership: Membership) => {
    persistMembership(membership)
    setState((current) => ({
      ...current,
      membership,
      companyId: membership.company.id,
    }))
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('agrofinance:refresh')

    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {
      // Logout local ainda deve acontecer quando a API nao responder.
    }

    clearStoredAuth()
    setState({
      user: null,
      membership: null,
      memberships: [],
      companyId: null,
      isLoading: false,
      isAuthenticated: false,
    })
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, selectMembership, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
