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

// ── Supply ───────────────────────────────────────────────────────────────────

export type SupplyCategory =
  | 'DEFENSIVE'
  | 'FERTILIZER'
  | 'SEED'
  | 'SUBSTRATE'
  | 'PACKAGING'
  | 'FUEL'
  | 'OTHER'

export type SupplyUnit = 'KG' | 'G' | 'L' | 'ML' | 'UNIT' | 'BAG' | 'BOX'

export interface Supply {
  id: string
  name: string
  category: SupplyCategory
  baseUnit: SupplyUnit
  purchaseUnitDefault: SupplyUnit
  packageSizeBaseQuantity: number | string | null
  packageSizeUnit: SupplyUnit | null
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface InputPurchaseLine {
  id: string
  supplyId: string
  supply: { id: string; name: string; category: SupplyCategory; baseUnit: SupplyUnit }
  quantity: number | string
  unit: SupplyUnit
  quantityBase: number | string
  unitCostBase: number | string
  totalAmount: number | string
  createdAt: string
  updatedAt: string
}

export interface InputPurchase {
  id: string
  supplierId: string | null
  supplier: { id: string; name: string } | null
  purchaseDate: string
  documentNumber: string | null
  totalAmount: number | string
  status: 'ACTIVE' | 'CANCELED'
  canceledAt: string | null
  canceledByUserId: string | null
  cancelReason: string | null
  notes: string | null
  items: InputPurchaseLine[]
  createdAt: string
  updatedAt: string
}

export interface InputStockBalance {
  id: string
  supplyId: string
  supply: { id: string; name: string; category: SupplyCategory; baseUnit: SupplyUnit; active: boolean }
  quantityBase: number | string
  averageCostBase: number | string
  totalValue: number | string
  createdAt: string
  updatedAt: string
}

export type InputStockMovementType = 'PURCHASE' | 'PURCHASE_CANCEL' | 'APPLICATION' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'
export type InputStockMovementDirection = 'IN' | 'OUT'

export interface InputStockMovement {
  id: string
  supplyId: string
  supply: { id: string; name: string; category: SupplyCategory; baseUnit: SupplyUnit }
  type: InputStockMovementType
  direction: InputStockMovementDirection
  quantityBase: number | string
  unitCostBase: number | string
  totalCost: number | string
  balanceQuantityAfter: number | string
  balanceValueAfter: number | string
  purchaseLineId: string | null
  applicationAllocationId: string | null
  applicationAllocation: {
    id: string
    safra: { id: string; name: string }
    farmLocation: { id: string; name: string } | null
  } | null
  occurredAt: string
  notes: string | null
  createdAt: string
}

export interface InputApplicationAllocation {
  id: string
  safraId: string
  safra: { id: string; name: string }
  farmLocationId: string | null
  farmLocation: { id: string; name: string; type?: FarmLocationType; active?: boolean } | null
  quantityBase: number | string
  unitCostBaseSnapshot: number | string
  totalCost: number | string
  createdAt: string
  updatedAt: string
}

export interface InputApplication {
  id: string
  supplyId: string
  supply: { id: string; name: string; category: SupplyCategory; baseUnit: SupplyUnit }
  applicationDate: string
  quantityBase: number | string
  unit: SupplyUnit
  originalQuantity: number | string
  unitCostBaseSnapshot: number | string
  totalCost: number | string
  notes: string | null
  allocations: InputApplicationAllocation[]
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
  productId: string
  accountId: string | null
  safraId: string | null
  date: string
  receivedAt: string | null
  product: { id?: string; name: string }
  account: { id?: string; name: string; type?: AccountType } | null
  safra: { id?: string; name: string } | null
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
  categoryId: string
  supplierId: string | null
  accountId: string | null
  safraId: string | null
  date: string
  dueDate: string | null
  paidAt: string | null
  description: string
  category: { id?: string; name: string; type?: CategoryType }
  supplier: { id?: string; name: string } | null
  account: { id?: string; name: string; type?: AccountType } | null
  safra: { id?: string; name: string } | null
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
  billGroupId: string | null
  categoryId: string | null
  supplierId: string | null
  accountId: string | null
  safraId: string | null
  description: string
  dueDate: string
  paidAt: string | null
  category: { id?: string; name: string; type?: CategoryType } | null
  supplier: { id?: string; name: string } | null
  account: { id?: string; name: string; type?: AccountType } | null
  safra: { id?: string; name: string } | null
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
  baseSalary: number | string
  type: EmployeeType
  status: EmployeeStatus
  hireDate: string
  notes: string | null
  createdAt: string
  updatedAt?: string
}

// ── Transfer ─────────────────────────────────────────────────────────────────

export interface Transfer {
  id: string
  fromAccountId: string
  fromAccount: { id?: string; name: string; type?: AccountType }
  toAccountId: string
  toAccount: { id?: string; name: string; type?: AccountType }
  amount: number | string
  date: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// ── Safra ────────────────────────────────────────────────────────────────────

export type SafraStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface Safra {
  id: string
  name: string
  productId?: string
  product: { id?: string; name: string; unit?: string; active?: boolean }
  farmLocationId?: string | null
  farmLocation: { id?: string; name: string; type?: FarmLocationType; active?: boolean } | null
  startDate: string
  endDate: string | null
  estimatedYield: number | string | null
  status: SafraStatus
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt?: string
}

// ── FarmLocation ─────────────────────────────────────────────────────────────

export type FarmLocationType = 'GREENHOUSE' | 'PLOT' | 'FIELD'

export interface FarmLocation {
  id: string
  name: string
  type: FarmLocationType
  area: number | string | null
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt?: string
}

// ── EmployeePayment ───────────────────────────────────────────────────────────

export type PaymentType = 'SALARY' | 'OVERTIME' | 'ADVANCE' | 'BONUS' | 'DAILY_WAGE'

export interface EmployeePayment {
  id: string
  employeeId: string
  employee: { id?: string; name: string; role?: string; status?: EmployeeStatus }
  accountId: string | null
  account: { id?: string; name: string; type?: AccountType } | null
  type: PaymentType
  amount: number | string
  date: string
  referenceMonth: number
  referenceYear: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PayrollEmployeeSummary {
  employeeId: string
  employeeName: string
  employeeType: 'MONTHLY' | 'DAILY'
  baseSalary: number
  expectedSalary: number
  salaryPayments: number
  advancePaid: number
  bonusPaid: number
  overtimePaid: number
  salaryPaid: number
  remainingSalary: number
  extrasPaid: number
  dailyPaid: number
  totalPaid: number
}

export interface PayrollSummary {
  month: number
  year: number
  payrollExpected: number
  payrollSalaryPaid: number
  payrollRemaining: number
  payrollExtrasPaid: number
  payrollDailyPaid: number
  payrollTotalPaid: number
  employeesWithPendingSalary: number
  employeeCount: number
  totalsByType: Record<PaymentType, number>
  employees: PayrollEmployeeSummary[]
}
