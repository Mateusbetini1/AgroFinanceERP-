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
