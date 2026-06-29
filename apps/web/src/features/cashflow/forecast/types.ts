export type ForecastAlertLevel = 'OK' | 'WARNING' | 'NEGATIVE'

export interface ForecastNegativeMonth {
  year: number
  month: number
  balance: number
}

export interface ForecastMonth {
  year: number
  month: number
  startingBalance: number
  projectedReceivables: number
  projectedExpenses: number
  projectedBills: number
  projectedPayroll: number
  projectedOutflows: number
  projectedNet: number
  endingBalance: number
  unallocatedInflows: number
  unallocatedOutflows: number
  alert: ForecastAlertLevel
}

export interface AccountForecastMonth {
  year: number
  month: number
  startingBalance: number
  projectedReceivables: number
  projectedExpenses: number
  projectedBills: number
  projectedNet: number
  endingBalance: number
  alert: ForecastAlertLevel
}

export interface AccountForecast {
  accountId: string
  accountName: string
  type: string
  currentBalance: number
  finalProjectedBalance: number
  lowestProjectedBalance: number
  firstNegativeMonth: ForecastNegativeMonth | null
  months: AccountForecastMonth[]
}

export interface UnallocatedForecastMonth {
  year: number
  month: number
  receivables: number
  expenses: number
  bills: number
  payroll: number
  net: number
}

export interface ForecastAlert {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  year?: number
  month?: number
  amount?: number
  accountId?: string
  accountName?: string
}

export interface CashflowForecast {
  period: {
    months: number
    startMonth: number
    startYear: number
    endMonth: number
    endYear: number
  }
  summary: {
    currentTotalBalance: number
    finalProjectedBalance: number
    lowestProjectedBalance: number
    firstNegativeMonth: ForecastNegativeMonth | null
    totalReceivables: number
    totalExpenses: number
    totalBills: number
    totalPayroll: number
    totalPayables: number
    totalUnallocatedInflows: number
    totalUnallocatedOutflows: number
  }
  months: ForecastMonth[]
  accounts: AccountForecast[]
  unallocated: {
    totalInflows: number
    totalOutflows: number
    months: UnallocatedForecastMonth[]
  }
  alerts: ForecastAlert[]
}
