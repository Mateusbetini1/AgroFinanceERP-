import type { MembershipRole } from '@agrofinance/database'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
      }
      company?: {
        id: string
        name: string
      }
      membership?: {
        role: MembershipRole
      }
    }
  }
}

export {}
