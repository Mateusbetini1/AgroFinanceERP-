export interface DashboardOverview {
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

export interface PayrollEmployeeSummary {
  employeeId: string
  employeeName: string
  employeeType: 'MONTHLY' | 'DAILY'
  baseSalary: number
  expectedSalary: number
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
  employees: PayrollEmployeeSummary[]
}

export interface DashboardMonthly {
  month: number
  year: number
  periodStart: string
  periodEnd: string
  realizedRevenue: number
  pendingRevenue: number
  paidExpenses: number
  pendingExpenses: number
  paidBills: number
  pendingBills: number
  employeePaymentsPaid: number
  realizedOutflows: number
  realizedResult: number
  projectedInflows: number
  projectedOutflows: number
  projectedResult: number
  payroll: PayrollSummary
}

export interface DashboardLiveAccountBalance {
  accountId: string
  accountName: string
  type: string
  currentBalance: number
  active: boolean
}

export interface DashboardLiveAccountProjection {
  accountId: string
  accountName: string
  type: string
  currentBalance: number
  projectedChange: number
  projectedBalance: number
}

export interface DashboardLiveAlert {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  amount?: number
  accountId?: string
  accountName?: string
  relatedEntityType?: string
  relatedEntityId?: string
}

export interface DashboardLiveMovement {
  id: string
  type: 'REVENUE' | 'EXPENSE' | 'BILL' | 'EMPLOYEE_PAYMENT' | 'TRANSFER'
  date: string
  description: string
  amount: number
  direction: 'INFLOW' | 'OUTFLOW' | 'TRANSFER'
  accountName?: string
  fromAccountName?: string
  toAccountName?: string
  relatedEntityType: string
  relatedEntityId: string
}

export interface DashboardLive {
  position: {
    totalBalance: number
    balancesByAccount: DashboardLiveAccountBalance[]
  }
  today: {
    todayInflow: number
    todayOutflow: number
    todayNetMovement: number
    todayTransfers: number
  }
  commitments: {
    receivablesNext7Days: number
    payablesNext7Days: number
    overduePayables: number
    overdueReceivables: number
    receivablesNext30Days: number
    payablesNext30Days: number
    payrollRemainingCurrentMonth: number
    unassignedReceivables7Days: number
    unassignedPayables7Days: number
    unassignedReceivables30Days: number
    unassignedPayables30Days: number
  }
  projection: {
    projectedBalance7Days: number
    projectedBalance30Days: number
    projectedByAccount7Days: DashboardLiveAccountProjection[]
    projectedByAccount30Days: DashboardLiveAccountProjection[]
    unassignedReceivables7Days: number
    unassignedPayables7Days: number
    unassignedReceivables30Days: number
    unassignedPayables30Days: number
  }
  alerts: DashboardLiveAlert[]
  recentMovements: DashboardLiveMovement[]
}

export type OperationalSummaryMode = 'current-month' | 'next-30-days'

export interface OperationalSummaryItem {
  id: string
  type: 'REVENUE' | 'EXPENSE' | 'BILL' | 'PAYROLL'
  title: string
  date: string
  amount: number
  status: string
  isOverdue: boolean
  isToday: boolean
  supplier?: { id: string; name: string } | null
  category?: { id: string; name: string } | null
}

export interface DashboardOperationalSummary {
  period: {
    mode: OperationalSummaryMode
    startDate: string
    endDate: string
  }
  receivables: {
    totalPending: number
    count: number
    overdueCount: number
    dueTodayCount: number
    items: OperationalSummaryItem[]
  }
  payables: {
    totalPending: number
    count: number
    overdueCount: number
    dueTodayCount: number
    items: OperationalSummaryItem[]
  }
  payroll: {
    expected: number
    paid: number
    remaining: number
  }
  summary: {
    totalToReceive: number
    totalToPay: number
    expectedBalance: number
  }
  accountBalances: {
    totalCurrentBalance: number
    projectedBalanceAfterPeriod: number
    accounts: Array<{
      id: string
      name: string
      type: string
      currentBalance: number
      active: boolean
    }>
  }
  nextEvents: {
    nextReceivable: OperationalSummaryItem | null
    nextPayable: OperationalSummaryItem | null
  }
}
