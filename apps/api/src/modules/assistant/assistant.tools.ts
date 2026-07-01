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
    count: bills.length,
    total: bills.reduce((sum, bill) => sum + Number(bill.amount), 0),
    bills: bills.map((bill) => ({ ...bill, amount: Number(bill.amount) })),
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
    },
  })

  return {
    count: bills.length,
    total: bills.reduce((sum, bill) => sum + Number(bill.amount), 0),
    bills: bills.map((bill) => ({ ...bill, amount: Number(bill.amount) })),
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
    total: revenues.reduce((sum, revenue) => sum + Number(revenue.totalAmount), 0),
    revenues: revenues.map((revenue) => ({ ...revenue, totalAmount: Number(revenue.totalAmount) })),
  }
}

async function getCashflowForecast(companyId: string, months = 1) {
  return DashboardService.forecast(companyId, { months })
}

async function getSafraSummary(companyId: string, search?: string) {
  const result = await ReportService.safras(companyId, { search })
  return {
    count: result.count,
    data: result.data.slice(0, MAX_RECORDS),
  }
}

async function getExpensesByCategory(companyId: string) {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  const expenses = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: {
      companyId,
      deletedAt: null,
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: MAX_RECORDS,
  })
  const categories = await prisma.category.findMany({
    where: { companyId, id: { in: expenses.map((expense) => expense.categoryId) } },
    select: { id: true, name: true },
  })
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

  return {
    period: { start, end },
    data: expenses.map((expense) => ({
      categoryId: expense.categoryId,
      categoryName: categoryNameById.get(expense.categoryId) ?? 'Sem categoria',
      total: Number(expense._sum.amount ?? 0),
      count: expense._count.id,
    })),
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
    case 'getSafraSummary':
      return {
        data: await getSafraSummary(companyId, call.args?.search),
        sources: [{ label: 'Relatório por Safra', route: '/reports/safras' }],
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
