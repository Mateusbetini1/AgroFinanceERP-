export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
}

export interface Company {
  id: string
  name: string
  logoUrl: string | null
  planTier: string
}

export type MemberRole = 'OWNER' | 'ADMIN' | 'FINANCIAL' | 'AGRONOMIST' | 'VIEWER'

export interface Membership {
  role: MemberRole
  company: Company
}

export interface LoginResponse {
  user: User
  memberships: Membership[]
  accessToken: string
  refreshToken: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalBalance: number
  revenueTotal: number
  expenseTotal: number
  netResult: number
  pendingReceivables: number
  pendingPayables: number
  overdueTotal: number
  activeSafras: number
  billsDueSoon: {
    count: number
    total: number
  }
}

export interface CashflowItem {
  year: number
  month: number
  inflow: number
  outflow: number
  net: number
  projection: {
    pendingReceivables: number
    pendingPayables: number
    projectedNet: number
  }
}

// ── Account ──────────────────────────────────────────────────────────────────

export type AccountType = 'CASH' | 'BANK'

export interface Account {
  id: string
  name: string
  type: AccountType
  bankName: string | null
  agency: string | null
  accountNumber: string | null
  initialBalance: number | string
  currentBalance: number | string
  active: boolean
  createdAt: string
  updatedAt: string
}

// ── Category ─────────────────────────────────────────────────────────────────

export type CategoryType = 'EXPENSE' | 'REVENUE' | 'BOTH'

export interface Category {
  id: string
  name: string
  type: CategoryType
  color: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

// ── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  description: string | null
  unit: string
  categoryId: string | null
  category: { id: string; name: string; type: CategoryType } | null
  active: boolean
  createdAt: string
  updatedAt: string
}

// ── Supplier ─────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string
  name: string
  document: string
  email: string | null
  phone: string | null
  contactName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ── Revenue ──────────────────────────────────────────────────────────────────

export type RevenueStatus = 'PENDING' | 'RECEIVED'

export interface Revenue {
  id: string
  date: string
  receivedAt: string | null
  product: { name: string }
  account: { name: string } | null
  client: string | null
  quantity: number | string
  unitPrice: number | string
  totalAmount: number | string
  status: RevenueStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ── Expense ──────────────────────────────────────────────────────────────────

export type ExpenseStatus = 'PENDING' | 'PAID' | 'OVERDUE'

export interface Expense {
  id: string
  date: string
  dueDate: string | null
  paidAt: string | null
  description: string
  category: { name: string }
  supplier: { name: string } | null
  account: { name: string } | null
  amount: number | string
  status: ExpenseStatus
  attachmentUrl: string | null
  createdAt: string
  updatedAt: string
}

// ── Bill ─────────────────────────────────────────────────────────────────────

export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE'

export interface Bill {
  id: string
  description: string
  dueDate: string
  paidAt: string | null
  supplier: { name: string } | null
  account: { name: string } | null
  amount: number | string
  status: BillStatus
  installmentNumber: number | null
  installmentCount: number | null
  fileUrl: string | null
  createdAt: string
  updatedAt: string
}

// ── Employee ─────────────────────────────────────────────────────────────────

export type EmployeeType = 'MONTHLY' | 'DAILY'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE'

export interface Employee {
  id: string
  name: string
  role: string
  document: string | null
  phone: string | null
  pixKey: string | null
  baseSalary: number
  type: EmployeeType
  status: EmployeeStatus
  hireDate: string
  notes: string | null
  createdAt: string
}

// ── Transfer ─────────────────────────────────────────────────────────────────

export interface Transfer {
  id: string
  fromAccount: { name: string }
  toAccount: { name: string }
  amount: number
  date: string
  description: string | null
  createdAt: string
}

// ── Safra ────────────────────────────────────────────────────────────────────

export type SafraStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface Safra {
  id: string
  name: string
  product: { name: string }
  farmLocation: { name: string } | null
  startDate: string
  endDate: string | null
  estimatedYield: number | null
  status: SafraStatus
  notes: string | null
  active: boolean
  createdAt: string
}

// ── FarmLocation ─────────────────────────────────────────────────────────────

export type FarmLocationType = 'GREENHOUSE' | 'PLOT' | 'FIELD'

export interface FarmLocation {
  id: string
  name: string
  type: FarmLocationType
  area: number | null
  notes: string | null
  active: boolean
  createdAt: string
}

// ── EmployeePayment ───────────────────────────────────────────────────────────

export type PaymentType = 'SALARY' | 'OVERTIME' | 'ADVANCE' | 'BONUS' | 'DAILY_WAGE'

export interface EmployeePayment {
  id: string
  employee: { name: string }
  account: { name: string } | null
  type: PaymentType
  amount: number
  date: string
  referenceMonth: number
  referenceYear: number
  notes: string | null
  createdAt: string
}
