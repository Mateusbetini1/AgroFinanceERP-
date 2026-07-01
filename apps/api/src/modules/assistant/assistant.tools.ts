import { prisma } from '../../config/prisma'
import { DashboardService } from '../dashboard/dashboard.service'
import { ReportService } from '../report/report.service'
import type { AssistantSource, AssistantToolCall } from './assistant.schemas'

const MAX_RECORDS = 20

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function currentMonthRange() {
  const now = new Date()
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  }
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value!)))
}

function normalizeToolCall(call: AssistantToolCall): AssistantToolCall {
  return {
    tool: call.tool,
    args: {
      days: clampNumber(call.args?.days, 7, 1, 90),
      months: clampNumber(call.args?.months, 1, 1, 24),
      search: call.args?.search?.slice(0, 100),
    },
  }
}

function toNumber(value: unknown) {
  return Number(value ?? 0)
}

function summarizeList<T extends { amount?: unknown; totalAmount?: unknown }>(items: T[]) {
  return items.reduce((sum, item) => sum + toNumber(item.amount ?? item.totalAmount), 0)
}

async function getBillTotals(companyId: string, statuses: Array<'PENDING' | 'OVERDUE' | 'PAID'>) {
  const [count, aggregate] = await Promise.all([
    prisma.bill.count({ where: { companyId, deletedAt: null, status: { in: statuses } } }),
    prisma.bill.aggregate({
      where: { companyId, deletedAt: null, status: { in: statuses } },
      _sum: { amount: true },
    }),
  ])

  return { count, total: toNumber(aggregate._sum.amount) }
}

async function getExpenseTotals(companyId: string, statuses: Array<'PENDING' | 'OVERDUE' | 'PAID'>) {
  const [count, aggregate] = await Promise.all([
    prisma.expense.count({ where: { companyId, deletedAt: null, status: { in: statuses } } }),
    prisma.expense.aggregate({
      where: { companyId, deletedAt: null, status: { in: statuses } },
      _sum: { amount: true },
    }),
  ])

  return { count, total: toNumber(aggregate._sum.amount) }
}

async function getUpcomingBills(companyId: string, days = 7) {
  const start = startOfToday()
  const end = addDays(start, days + 1)
  const bills = await prisma.bill.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: { in: ['PENDING', 'OVERDUE'] },
      dueDate: { gte: start, lt: end },
    },
    orderBy: { dueDate: 'asc' },
    take: MAX_RECORDS,
    select: {
      id: true,
      description: true,
      amount: true,
      dueDate: true,
      status: true,
      supplier: { select: { name: true } },
      account: { select: { name: true } },
      category: { select: { name: true } },
      safra: { select: { name: true } },
    },
  })

  return {
    days,
    count: bills.length,
    total: summarizeList(bills),
    bills: bills.map((bill) => ({ ...bill, amount: toNumber(bill.amount) })),
  }
}

async function getPendingBills(companyId: string) {
  const totals = await getBillTotals(companyId, ['PENDING'])
  const bills = await prisma.bill.findMany({
    where: { companyId, deletedAt: null, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
    take: MAX_RECORDS,
    select: {
      id: true,
      description: true,
      amount: true,
      dueDate: true,
      status: true,
      supplier: { select: { name: true } },
      account: { select: { name: true } },
      category: { select: { name: true } },
      safra: { select: { name: true } },
    },
  })

  return {
    ...totals,
    bills: bills.map((bill) => ({ ...bill, amount: toNumber(bill.amount) })),
  }
}

async function getOverdueBills(companyId: string) {
  const today = startOfToday()
  const bills = await prisma.bill.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: { in: ['PENDING', 'OVERDUE'] },
      OR: [{ status: 'OVERDUE' }, { dueDate: { lt: today } }],
    },
    orderBy: { dueDate: 'asc' },
    take: MAX_RECORDS,
    select: {
      id: true,
      description: true,
      amount: true,
      dueDate: true,
      status: true,
      supplier: { select: { name: true } },
      account: { select: { name: true } },
      category: { select: { name: true } },
      safra: { select: { name: true } },
    },
  })

  return {
    count: bills.length,
    total: summarizeList(bills),
    bills: bills.map((bill) => ({ ...bill, amount: toNumber(bill.amount) })),
  }
}

async function getPayablesNextDays(companyId: string, days = 7) {
  const live = await DashboardService.live(companyId)
  const upcoming = await getUpcomingBills(companyId, days)
  return {
    days,
    payablesNext7Days: live.commitments.payablesNext7Days,
    overduePayables: live.commitments.overduePayables,
    upcomingBills: upcoming,
  }
}

async function getPayablesSummary(companyId: string) {
  const [pendingBills, overdueBills, pendingExpenses, overdueExpenses] = await Promise.all([
    getBillTotals(companyId, ['PENDING']),
    getOverdueBills(companyId),
    getExpenseTotals(companyId, ['PENDING']),
    getOverdueExpenses(companyId),
  ])

  return {
    bills: {
      pending: pendingBills,
      overdue: { count: overdueBills.count, total: overdueBills.total },
      total: pendingBills.total + overdueBills.total,
      count: pendingBills.count + overdueBills.count,
    },
    expenses: {
      pending: pendingExpenses,
      overdue: { count: overdueExpenses.count, total: overdueExpenses.total },
      total: pendingExpenses.total + overdueExpenses.total,
      count: pendingExpenses.count + overdueExpenses.count,
    },
    totalPayables: pendingBills.total + overdueBills.total + pendingExpenses.total + overdueExpenses.total,
  }
}

async function getReceivablesNextDays(companyId: string, days = 7) {
  const start = startOfToday()
  const end = addDays(start, days + 1)
  const revenues = await prisma.revenue.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: 'PENDING',
      OR: [
        { receivedAt: { gte: start, lt: end } },
        { receivedAt: null, date: { gte: start, lt: end } },
      ],
    },
    orderBy: [{ receivedAt: 'asc' }, { date: 'asc' }],
    take: MAX_RECORDS,
    select: {
      id: true,
      client: true,
      totalAmount: true,
      date: true,
      receivedAt: true,
      product: { select: { name: true } },
      account: { select: { name: true } },
      safra: { select: { name: true } },
    },
  })

  return {
    days,
    count: revenues.length,
    total: summarizeList(revenues),
    revenues: revenues.map((revenue) => ({ ...revenue, totalAmount: toNumber(revenue.totalAmount) })),
  }
}

async function getCashflowForecast(companyId: string, months = 1) {
  return DashboardService.forecast(companyId, { months })
}

async function getSafras(companyId: string, search?: string) {
  const safras = await prisma.safra.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { product: { name: { contains: search, mode: 'insensitive' as const } } },
              { farmLocation: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    take: MAX_RECORDS,
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      estimatedYield: true,
      active: true,
      product: { select: { id: true, name: true, unit: true } },
      farmLocation: { select: { id: true, name: true, type: true } },
    },
  })

  return {
    count: safras.length,
    data: safras.map((safra) => ({
      ...safra,
      estimatedYield: safra.estimatedYield === null ? null : toNumber(safra.estimatedYield),
    })),
  }
}

async function getActiveSafras(companyId: string) {
  const safras = await prisma.safra.findMany({
    where: { companyId, deletedAt: null, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    take: MAX_RECORDS,
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      estimatedYield: true,
      active: true,
      product: { select: { id: true, name: true, unit: true } },
      farmLocation: { select: { id: true, name: true, type: true } },
    },
  })

  return {
    count: safras.length,
    data: safras.map((safra) => ({
      ...safra,
      estimatedYield: safra.estimatedYield === null ? null : toNumber(safra.estimatedYield),
    })),
  }
}

async function getSafraSummary(companyId: string, search?: string) {
  const result = await ReportService.safras(companyId, { search })
  return {
    count: result.count,
    data: result.data.slice(0, MAX_RECORDS),
  }
}

async function getSafrasWithFinancialSummary(companyId: string, search?: string) {
  return getSafraSummary(companyId, search)
}

async function getPendingExpenses(companyId: string) {
  const totals = await getExpenseTotals(companyId, ['PENDING'])
  const expenses = await prisma.expense.findMany({
    where: { companyId, deletedAt: null, status: 'PENDING' },
    orderBy: [{ dueDate: 'asc' }, { date: 'asc' }],
    take: MAX_RECORDS,
    select: {
      id: true,
      description: true,
      amount: true,
      date: true,
      dueDate: true,
      paidAt: true,
      status: true,
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      account: { select: { name: true } },
      safra: { select: { name: true } },
    },
  })

  return {
    ...totals,
    expenses: expenses.map((expense) => ({ ...expense, amount: toNumber(expense.amount) })),
  }
}

async function getOverdueExpenses(companyId: string) {
  const today = startOfToday()
  const expenses = await prisma.expense.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: { in: ['PENDING', 'OVERDUE'] },
      OR: [{ status: 'OVERDUE' }, { dueDate: { lt: today } }],
    },
    orderBy: [{ dueDate: 'asc' }, { date: 'asc' }],
    take: MAX_RECORDS,
    select: {
      id: true,
      description: true,
      amount: true,
      date: true,
      dueDate: true,
      paidAt: true,
      status: true,
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      account: { select: { name: true } },
      safra: { select: { name: true } },
    },
  })

  return {
    count: expenses.length,
    total: summarizeList(expenses),
    expenses: expenses.map((expense) => ({ ...expense, amount: toNumber(expense.amount) })),
  }
}

async function getExpensesDueNextDays(companyId: string, days = 7) {
  const start = startOfToday()
  const end = addDays(start, days + 1)
  const expenses = await prisma.expense.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: { in: ['PENDING', 'OVERDUE'] },
      OR: [
        { dueDate: { gte: start, lt: end } },
        { dueDate: null, date: { gte: start, lt: end } },
      ],
    },
    orderBy: [{ dueDate: 'asc' }, { date: 'asc' }],
    take: MAX_RECORDS,
    select: {
      id: true,
      description: true,
      amount: true,
      date: true,
      dueDate: true,
      paidAt: true,
      status: true,
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      account: { select: { name: true } },
      safra: { select: { name: true } },
    },
  })

  return {
    days,
    count: expenses.length,
    total: summarizeList(expenses),
    expenses: expenses.map((expense) => ({ ...expense, amount: toNumber(expense.amount) })),
  }
}

async function getExpensesSummary(companyId: string) {
  const { start, end } = currentMonthRange()
  const [paid, pending, overdue] = await Promise.all([
    prisma.expense.aggregate({ where: { companyId, deletedAt: null, status: 'PAID', date: { gte: start, lt: end } }, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where: { companyId, deletedAt: null, status: 'PENDING', date: { gte: start, lt: end } }, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where: { companyId, deletedAt: null, status: 'OVERDUE', date: { gte: start, lt: end } }, _sum: { amount: true }, _count: { id: true } }),
  ])

  return {
    period: { start, end },
    paid: { count: paid._count.id, total: toNumber(paid._sum.amount) },
    pending: { count: pending._count.id, total: toNumber(pending._sum.amount) },
    overdue: { count: overdue._count.id, total: toNumber(overdue._sum.amount) },
  }
}

async function getPaidExpenses(companyId: string) {
  const { start, end } = currentMonthRange()
  const expenses = await prisma.expense.findMany({
    where: { companyId, deletedAt: null, status: 'PAID', date: { gte: start, lt: end } },
    orderBy: [{ paidAt: 'desc' }, { date: 'desc' }],
    take: MAX_RECORDS,
    select: {
      id: true,
      description: true,
      amount: true,
      date: true,
      dueDate: true,
      paidAt: true,
      status: true,
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      account: { select: { name: true } },
      safra: { select: { name: true } },
    },
  })

  return {
    period: { start, end },
    count: expenses.length,
    total: summarizeList(expenses),
    expenses: expenses.map((expense) => ({ ...expense, amount: toNumber(expense.amount) })),
  }
}

async function getExpensesByCategory(companyId: string) {
  const { start, end } = currentMonthRange()
  const expenses = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: {
      companyId,
      deletedAt: null,
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
    _count: { id: true },
  })
  const categories = await prisma.category.findMany({
    where: { companyId, id: { in: expenses.map((expense) => expense.categoryId) } },
    select: { id: true, name: true },
  })
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

  return {
    period: { start, end },
    data: expenses
      .map((expense) => ({
        categoryId: expense.categoryId,
        categoryName: categoryNameById.get(expense.categoryId) ?? 'Sem categoria',
        total: toNumber(expense._sum.amount),
        count: expense._count.id,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, MAX_RECORDS),
  }
}

async function getCurrentFinancialPosition(companyId: string) {
  return DashboardService.live(companyId)
}

export async function executeAssistantTool(companyId: string, rawCall: AssistantToolCall) {
  const call = normalizeToolCall(rawCall)

  switch (call.tool) {
    case 'getUpcomingBills':
      return {
        data: await getUpcomingBills(companyId, call.args?.days),
        sources: [{ label: 'Boletos', route: '/bills' }],
      }
    case 'getPendingBills':
      return {
        data: await getPendingBills(companyId),
        sources: [{ label: 'Boletos', route: '/bills' }],
      }
    case 'getOverdueBills':
      return {
        data: await getOverdueBills(companyId),
        sources: [{ label: 'Boletos vencidos', route: '/bills' }],
      }
    case 'getPayablesNextDays':
      return {
        data: await getPayablesNextDays(companyId, call.args?.days),
        sources: [
          { label: 'Dashboard', route: '/dashboard' },
          { label: 'Boletos', route: '/bills' },
        ],
      }
    case 'getPayablesSummary':
      return {
        data: await getPayablesSummary(companyId),
        sources: [
          { label: 'Boletos', route: '/bills' },
          { label: 'Despesas', route: '/expenses' },
        ],
      }
    case 'getReceivablesNextDays':
      return {
        data: await getReceivablesNextDays(companyId, call.args?.days),
        sources: [{ label: 'Receitas', route: '/revenues' }],
      }
    case 'getCashflowForecast':
      return {
        data: await getCashflowForecast(companyId, call.args?.months),
        sources: [{ label: 'Fluxo projetado', route: '/cashflow/forecast' }],
      }
    case 'getSafras':
      return {
        data: await getSafras(companyId, call.args?.search),
        sources: [{ label: 'Safras', route: '/safras' }],
      }
    case 'getActiveSafras':
      return {
        data: await getActiveSafras(companyId),
        sources: [{ label: 'Safras', route: '/safras' }],
      }
    case 'getSafraSummary':
      return {
        data: await getSafraSummary(companyId, call.args?.search),
        sources: [{ label: 'Relatório por Safra', route: '/reports/safras' }],
      }
    case 'getSafrasWithFinancialSummary':
      return {
        data: await getSafrasWithFinancialSummary(companyId, call.args?.search),
        sources: [{ label: 'Relatório por Safra', route: '/reports/safras' }],
      }
    case 'getPendingExpenses':
      return {
        data: await getPendingExpenses(companyId),
        sources: [{ label: 'Despesas', route: '/expenses' }],
      }
    case 'getOverdueExpenses':
      return {
        data: await getOverdueExpenses(companyId),
        sources: [{ label: 'Despesas vencidas', route: '/expenses' }],
      }
    case 'getExpensesDueNextDays':
      return {
        data: await getExpensesDueNextDays(companyId, call.args?.days),
        sources: [{ label: 'Despesas', route: '/expenses' }],
      }
    case 'getExpensesSummary':
      return {
        data: await getExpensesSummary(companyId),
        sources: [{ label: 'Despesas', route: '/expenses' }],
      }
    case 'getPaidExpenses':
      return {
        data: await getPaidExpenses(companyId),
        sources: [{ label: 'Despesas pagas', route: '/expenses' }],
      }
    case 'getExpensesByCategory':
      return {
        data: await getExpensesByCategory(companyId),
        sources: [{ label: 'Despesas', route: '/expenses' }],
      }
    case 'getCurrentFinancialPosition':
      return {
        data: await getCurrentFinancialPosition(companyId),
        sources: [{ label: 'Dashboard', route: '/dashboard' }],
      }
  }
}

export function mergeSources(sources: AssistantSource[]) {
  const seen = new Set<string>()
  return sources.filter((source) => {
    const key = `${source.label}:${source.route ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
