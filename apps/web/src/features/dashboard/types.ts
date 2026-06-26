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
