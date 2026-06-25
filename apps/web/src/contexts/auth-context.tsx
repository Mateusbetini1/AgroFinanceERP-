'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { LoginResponse, Membership, User } from '@/types/api'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  membership: Membership | null
  memberships: Membership[]
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (data: LoginResponse) => void
  selectMembership: (membership: Membership) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    membership: null,
    memberships: [],
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('agrofinance:access')
    if (!token) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        const user = data.data
        const membershipRaw = localStorage.getItem('agrofinance:membership')
        const storedMembership = membershipRaw ? JSON.parse(membershipRaw) : null
        const membership = storedMembership ?? user.memberships?.[0] ?? null

        setState({
          user: { id: user.id, name: user.name, email: user.email },
          membership,
          memberships: user.memberships ?? [],
          isLoading: false,
          isAuthenticated: true,
        })
      })
      .catch(() => {
        setState((s) => ({ ...s, isLoading: false }))
      })
  }, [])

  const login = useCallback((data: LoginResponse) => {
    localStorage.setItem('agrofinance:access', data.accessToken)
    localStorage.setItem('agrofinance:refresh', data.refreshToken)

    const membership = data.memberships[0] ?? null
    if (membership) {
      localStorage.setItem('agrofinance:membership', JSON.stringify(membership))
    }

    setState({
      user: data.user,
      membership,
      memberships: data.memberships,
      isLoading: false,
      isAuthenticated: true,
    })
  }, [])

  const selectMembership = useCallback((membership: Membership) => {
    localStorage.setItem('agrofinance:membership', JSON.stringify(membership))
    setState((s) => ({ ...s, membership }))
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('agrofinance:refresh')
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {}
    localStorage.removeItem('agrofinance:access')
    localStorage.removeItem('agrofinance:refresh')
    localStorage.removeItem('agrofinance:membership')
    setState({
      user: null,
      membership: null,
      memberships: [],
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
