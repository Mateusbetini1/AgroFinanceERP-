import { prisma } from '../../config/prisma'
import type {
  DashboardQuery,
  CashflowQuery,
  ForecastQuery,
  OperationalSummaryQuery,
  PayablesQuery,
} from './dashboard.schemas'
import { getPayrollSummary } from '../employee-payment/payroll-summary.service'
import { getMonthPeriod } from '../../shared/utils/month-period'

type MonthBucket = {
  year: number
  month: number
  received: number
  paidExpenses: number
  paidBills: number
  pendingReceivables: number
  pendingExpenses: number
  pendingBills: number
}

type FinancialAlert = {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  amount?: number
  accountId?: string
  accountName?: string
  relatedEntityType?: string
  relatedEntityId?: string
}

type AccountProjection = {
  accountId: string
  accountName: string
  type: string
  currentBalance: number
  projectedChange: number
  projectedBalance: number
}

type RecentMovement = {
  id: string
  type: 'REVENUE' | 'EXPENSE' | 'BILL' | 'EMPLOYEE_PAYMENT' | 'TRANSFER'
  date: Date
  description: string
  amount: number
  direction: 'INFLOW' | 'OUTFLOW' | 'TRANSFER'
  accountName?: string
  fromAccountName?: string
  toAccountName?: string
  relatedEntityType: string
  relatedEntityId: string
}

type OperationalItem = {
  id: string
  type: 'REVENUE' | 'EXPENSE' | 'BILL' | 'PAYROLL'
  title: string
  date: Date
  amount: number
  status: string
  isOverdue: boolean
  isToday: boolean
  supplier?: { id: string; name: string } | null
  category?: { id: string; name: string } | null
}

type ForecastAlertLevel = 'OK' | 'WARNING' | 'NEGATIVE'

type ForecastMonthDraft = {
  year: number
  month: number
  projectedReceivables: number
  projectedExpenses: number
  projectedBills: number
  projectedPayroll: number
  unallocatedInflows: number
  unallocatedOutflows: number
}

type AccountForecastDraft = {
  accountId: string
  accountName: string
  type: string
  currentBalance: number
  months: ForecastAccountMonthDraft[]
}

type ForecastAccountMonthDraft = {
  year: number
  month: number
  projectedReceivables: number
  projectedExpenses: number
  projectedBills: number
}

type ForecastNegativeMonth = {
  year: number
  month: number
  balance: number
}

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

function getDayPeriod(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return { start, end, bounds: { gte: start, lt: end } }
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function endOfMonthDate(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0)
}

function isInPeriod(date: Date, start: Date, end: Date) {
  return date >= start && date < end
}

function dateBounds(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined
  return {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  }
}

function getDefaultPeriod(query: DashboardQuery): { start: Date; end: Date } {
  const now = new Date()
  const start = query.dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1)
  const end = query.dateTo ?? new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

function getOperationalPeriod(query: OperationalSummaryQuery, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (query.mode === 'next-30-days') {
    return { start: today, end: addDays(today, 30) }
  }

  const selectedYear = query.year ?? today.getFullYear()
  const selectedMonth = query.month ?? today.getMonth() + 1

  return {
    start: new Date(selectedYear, selectedMonth - 1, 1),
    end: new Date(selectedYear, selectedMonth, 1),
  }
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getPayrollMonthsForPeriod(start: Date, end: Date, today: Date) {
  const months: Array<{ month: number; year: number; dueDate: Date }> = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)

  while (cursor <= last) {
    const dueDate = endOfMonthDate(cursor.getFullYear(), cursor.getMonth())
    if (dueDate < end && (dueDate >= start || dueDate < today)) {
      months.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear(), dueDate })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

function defaultBounds(query: DashboardQuery, useDefaultPeriod = true) {
  const period = useDefaultPeriod ? getDefaultPeriod(query) : undefined
  return query.dateFrom || query.dateTo
    ? dateBounds(query.dateFrom, query.dateTo)
    : period
      ? { gte: period.start, lt: period.end }
      : undefined
}

function baseRevenueWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds ? { date: bounds } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
  }
}

function cashRevenueWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds
      ? {
          OR: [
            { receivedAt: bounds },
            { receivedAt: null, date: bounds },
          ],
        }
      : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
  }
}

function baseExpenseWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds ? { date: bounds } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.productId ? { safra: { productId: query.productId } } : {}),
  }
}

function cashExpenseWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds
      ? {
          OR: [
            { paidAt: bounds },
            { paidAt: null, date: bounds },
          ],
        }
      : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.productId ? { safra: { productId: query.productId } } : {}),
  }
}

function forecastExpenseWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds
      ? {
          OR: [
            { dueDate: bounds },
            { dueDate: null, date: bounds },
          ],
        }
      : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.productId ? { safra: { productId: query.productId } } : {}),
  }
}

function baseBillWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds ? { dueDate: bounds } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  }
}

function cashBillWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds
      ? {
          OR: [
            { paidAt: bounds },
            { paidAt: null, dueDate: bounds },
          ],
        }
      : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  }
}

function monthKey(date: Date): string {
  return date.getFullYear() + '-' + (date.getMonth() + 1)
}

function ensureMonthBucket(buckets: Map<string, MonthBucket>, date: Date): MonthBucket {
  const key = monthKey(date)
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      received: 0,
      paidExpenses: 0,
      paidBills: 0,
      pendingReceivables: 0,
      pendingExpenses: 0,
      pendingBills: 0,
    }
    buckets.set(key, bucket)
  }
  return bucket
}

function initializeBuckets(startDate: Date, endDate: Date): Map<string, MonthBucket> {
  const buckets = new Map<string, MonthBucket>()
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (cursor <= end) {
    ensureMonthBucket(buckets, cursor)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return buckets
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function forecastMonthKey(year: number, month: number) {
  return `${year}-${month}`
}

function clampToForecastStart(date: Date, startDate: Date) {
  return date < startDate ? startDate : date
}

function createForecastMonthDraft(date: Date): ForecastMonthDraft {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    projectedReceivables: 0,
    projectedExpenses: 0,
    projectedBills: 0,
    projectedPayroll: 0,
    unallocatedInflows: 0,
    unallocatedOutflows: 0,
  }
}

function getForecastAlert(balance: number): ForecastAlertLevel {
  if (balance < 0) return 'NEGATIVE'
  if (balance < 1000) return 'WARNING'
  return 'OK'
}

function getFirstNegativeMonth(months: Array<{ year: number; month: number; endingBalance: number }>): ForecastNegativeMonth | null {
  const found = months.find((month) => month.endingBalance < 0)
  return found ? { year: found.year, month: found.month, balance: found.endingBalance } : null
}

export const DashboardService = {
  async summary(companyId: string) {
    return DashboardService.overview(companyId, {})
  },

  async operationalSummary(companyId: string, query: OperationalSummaryQuery) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = addDays(today, 1)
    const period = getOperationalPeriod(query, now)
    const bounds = { gte: period.start, lt: period.end }

    const actualsPeriod = getOperationalPeriod(
      { mode: 'current-month', month: query.month, year: query.year },
      now,
    )
    const actualsBounds = { gte: actualsPeriod.start, lt: actualsPeriod.end }

    const [
      revenues,
      expenses,
      bills,
      accounts,
      receivedActuals,
      paidExpenseActuals,
      paidBillActuals,
      employeePaymentActuals,
    ] = await Promise.all([
      prisma.revenue.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
          OR: [{ receivedAt: bounds }, { receivedAt: null, date: bounds }],
        },
        select: {
          id: true,
          date: true,
          receivedAt: true,
          totalAmount: true,
          status: true,
          client: true,
          notes: true,
          product: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          OR: [{ dueDate: bounds }, { dueDate: null, date: bounds }],
        },
        select: {
          id: true,
          description: true,
          amount: true,
          status: true,
          date: true,
          dueDate: true,
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: bounds,
        },
        select: {
          id: true,
          description: true,
          amount: true,
          status: true,
          dueDate: true,
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      prisma.account.findMany({
        where: { companyId, deletedAt: null, active: true },
        select: { id: true, name: true, type: true, currentBalance: true, active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.revenue.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'RECEIVED',
          receivedAt: actualsBounds,
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: actualsBounds,
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.bill.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: actualsBounds,
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.employeePayment.aggregate({
        where: {
          companyId,
          deletedAt: null,
          date: actualsBounds,
        },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const payrollSummaries = await Promise.all(
      getPayrollMonthsForPeriod(period.start, period.end, today).map(async (month) => ({
        ...month,
        summary: await getPayrollSummary(companyId, month.month, month.year),
      })),
    )

    const markDate = (date: Date) => ({
      isOverdue: date < today,
      isToday: date >= today && date < tomorrow,
    })

    const receivableItems: OperationalItem[] = revenues
      .map((revenue) => {
        const expectedDate = revenue.receivedAt ?? revenue.date
        return {
          id: revenue.id,
          type: 'REVENUE' as const,
          title: revenue.client ?? revenue.product.name,
          date: expectedDate,
          amount: toNumber(revenue.totalAmount),
          status: revenue.status,
          ...markDate(expectedDate),
        }
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const payableItems: OperationalItem[] = [
      ...expenses.map((expense) => {
        const dueDate = expense.dueDate ?? expense.date
        return {
          id: expense.id,
          type: 'EXPENSE' as const,
          title: expense.description,
          date: dueDate,
          amount: toNumber(expense.amount),
          status: expense.status,
          category: expense.category,
          supplier: expense.supplier,
          ...markDate(dueDate),
        }
      }),
      ...bills.map((bill) => ({
        id: bill.id,
        type: 'BILL' as const,
        title: bill.description,
        date: bill.dueDate,
        amount: toNumber(bill.amount),
        status: bill.status,
        category: bill.category,
        supplier: bill.supplier,
        ...markDate(bill.dueDate),
      })),
      ...payrollSummaries
        .filter((payroll) => payroll.summary.payrollRemaining > 0)
        .map((payroll) => ({
          id: `payroll-${payroll.year}-${payroll.month}`,
          type: 'PAYROLL' as const,
          title: 'Folha de pagamento',
          date: payroll.dueDate,
          amount: payroll.summary.payrollRemaining,
          status: 'PENDING',
          ...markDate(payroll.dueDate),
        })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    const payroll = payrollSummaries.reduce(
      (total, item) => ({
        expected: total.expected + item.summary.payrollExpected,
        paid: total.paid + item.summary.payrollSalaryPaid,
        remaining: total.remaining + item.summary.payrollRemaining,
      }),
      { expected: 0, paid: 0, remaining: 0 },
    )

    const totalToReceive = receivableItems.reduce((sum, item) => sum + item.amount, 0)
    const totalToPay = payableItems.reduce((sum, item) => sum + item.amount, 0)
    const payrollTotal = payableItems
      .filter((item) => item.type === 'PAYROLL')
      .reduce((sum, item) => sum + item.amount, 0)
    const billsTotal = payableItems
      .filter((item) => item.type === 'BILL')
      .reduce((sum, item) => sum + item.amount, 0)
    const expensesTotal = payableItems
      .filter((item) => item.type === 'EXPENSE')
      .reduce((sum, item) => sum + item.amount, 0)
    const payrollCount = payableItems.filter((item) => item.type === 'PAYROLL').length
    const billsCount = payableItems.filter((item) => item.type === 'BILL').length
    const expensesCount = payableItems.filter((item) => item.type === 'EXPENSE').length
    const miscellaneousTotal = billsTotal + expensesTotal
    const expectedBalance = totalToReceive - totalToPay
    const accountBalances = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      currentBalance: toNumber(account.currentBalance),
      active: account.active,
    }))
    const totalCurrentBalance = accountBalances.reduce((sum, account) => sum + account.currentBalance, 0)
    const receivedTotal = toNumber(receivedActuals._sum.totalAmount)
    const paidExpensesTotal = toNumber(paidExpenseActuals._sum.amount)
    const paidBillsTotal = toNumber(paidBillActuals._sum.amount)
    const employeePaymentsTotal = toNumber(employeePaymentActuals._sum.amount)
    const paidTotal = paidExpensesTotal + paidBillsTotal + employeePaymentsTotal

    return {
      period: {
        mode: query.mode,
        startDate: period.start,
        endDate: period.end,
      },
      receivables: {
        totalPending: totalToReceive,
        count: receivableItems.length,
        overdueCount: receivableItems.filter((item) => item.isOverdue).length,
        dueTodayCount: receivableItems.filter((item) => item.isToday).length,
        items: receivableItems,
      },
      payables: {
        totalPending: totalToPay,
        count: payableItems.length,
        overdueCount: payableItems.filter((item) => item.isOverdue).length,
        dueTodayCount: payableItems.filter((item) => item.isToday).length,
        items: payableItems,
      },
      payablesBreakdown: {
        total: totalToPay,
        payrollTotal,
        billsTotal,
        expensesTotal,
        miscellaneousTotal,
        payrollCount,
        billsCount,
        expensesCount,
      },
      payroll,
      actualsSummary: {
        receivedTotal,
        receivedCount: receivedActuals._count,
        paidTotal,
        paidCount: paidExpenseActuals._count + paidBillActuals._count + employeePaymentActuals._count,
        paidBillsTotal,
        paidBillsCount: paidBillActuals._count,
        paidExpensesTotal,
        paidExpensesCount: paidExpenseActuals._count,
        employeePaymentsTotal,
        employeePaymentsCount: employeePaymentActuals._count,
        netActualResult: receivedTotal - paidTotal,
      },
      summary: {
        totalToReceive,
        totalToPay,
        expectedBalance,
      },
      accountBalances: {
        totalCurrentBalance,
        projectedBalanceAfterPeriod: totalCurrentBalance + expectedBalance,
        accounts: accountBalances,
      },
      nextEvents: {
        nextReceivable: receivableItems.find((item) => item.date >= today) ?? null,
        nextPayable: payableItems.find((item) => item.date >= today) ?? null,
      },
    }
  },

  async live(companyId: string) {
    const now = new Date()
    const today = getDayPeriod(now)
    const next7End = addDays(today.start, 7)
    const next30End = addDays(today.start, 30)
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const [
      accounts,
      todayRevenue,
      todayExpense,
      todayBill,
      todayEmployeePayment,
      todayTransfer,
      pendingRevenues,
      pendingExpenses,
      pendingBills,
      payroll,
      recentRevenues,
      recentExpenses,
      recentBills,
      recentEmployeePayments,
      recentTransfers,
    ] = await Promise.all([
      prisma.account.findMany({
        where: { companyId, deletedAt: null, active: true },
        select: { id: true, name: true, type: true, currentBalance: true, active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.revenue.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'RECEIVED',
          OR: [{ receivedAt: today.bounds }, { receivedAt: null, date: today.bounds }],
        },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: today.bounds }, { paidAt: null, date: today.bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: today.bounds }, { paidAt: null, dueDate: today.bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.employeePayment.aggregate({
        where: { companyId, deletedAt: null, date: today.bounds },
        _sum: { amount: true },
      }),
      prisma.transfer.aggregate({
        where: { companyId, deletedAt: null, date: today.bounds },
        _sum: { amount: true },
      }),
      prisma.revenue.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
          OR: [{ receivedAt: { lt: next30End } }, { receivedAt: null, date: { lt: next30End } }],
        },
        select: { id: true, accountId: true, date: true, receivedAt: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          OR: [{ dueDate: { lt: next30End } }, { dueDate: null, date: { lt: next30End } }],
        },
        select: { id: true, accountId: true, date: true, dueDate: true, amount: true },
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: next30End },
        },
        select: { id: true, accountId: true, dueDate: true, amount: true },
      }),
      getPayrollSummary(companyId, currentMonth, currentYear),
      prisma.revenue.findMany({
        where: { companyId, deletedAt: null, status: 'RECEIVED' },
        select: {
          id: true,
          date: true,
          receivedAt: true,
          totalAmount: true,
          status: true,
          client: true,
          notes: true,
          product: { select: { name: true } },
          account: { select: { name: true } },
        },
        orderBy: [{ receivedAt: 'desc' }, { date: 'desc' }],
        take: 10,
      }),
      prisma.expense.findMany({
        where: { companyId, deletedAt: null, status: 'PAID' },
        select: {
          id: true,
          date: true,
          paidAt: true,
          description: true,
          amount: true,
          account: { select: { name: true } },
        },
        orderBy: [{ paidAt: 'desc' }, { date: 'desc' }],
        take: 10,
      }),
      prisma.bill.findMany({
        where: { companyId, deletedAt: null, status: 'PAID' },
        select: {
          id: true,
          dueDate: true,
          paidAt: true,
          description: true,
          amount: true,
          account: { select: { name: true } },
        },
        orderBy: [{ paidAt: 'desc' }, { dueDate: 'desc' }],
        take: 10,
      }),
      prisma.employeePayment.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          date: true,
          type: true,
          amount: true,
          notes: true,
          employee: { select: { name: true } },
          account: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      prisma.transfer.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          date: true,
          amount: true,
          description: true,
          fromAccount: { select: { name: true } },
          toAccount: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ])

    const balancesByAccount = accounts.map((account) => ({
      accountId: account.id,
      accountName: account.name,
      type: account.type,
      currentBalance: toNumber(account.currentBalance),
      active: account.active,
    }))
    const totalBalance = balancesByAccount.reduce((sum, account) => sum + account.currentBalance, 0)

    const projection7 = new Map<string, AccountProjection>()
    const projection30 = new Map<string, AccountProjection>()
    for (const account of balancesByAccount) {
      const base = {
        accountId: account.accountId,
        accountName: account.accountName,
        type: account.type,
        currentBalance: account.currentBalance,
        projectedChange: 0,
        projectedBalance: account.currentBalance,
      }
      projection7.set(account.accountId, { ...base })
      projection30.set(account.accountId, { ...base })
    }

    const addAccountProjection = (map: Map<string, AccountProjection>, accountId: string | null, amount: number) => {
      if (!accountId) return
      const current = map.get(accountId)
      if (!current) return
      current.projectedChange += amount
      current.projectedBalance += amount
    }

    let receivablesNext7Days = 0
    let receivablesNext30Days = 0
    let overdueReceivables = 0
    let unassignedReceivables7Days = 0
    let unassignedReceivables30Days = 0

    for (const revenue of pendingRevenues) {
      const expectedDate = revenue.receivedAt ?? revenue.date
      const amount = toNumber(revenue.totalAmount)
      if (expectedDate < today.start) overdueReceivables += amount
      if (isInPeriod(expectedDate, today.start, next7End)) {
        receivablesNext7Days += amount
        addAccountProjection(projection7, revenue.accountId, amount)
        if (!revenue.accountId) unassignedReceivables7Days += amount
      }
      if (isInPeriod(expectedDate, today.start, next30End)) {
        receivablesNext30Days += amount
        addAccountProjection(projection30, revenue.accountId, amount)
        if (!revenue.accountId) unassignedReceivables30Days += amount
      }
    }

    let payablesNext7Days = 0
    let payablesNext30Days = 0
    let overduePayables = 0
    let unassignedPayables7Days = 0
    let unassignedPayables30Days = 0

    const registerPayable = (date: Date, amount: number, accountId: string | null) => {
      if (date < today.start) overduePayables += amount
      if (isInPeriod(date, today.start, next7End)) {
        payablesNext7Days += amount
        addAccountProjection(projection7, accountId, -amount)
        if (!accountId) unassignedPayables7Days += amount
      }
      if (isInPeriod(date, today.start, next30End)) {
        payablesNext30Days += amount
        addAccountProjection(projection30, accountId, -amount)
        if (!accountId) unassignedPayables30Days += amount
      }
    }

    for (const expense of pendingExpenses) {
      registerPayable(expense.dueDate ?? expense.date, toNumber(expense.amount), expense.accountId)
    }
    for (const bill of pendingBills) {
      registerPayable(bill.dueDate, toNumber(bill.amount), bill.accountId)
    }

    const todayInflow = toNumber(todayRevenue._sum.totalAmount)
    const todayOutflow =
      toNumber(todayExpense._sum.amount) +
      toNumber(todayBill._sum.amount) +
      toNumber(todayEmployeePayment._sum.amount)
    const todayTransfers = toNumber(todayTransfer._sum.amount)
    const projectedBalance7Days = totalBalance + receivablesNext7Days - payablesNext7Days
    const projectedBalance30Days =
      totalBalance + receivablesNext30Days - payablesNext30Days - payroll.payrollRemaining

    const alerts: FinancialAlert[] = []
    if (projectedBalance7Days < 0) {
      alerts.push({
        type: 'NEGATIVE_PROJECTED_BALANCE_7_DAYS',
        severity: 'critical',
        message: 'Saldo total projetado pode ficar negativo nos próximos 7 dias.',
        amount: Math.abs(projectedBalance7Days),
      })
    }
    if (projectedBalance30Days < 0) {
      alerts.push({
        type: 'NEGATIVE_PROJECTED_BALANCE_30_DAYS',
        severity: 'warning',
        message: 'Saldo total projetado pode ficar negativo nos próximos 30 dias.',
        amount: Math.abs(projectedBalance30Days),
      })
    }
    for (const projection of [...projection7.values(), ...projection30.values()]) {
      if (projection.projectedBalance < 0) {
        alerts.push({
          type: 'NEGATIVE_PROJECTED_ACCOUNT_BALANCE',
          severity: 'warning',
          message: `A conta ${projection.accountName} pode ficar negativa pela projeção atual.`,
          amount: Math.abs(projection.projectedBalance),
          accountId: projection.accountId,
          accountName: projection.accountName,
        })
      }
    }
    if (overduePayables > 0) {
      alerts.push({
        type: 'OVERDUE_PAYABLES',
        severity: 'critical',
        message: 'Existem despesas ou boletos vencidos em aberto.',
        amount: overduePayables,
      })
    }
    if (overdueReceivables > 0) {
      alerts.push({
        type: 'OVERDUE_RECEIVABLES',
        severity: 'warning',
        message: 'Existem receitas pendentes com recebimento previsto vencido.',
        amount: overdueReceivables,
      })
    }
    if (payroll.payrollRemaining > 0) {
      alerts.push({
        type: 'PAYROLL_PENDING',
        severity: 'info',
        message: 'Ainda há folha de pagamento em aberto no mês atual.',
        amount: payroll.payrollRemaining,
      })
    }
    if (unassignedReceivables30Days > 0 || unassignedPayables30Days > 0) {
      alerts.push({
        type: 'UNASSIGNED_COMMITMENTS',
        severity: 'warning',
        message: 'Existem compromissos ou recebíveis sem conta definida nos próximos 30 dias.',
        amount: unassignedReceivables30Days + unassignedPayables30Days,
      })
    }

    const recentMovements: RecentMovement[] = [
      ...recentRevenues.map((revenue) => ({
        id: revenue.id,
        type: 'REVENUE' as const,
        date: revenue.receivedAt ?? revenue.date,
        description: 'Receita recebida - ' + revenue.product.name,
        amount: toNumber(revenue.totalAmount),
        direction: 'INFLOW' as const,
        accountName: revenue.account?.name,
        relatedEntityType: 'Revenue',
        relatedEntityId: revenue.id,
      })),
      ...recentExpenses.map((expense) => ({
        id: expense.id,
        type: 'EXPENSE' as const,
        date: expense.paidAt ?? expense.date,
        description: 'Despesa paga - ' + expense.description,
        amount: toNumber(expense.amount),
        direction: 'OUTFLOW' as const,
        accountName: expense.account?.name,
        relatedEntityType: 'Expense',
        relatedEntityId: expense.id,
      })),
      ...recentBills.map((bill) => ({
        id: bill.id,
        type: 'BILL' as const,
        date: bill.paidAt ?? bill.dueDate,
        description: 'Boleto pago - ' + bill.description,
        amount: toNumber(bill.amount),
        direction: 'OUTFLOW' as const,
        accountName: bill.account?.name,
        relatedEntityType: 'Bill',
        relatedEntityId: bill.id,
      })),
      ...recentEmployeePayments.map((payment) => ({
        id: payment.id,
        type: 'EMPLOYEE_PAYMENT' as const,
        date: payment.date,
        description: 'Pagamento funcionário - ' + payment.employee.name,
        amount: toNumber(payment.amount),
        direction: 'OUTFLOW' as const,
        accountName: payment.account?.name,
        relatedEntityType: 'EmployeePayment',
        relatedEntityId: payment.id,
      })),
      ...recentTransfers.map((transfer) => ({
        id: transfer.id,
        type: 'TRANSFER' as const,
        date: transfer.date,
        description: transfer.description ?? 'Transferência entre contas',
        amount: toNumber(transfer.amount),
        direction: 'TRANSFER' as const,
        fromAccountName: transfer.fromAccount.name,
        toAccountName: transfer.toAccount.name,
        relatedEntityType: 'Transfer',
        relatedEntityId: transfer.id,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)

    return {
      position: {
        totalBalance,
        balancesByAccount,
      },
      today: {
        todayInflow,
        todayOutflow,
        todayNetMovement: todayInflow - todayOutflow,
        todayTransfers,
      },
      commitments: {
        receivablesNext7Days,
        payablesNext7Days,
        overduePayables,
        overdueReceivables,
        receivablesNext30Days,
        payablesNext30Days,
        payrollRemainingCurrentMonth: payroll.payrollRemaining,
        unassignedReceivables7Days,
        unassignedPayables7Days,
        unassignedReceivables30Days,
        unassignedPayables30Days,
      },
      projection: {
        projectedBalance7Days,
        projectedBalance30Days,
        projectedByAccount7Days: Array.from(projection7.values()),
        projectedByAccount30Days: Array.from(projection30.values()),
        unassignedReceivables7Days,
        unassignedPayables7Days,
        unassignedReceivables30Days,
        unassignedPayables30Days,
      },
      alerts,
      recentMovements,
    }
  },

  async forecast(companyId: string, query: ForecastQuery) {
    const now = new Date()
    const startMonth = query.startMonth ?? now.getMonth() + 1
    const startYear = query.startYear ?? now.getFullYear()
    const startDate = new Date(startYear, startMonth - 1, 1)
    const endDate = addMonths(startDate, query.months)
    const lastMonthDate = addMonths(startDate, query.months - 1)

    const forecastMonths: ForecastMonthDraft[] = []
    for (let index = 0; index < query.months; index += 1) {
      forecastMonths.push(createForecastMonthDraft(addMonths(startDate, index)))
    }
    const monthByKey = new Map(forecastMonths.map((month) => [forecastMonthKey(month.year, month.month), month]))

    const [accounts, pendingRevenues, pendingExpenses, pendingBills, payrollByMonth] = await Promise.all([
      prisma.account.findMany({
        where: { companyId, deletedAt: null, active: true },
        select: { id: true, name: true, type: true, currentBalance: true },
        orderBy: { name: 'asc' },
      }),
      prisma.revenue.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
          OR: [{ receivedAt: { lt: endDate } }, { receivedAt: null, date: { lt: endDate } }],
        },
        select: { id: true, accountId: true, date: true, receivedAt: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          OR: [{ dueDate: { lt: endDate } }, { dueDate: null, date: { lt: endDate } }],
        },
        select: { id: true, accountId: true, date: true, dueDate: true, amount: true },
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: endDate },
        },
        select: { id: true, accountId: true, dueDate: true, amount: true },
      }),
      Promise.all(
        forecastMonths.map((month) =>
          getPayrollSummary(companyId, month.month, month.year).then((payroll) => ({
            year: month.year,
            month: month.month,
            payroll,
          })),
        ),
      ),
    ])

    const accountDrafts = new Map<string, AccountForecastDraft>()
    for (const account of accounts) {
      accountDrafts.set(account.id, {
        accountId: account.id,
        accountName: account.name,
        type: account.type,
        currentBalance: toNumber(account.currentBalance),
        months: forecastMonths.map((month) => ({
          year: month.year,
          month: month.month,
          projectedReceivables: 0,
          projectedExpenses: 0,
          projectedBills: 0,
        })),
      })
    }

    const getForecastMonth = (date: Date) => {
      const bucketDate = clampToForecastStart(date, startDate)
      return monthByKey.get(forecastMonthKey(bucketDate.getFullYear(), bucketDate.getMonth() + 1))
    }

    const getAccountMonth = (accountId: string | null, date: Date) => {
      if (!accountId) return null
      const account = accountDrafts.get(accountId)
      if (!account) return null
      const bucketDate = clampToForecastStart(date, startDate)
      return account.months.find((month) => month.year === bucketDate.getFullYear() && month.month === bucketDate.getMonth() + 1) ?? null
    }

    let overdueMovedToFirstMonth = 0
    for (const revenue of pendingRevenues) {
      const expectedDate = revenue.receivedAt ?? revenue.date
      const month = getForecastMonth(expectedDate)
      if (!month) continue
      const amount = toNumber(revenue.totalAmount)
      if (expectedDate < startDate) overdueMovedToFirstMonth += amount
      month.projectedReceivables += amount
      const accountMonth = getAccountMonth(revenue.accountId, expectedDate)
      if (accountMonth) accountMonth.projectedReceivables += amount
      else month.unallocatedInflows += amount
    }

    for (const expense of pendingExpenses) {
      const expectedDate = expense.dueDate ?? expense.date
      const month = getForecastMonth(expectedDate)
      if (!month) continue
      const amount = toNumber(expense.amount)
      if (expectedDate < startDate) overdueMovedToFirstMonth += amount
      month.projectedExpenses += amount
      const accountMonth = getAccountMonth(expense.accountId, expectedDate)
      if (accountMonth) accountMonth.projectedExpenses += amount
      else month.unallocatedOutflows += amount
    }

    for (const bill of pendingBills) {
      const month = getForecastMonth(bill.dueDate)
      if (!month) continue
      const amount = toNumber(bill.amount)
      if (bill.dueDate < startDate) overdueMovedToFirstMonth += amount
      month.projectedBills += amount
      const accountMonth = getAccountMonth(bill.accountId, bill.dueDate)
      if (accountMonth) accountMonth.projectedBills += amount
      else month.unallocatedOutflows += amount
    }

    for (const item of payrollByMonth) {
      const month = monthByKey.get(forecastMonthKey(item.year, item.month))
      if (!month) continue
      const amount = toNumber(item.payroll.payrollRemaining)
      month.projectedPayroll += amount
      month.unallocatedOutflows += amount
    }

    const currentTotalBalance = accounts.reduce((sum, account) => sum + toNumber(account.currentBalance), 0)
    let totalRunningBalance = currentTotalBalance
    const months = forecastMonths.map((month) => {
      const startingBalance = totalRunningBalance
      const projectedOutflows = month.projectedExpenses + month.projectedBills + month.projectedPayroll
      const projectedNet = month.projectedReceivables - projectedOutflows
      const endingBalance = startingBalance + projectedNet
      totalRunningBalance = endingBalance

      return {
        year: month.year,
        month: month.month,
        startingBalance,
        projectedReceivables: month.projectedReceivables,
        projectedExpenses: month.projectedExpenses,
        projectedBills: month.projectedBills,
        projectedPayroll: month.projectedPayroll,
        projectedOutflows,
        projectedNet,
        endingBalance,
        unallocatedInflows: month.unallocatedInflows,
        unallocatedOutflows: month.unallocatedOutflows,
        alert: getForecastAlert(endingBalance),
      }
    })

    const accountsForecast = Array.from(accountDrafts.values()).map((account) => {
      let runningBalance = account.currentBalance
      const accountMonths = account.months.map((month) => {
        const startingBalance = runningBalance
        const projectedNet = month.projectedReceivables - month.projectedExpenses - month.projectedBills
        const endingBalance = startingBalance + projectedNet
        runningBalance = endingBalance
        return {
          year: month.year,
          month: month.month,
          startingBalance,
          projectedReceivables: month.projectedReceivables,
          projectedExpenses: month.projectedExpenses,
          projectedBills: month.projectedBills,
          projectedNet,
          endingBalance,
          alert: getForecastAlert(endingBalance),
        }
      })
      return {
        accountId: account.accountId,
        accountName: account.accountName,
        type: account.type,
        currentBalance: account.currentBalance,
        finalProjectedBalance: accountMonths[accountMonths.length - 1]?.endingBalance ?? account.currentBalance,
        lowestProjectedBalance: Math.min(...accountMonths.map((month) => month.endingBalance), account.currentBalance),
        firstNegativeMonth: getFirstNegativeMonth(accountMonths),
        months: accountMonths,
      }
    })

    const unallocatedMonths = forecastMonths.map((month) => ({
      year: month.year,
      month: month.month,
      receivables: month.unallocatedInflows,
      expenses: month.projectedExpenses - accountsForecast.reduce((sum, account) => {
        const accountMonth = account.months.find((item) => item.year === month.year && item.month === month.month)
        return sum + (accountMonth?.projectedExpenses ?? 0)
      }, 0),
      bills: month.projectedBills - accountsForecast.reduce((sum, account) => {
        const accountMonth = account.months.find((item) => item.year === month.year && item.month === month.month)
        return sum + (accountMonth?.projectedBills ?? 0)
      }, 0),
      payroll: month.projectedPayroll,
      net: month.unallocatedInflows - month.unallocatedOutflows,
    }))

    const totalReceivables = months.reduce((sum, month) => sum + month.projectedReceivables, 0)
    const totalExpenses = months.reduce((sum, month) => sum + month.projectedExpenses, 0)
    const totalBills = months.reduce((sum, month) => sum + month.projectedBills, 0)
    const totalPayroll = months.reduce((sum, month) => sum + month.projectedPayroll, 0)
    const totalUnallocatedInflows = months.reduce((sum, month) => sum + month.unallocatedInflows, 0)
    const totalUnallocatedOutflows = months.reduce((sum, month) => sum + month.unallocatedOutflows, 0)
    const lowestProjectedBalance = Math.min(...months.map((month) => month.endingBalance), currentTotalBalance)
    const firstNegativeMonth = getFirstNegativeMonth(months)
    const finalProjectedBalance = months[months.length - 1]?.endingBalance ?? currentTotalBalance

    const alerts: FinancialAlert[] = []
    if (firstNegativeMonth) {
      alerts.push({
        type: 'FIRST_NEGATIVE_MONTH',
        severity: 'critical',
        message: 'Saldo total projetado fica negativo no periodo.',
        amount: Math.abs(firstNegativeMonth.balance),
      })
    }
    if (lowestProjectedBalance < 0) {
      alerts.push({
        type: 'LOWEST_PROJECTED_BALANCE',
        severity: 'critical',
        message: 'Menor saldo projetado no periodo e negativo.',
        amount: Math.abs(lowestProjectedBalance),
      })
    }
    for (const account of accountsForecast) {
      if (account.firstNegativeMonth) {
        alerts.push({
          type: 'NEGATIVE_ACCOUNT_BALANCE',
          severity: 'warning',
          message: `A conta ${account.accountName} pode ficar negativa pela projecao atual.`,
          amount: Math.abs(account.firstNegativeMonth.balance),
          accountId: account.accountId,
          accountName: account.accountName,
        })
      }
    }
    if (totalUnallocatedInflows > 0 || totalUnallocatedOutflows > 0) {
      alerts.push({
        type: 'UNALLOCATED_COMMITMENTS',
        severity: 'warning',
        message: 'Existem compromissos ou recebiveis sem conta definida no periodo.',
        amount: totalUnallocatedInflows + totalUnallocatedOutflows,
      })
    }
    if (overdueMovedToFirstMonth > 0) {
      alerts.push({
        type: 'OVERDUE_MOVED_TO_FIRST_MONTH',
        severity: 'warning',
        message: 'Valores vencidos antes do periodo foram considerados no primeiro mes projetado.',
        amount: overdueMovedToFirstMonth,
      })
    }
    if (totalPayroll > 0) {
      alerts.push({
        type: 'PROJECTED_PAYROLL',
        severity: 'info',
        message: 'Folha prevista/restante foi considerada como nao alocada.',
        amount: totalPayroll,
      })
    }

    return {
      period: {
        months: query.months,
        startMonth,
        startYear,
        endMonth: lastMonthDate.getMonth() + 1,
        endYear: lastMonthDate.getFullYear(),
      },
      summary: {
        currentTotalBalance,
        finalProjectedBalance,
        lowestProjectedBalance,
        firstNegativeMonth,
        totalReceivables,
        totalExpenses,
        totalBills,
        totalPayroll,
        totalPayables: totalExpenses + totalBills + totalPayroll,
        totalUnallocatedInflows,
        totalUnallocatedOutflows,
      },
      months,
      accounts: accountsForecast,
      unallocated: {
        totalInflows: totalUnallocatedInflows,
        totalOutflows: totalUnallocatedOutflows,
        months: unallocatedMonths,
      },
      alerts,
    }
  },

  async monthly(companyId: string, month: number, year: number) {
    const period = getMonthPeriod(month, year)
    const bounds = period.bounds

    const [
      realizedRevenue,
      pendingRevenue,
      paidExpenses,
      pendingExpenses,
      paidBills,
      pendingBills,
      employeePaymentsPaid,
      payroll,
    ] = await Promise.all([
      prisma.revenue.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'RECEIVED',
          OR: [{ receivedAt: bounds }, { receivedAt: null, date: bounds }],
        },
        _sum: { totalAmount: true },
      }),
      prisma.revenue.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
          OR: [{ receivedAt: bounds }, { receivedAt: null, date: bounds }],
        },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: bounds }, { paidAt: null, date: bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          OR: [{ dueDate: bounds }, { dueDate: null, date: bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: bounds }, { paidAt: null, dueDate: bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { companyId, deletedAt: null, status: { in: ['PENDING', 'OVERDUE'] }, dueDate: bounds },
        _sum: { amount: true },
      }),
      prisma.employeePayment.aggregate({
        where: { companyId, deletedAt: null, date: bounds },
        _sum: { amount: true },
      }),
      getPayrollSummary(companyId, month, year),
    ])

    const realizedRevenueTotal = toNumber(realizedRevenue._sum.totalAmount)
    const pendingRevenueTotal = toNumber(pendingRevenue._sum.totalAmount)
    const paidExpensesTotal = toNumber(paidExpenses._sum.amount)
    const pendingExpensesTotal = toNumber(pendingExpenses._sum.amount)
    const paidBillsTotal = toNumber(paidBills._sum.amount)
    const pendingBillsTotal = toNumber(pendingBills._sum.amount)
    const employeePaymentsPaidTotal = toNumber(employeePaymentsPaid._sum.amount)
    const realizedOutflows = paidExpensesTotal + paidBillsTotal + employeePaymentsPaidTotal
    const realizedResult = realizedRevenueTotal - realizedOutflows
    const projectedInflows = realizedRevenueTotal + pendingRevenueTotal
    const projectedOutflows =
      paidExpensesTotal +
      paidBillsTotal +
      employeePaymentsPaidTotal +
      pendingExpensesTotal +
      pendingBillsTotal +
      payroll.payrollRemaining

    return {
      month,
      year,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      realizedRevenue: realizedRevenueTotal,
      pendingRevenue: pendingRevenueTotal,
      paidExpenses: paidExpensesTotal,
      pendingExpenses: pendingExpensesTotal,
      paidBills: paidBillsTotal,
      pendingBills: pendingBillsTotal,
      employeePaymentsPaid: employeePaymentsPaidTotal,
      realizedOutflows,
      realizedResult,
      projectedInflows,
      projectedOutflows,
      projectedResult: projectedInflows - projectedOutflows,
      payroll,
    }
  },

  async overview(companyId: string, query: DashboardQuery) {
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const revenueWhere = cashRevenueWhere(companyId, query)
    const expenseWhere = cashExpenseWhere(companyId, query)
    const billWhere = cashBillWhere(companyId, query)
    const pendingRevenueWhere = baseRevenueWhere(companyId, query)
    const pendingExpenseWhere = forecastExpenseWhere(companyId, query)
    const pendingBillWhere = baseBillWhere(companyId, query)

    const [
      accountsAgg,
      revenueTotal,
      expenseTotal,
      billPaidTotal,
      pendingReceivables,
      pendingExpenses,
      pendingBills,
      overdueExpenses,
      overdueBills,
      activeSafras,
      billsDueSoon,
    ] = await Promise.all([
      prisma.account.aggregate({
        where: { companyId, deletedAt: null, active: true },
        _sum: { currentBalance: true },
      }),
      prisma.revenue.aggregate({
        where: { ...revenueWhere, status: 'RECEIVED' },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: { ...expenseWhere, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { ...billWhere, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.revenue.aggregate({
        where: { ...pendingRevenueWhere, status: 'PENDING' },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: { ...pendingExpenseWhere, status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { ...pendingBillWhere, status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { amount: true },
      }),
      // TODO: quando houver garantia/cron de vencidos, considerar calcular por dueDate < now.
      prisma.expense.aggregate({
        where: { ...pendingExpenseWhere, status: 'OVERDUE' },
        _sum: { amount: true },
      }),
      // TODO: quando houver garantia/cron de vencidos, considerar calcular por dueDate < now.
      prisma.bill.aggregate({
        where: { ...pendingBillWhere, status: 'OVERDUE' },
        _sum: { amount: true },
      }),
      prisma.safra.count({
        where: {
          companyId,
          deletedAt: null,
          status: 'ACTIVE',
          ...(query.productId ? { productId: query.productId } : {}),
          ...(query.safraId ? { id: query.safraId } : {}),
        },
      }),
      prisma.bill.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
          dueDate: { gte: now, lt: sevenDaysLater },
          ...(query.accountId ? { accountId: query.accountId } : {}),
          ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const received = toNumber(revenueTotal._sum.totalAmount)
    const paidExpenses = toNumber(expenseTotal._sum.amount)
    const paidBills = toNumber(billPaidTotal._sum.amount)
    const expenseAndBillTotal = paidExpenses + paidBills

    return {
      totalBalance: toNumber(accountsAgg._sum.currentBalance),
      revenueTotal: received,
      expenseTotal: expenseAndBillTotal,
      netResult: received - expenseAndBillTotal,
      pendingReceivables: toNumber(pendingReceivables._sum.totalAmount),
      pendingPayables: toNumber(pendingExpenses._sum.amount) + toNumber(pendingBills._sum.amount),
      overdueTotal: toNumber(overdueExpenses._sum.amount) + toNumber(overdueBills._sum.amount),
      activeSafras,
      billsDueSoon: {
        count: billsDueSoon._count,
        total: toNumber(billsDueSoon._sum.amount),
      },
    }
  },

  async cashflow(companyId: string, query: CashflowQuery) {
    const now = new Date()
    const startDate = query.dateFrom ?? new Date(now.getFullYear(), now.getMonth() - (query.months ?? 6) + 1, 1)
    const endDate = query.dateTo ?? now
    const rangeQuery = { ...query, dateFrom: startDate, dateTo: endDate }

    const [revenues, expenses, bills, pendingRevenues, pendingExpenses, pendingBills] = await Promise.all([
      prisma.revenue.findMany({
        where: { ...cashRevenueWhere(companyId, rangeQuery, false), status: 'RECEIVED' },
        select: { date: true, receivedAt: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: { ...cashExpenseWhere(companyId, rangeQuery, false), status: 'PAID' },
        select: { date: true, paidAt: true, amount: true },
      }),
      prisma.bill.findMany({
        where: { ...cashBillWhere(companyId, rangeQuery, false), status: 'PAID' },
        select: { dueDate: true, paidAt: true, amount: true },
      }),
      prisma.revenue.findMany({
        where: { ...baseRevenueWhere(companyId, rangeQuery, false), status: 'PENDING' },
        select: { date: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: { ...forecastExpenseWhere(companyId, rangeQuery, false), status: { in: ['PENDING', 'OVERDUE'] } },
        select: { date: true, dueDate: true, amount: true },
      }),
      prisma.bill.findMany({
        where: { ...baseBillWhere(companyId, rangeQuery, false), status: { in: ['PENDING', 'OVERDUE'] } },
        select: { dueDate: true, amount: true },
      }),
    ])

    const buckets = initializeBuckets(startDate, endDate)

    for (const item of revenues) ensureMonthBucket(buckets, item.receivedAt ?? item.date).received += toNumber(item.totalAmount)
    for (const item of expenses) ensureMonthBucket(buckets, item.paidAt ?? item.date).paidExpenses += toNumber(item.amount)
    for (const item of bills) ensureMonthBucket(buckets, item.paidAt ?? item.dueDate).paidBills += toNumber(item.amount)
    for (const item of pendingRevenues) ensureMonthBucket(buckets, item.date).pendingReceivables += toNumber(item.totalAmount)
    for (const item of pendingExpenses) ensureMonthBucket(buckets, item.dueDate ?? item.date).pendingExpenses += toNumber(item.amount)
    for (const item of pendingBills) ensureMonthBucket(buckets, item.dueDate).pendingBills += toNumber(item.amount)

    return Array.from(buckets.values())
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map((bucket) => {
        const outflow = bucket.paidExpenses + bucket.paidBills
        const projectedOutflow = bucket.pendingExpenses + bucket.pendingBills
        return {
          year: bucket.year,
          month: bucket.month,
          inflow: bucket.received,
          outflow,
          net: bucket.received - outflow,
          projection: {
            pendingReceivables: bucket.pendingReceivables,
            pendingPayables: projectedOutflow,
            projectedNet: bucket.pendingReceivables - projectedOutflow,
          },
        }
      })
  },

  async categories(companyId: string, query: DashboardQuery) {
    // Visao operacional: despesas lancadas no periodo, independentemente do status.
    const grouped = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: baseExpenseWhere(companyId, query),
      _sum: { amount: true },
    })

    const total = grouped.reduce((sum, item) => sum + toNumber(item._sum.amount), 0)
    const categoryIds = grouped.map((item) => item.categoryId)
    const categories = await prisma.category.findMany({
      where: { companyId, id: { in: categoryIds }, deletedAt: null },
      select: { id: true, name: true, color: true },
    })
    const byId = new Map(categories.map((category) => [category.id, category]))

    return grouped
      .map((item) => {
        const category = byId.get(item.categoryId)
        const categoryTotal = toNumber(item._sum.amount)
        return {
          id: item.categoryId,
          name: category?.name ?? 'Categoria removida',
          color: category?.color ?? null,
          total: categoryTotal,
          percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.total - a.total)
  },

  async products(companyId: string, query: DashboardQuery) {
    // Visao operacional: vendas por produto, incluindo PENDING e RECEIVED.
    const grouped = await prisma.revenue.groupBy({
      by: ['productId'],
      where: baseRevenueWhere(companyId, query),
      _sum: { totalAmount: true, quantity: true },
    })

    const productIds = grouped.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { companyId, id: { in: productIds }, deletedAt: null },
      select: { id: true, name: true },
    })
    const byId = new Map(products.map((product) => [product.id, product]))

    return grouped
      .map((item) => ({
        id: item.productId,
        name: byId.get(item.productId)?.name ?? 'Produto removido',
        totalAmount: toNumber(item._sum.totalAmount),
        quantity: toNumber(item._sum.quantity),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
  },

  async safras(companyId: string, query: DashboardQuery) {
    // Visao economica/operacional: receitas e despesas da safra independentemente do status.
    const [revenues, expenses] = await Promise.all([
      prisma.revenue.groupBy({
        by: ['safraId'],
        where: { ...baseRevenueWhere(companyId, query), safraId: { not: null } },
        _sum: { totalAmount: true },
      }),
      prisma.expense.groupBy({
        by: ['safraId'],
        where: { ...baseExpenseWhere(companyId, query), safraId: { not: null } },
        _sum: { amount: true },
      }),
    ])

    const totals = new Map<string, { revenueTotal: number; expenseTotal: number }>()
    for (const item of revenues) {
      if (!item.safraId) continue
      totals.set(item.safraId, {
        revenueTotal: toNumber(item._sum.totalAmount),
        expenseTotal: totals.get(item.safraId)?.expenseTotal ?? 0,
      })
    }
    for (const item of expenses) {
      if (!item.safraId) continue
      const current = totals.get(item.safraId) ?? { revenueTotal: 0, expenseTotal: 0 }
      current.expenseTotal = toNumber(item._sum.amount)
      totals.set(item.safraId, current)
    }

    const safraIds = Array.from(totals.keys())
    const safras = await prisma.safra.findMany({
      where: { companyId, id: { in: safraIds }, deletedAt: null },
      select: { id: true, name: true, status: true, product: { select: { id: true, name: true } } },
    })
    const byId = new Map(safras.map((safra) => [safra.id, safra]))

    return safraIds
      .map((id) => {
        const totalsForSafra = totals.get(id)!
        const safra = byId.get(id)
        return {
          id,
          name: safra?.name ?? 'Safra removida',
          status: safra?.status ?? null,
          product: safra?.product ?? null,
          revenueTotal: totalsForSafra.revenueTotal,
          expenseTotal: totalsForSafra.expenseTotal,
          result: totalsForSafra.revenueTotal - totalsForSafra.expenseTotal,
        }
      })
      .sort((a, b) => b.result - a.result)
  },

  async payables(companyId: string, query: PayablesQuery) {
    const [expenses, bills] = await Promise.all([
      prisma.expense.findMany({
        where: { ...baseExpenseWhere(companyId, query, false), status: { in: ['PENDING', 'OVERDUE'] } },
        select: {
          id: true,
          description: true,
          amount: true,
          status: true,
          date: true,
          dueDate: true,
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      prisma.bill.findMany({
        where: { ...baseBillWhere(companyId, query, false), status: { in: ['PENDING', 'OVERDUE'] } },
        select: {
          id: true,
          description: true,
          amount: true,
          status: true,
          dueDate: true,
          supplier: { select: { id: true, name: true } },
        },
      }),
    ])

    return [
      ...expenses.map((expense) => ({
        id: expense.id,
        type: 'EXPENSE' as const,
        description: expense.description,
        amount: toNumber(expense.amount),
        status: expense.status,
        dueDate: expense.dueDate ?? expense.date,
        category: expense.category,
        supplier: expense.supplier,
      })),
      ...bills.map((bill) => ({
        id: bill.id,
        type: 'BILL' as const,
        description: bill.description,
        amount: toNumber(bill.amount),
        status: bill.status,
        dueDate: bill.dueDate,
        category: null,
        supplier: bill.supplier,
      })),
    ]
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, query.limit)
  },
}
