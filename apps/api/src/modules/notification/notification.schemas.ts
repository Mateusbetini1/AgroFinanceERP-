export const notificationGroupKeys = [
  'OVERDUE',
  'DUE_TODAY',
  'DUE_TOMORROW',
  'NEXT_7_DAYS',
  'RECEIVABLES',
] as const

export type NotificationGroupKey = (typeof notificationGroupKeys)[number]

export type NotificationItemType = 'BILL' | 'EXPENSE' | 'REVENUE'
export type NotificationSeverity = 'HIGH' | 'MEDIUM' | 'LOW'

export type NotificationAlertItem = {
  id: string
  type: NotificationItemType
  title: string
  description: string
  amount: number
  date: string
  status: string
  route: '/bills' | '/expenses' | '/revenues'
  severity: NotificationSeverity
}

export type NotificationAlertGroup = {
  key: NotificationGroupKey
  title: string
  items: NotificationAlertItem[]
}

export type NotificationAlertSummary = {
  overdueCount: number
  dueTodayCount: number
  dueTomorrowCount: number
  next7DaysCount: number
  totalOverdueAmount: number
  totalDueTodayAmount: number
  totalDueTomorrowAmount: number
  totalNext7DaysAmount: number
}

export type NotificationAlertsResponse = {
  summary: NotificationAlertSummary
  groups: NotificationAlertGroup[]
}
