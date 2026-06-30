import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import type {
  RevenueReportQuery,
  ExpenseReportQuery,
  BillReportQuery,
  SafraReportQuery,
  CashflowReportQuery,
  AccountsReportQuery,
} from './report.schemas'

function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

function formatDecimal(value: unknown): string {
  if (value === null || value === undefined) return ''
  return Number(value).toFixed(2)
}

function buildCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string): string =>
    v.includes(',') || v.includes('"') || v.includes('\r') || v.includes('\n')
      ? '"' + v.replace(/"/g, '""') + '"'
      : v

  const lines = [headers, ...rows].map((row) => row.map(escape).join(','))
  return lines.join('\r\n')
}

function dateBounds(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined
  return {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  }
}

function cashDateFallbackWhere(primaryField: string, fallbackField: string, bounds?: ReturnType<typeof dateBounds>) {
  if (!bounds) return {}
  return {
    OR: [
      { [primaryField]: bounds },
      { [primaryField]: null, [fallbackField]: bounds },
    ],
  }
}

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

function addToBucket(map: Map<string, number>, key: string, amount: unknown): void {
  map.set(key, (map.get(key) ?? 0) + toNumber(amount))
}

function perEstimatedUnit(value: number, estimatedYield: unknown): number | null {
  const yieldValue = toNumber(estimatedYield)
  if (!Number.isFinite(yieldValue) || yieldValue <= 0) return null
  return value / yieldValue
}

function emptyReport(format: 'json' | 'csv') {
  if (format === 'csv') return { format: 'csv' as const, content: '', count: 0 }
  return { format: 'json' as const, data: [], count: 0 }
}

const REVENUE_REPORT_SELECT = {
  id: true,
  date: true,
  receivedAt: true,
  product: { select: { id: true, name: true } },
  safra: { select: { id: true, name: true } },
  account: { select: { id: true, name: true } },
  client: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  status: true,
  notes: true,
} as const

export const ReportService = {
  async revenues(companyId: string, query: RevenueReportQuery) {
    const { dateFrom, dateTo, status, productId, safraId, accountId, basis } = query

    if (basis === 'cash' && status && status !== 'RECEIVED') {
      return emptyReport(query.format)
    }

    const bounds = dateBounds(dateFrom, dateTo)
    const data = await prisma.revenue.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(basis === 'cash' ? { status: 'RECEIVED' } : status ? { status } : {}),
        ...(productId ? { productId } : {}),
        ...(safraId ? { safraId } : {}),
        ...(accountId ? { accountId } : {}),
        ...(basis === 'cash'
          ? cashDateFallbackWhere('receivedAt', 'date', bounds)
          : bounds
            ? { date: bounds }
            : {}),
      },
      select: REVENUE_REPORT_SELECT,
      orderBy: basis === 'cash' ? [{ receivedAt: 'desc' }, { date: 'desc' }] : { date: 'desc' },
    })

    if (query.format === 'csv') {
      const headers = [
        'ID', 'Data', 'Produto', 'Cliente', 'Quantidade', 'Preco Unitario',
        'Total', 'Status', 'Recebido Em', 'Conta', 'Safra', 'Observacoes',
      ]
      const rows = data.map((r) => [
        r.id,
        formatDate(r.date),
        r.product.name,
        r.client ?? '',
        formatDecimal(r.quantity),
        formatDecimal(r.unitPrice),
        formatDecimal(r.totalAmount),
        r.status,
        formatDate(r.receivedAt),
        r.account?.name ?? '',
        r.safra?.name ?? '',
        r.notes ?? '',
      ])
      return { format: 'csv' as const, content: buildCsv(headers, rows), count: data.length }
    }

    return { format: 'json' as const, data, count: data.length }
  },

  async expenses(companyId: string, query: ExpenseReportQuery) {
    const { dateFrom, dateTo, status, categoryId, supplierId, safraId, accountId, basis } = query

    if (basis === 'cash' && status && status !== 'PAID') {
      return emptyReport(query.format)
    }

    const bounds = dateBounds(dateFrom, dateTo)
    const data = await prisma.expense.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(basis === 'cash' ? { status: 'PAID' } : status ? { status } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(safraId ? { safraId } : {}),
        ...(accountId ? { accountId } : {}),
        ...(basis === 'cash'
          ? cashDateFallbackWhere('paidAt', 'date', bounds)
          : bounds
            ? { date: bounds }
            : {}),
      },
      select: {
        id: true,
        date: true,
        dueDate: true,
        paidAt: true,
        description: true,
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        safra: { select: { id: true, name: true } },
        amount: true,
        status: true,
        attachmentUrl: true,
      },
      orderBy: basis === 'cash' ? [{ paidAt: 'desc' }, { date: 'desc' }] : { date: 'desc' },
    })

    if (query.format === 'csv') {
      const headers = [
        'ID', 'Data', 'Descricao', 'Categoria', 'Fornecedor', 'Valor',
        'Status', 'Vencimento', 'Pago Em', 'Conta', 'Safra',
      ]
      const rows = data.map((e) => [
        e.id,
        formatDate(e.date),
        e.description,
        e.category.name,
        e.supplier?.name ?? '',
        formatDecimal(e.amount),
        e.status,
        formatDate(e.dueDate),
        formatDate(e.paidAt),
        e.account?.name ?? '',
        e.safra?.name ?? '',
      ])
      return { format: 'csv' as const, content: buildCsv(headers, rows), count: data.length }
    }

    return { format: 'json' as const, data, count: data.length }
  },

  async bills(companyId: string, query: BillReportQuery) {
    const { dateFrom, dateTo, status, categoryId, supplierId, safraId, accountId, basis } = query

    if (basis === 'cash' && status && status !== 'PAID') {
      return emptyReport(query.format)
    }

    const bounds = dateBounds(dateFrom, dateTo)
    const data = await prisma.bill.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(basis === 'cash' ? { status: 'PAID' } : status ? { status } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(safraId ? { safraId } : {}),
        ...(accountId ? { accountId } : {}),
        ...(basis === 'cash'
          ? cashDateFallbackWhere('paidAt', 'dueDate', bounds)
          : bounds
            ? { dueDate: bounds }
            : {}),
      },
      select: {
        id: true,
        dueDate: true,
        paidAt: true,
        description: true,
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        safra: { select: { id: true, name: true } },
        amount: true,
        status: true,
        installmentNumber: true,
        installmentCount: true,
      },
      orderBy: basis === 'cash' ? [{ paidAt: 'desc' }, { dueDate: 'desc' }] : { dueDate: 'asc' },
    })

    if (query.format === 'csv') {
      const headers = [
        'ID', 'Descricao', 'Categoria', 'Fornecedor', 'Valor', 'Vencimento', 'Status',
        'Pago Em', 'Conta', 'Safra', 'Parcela', 'Total Parcelas',
      ]
      const rows = data.map((b) => [
        b.id,
        b.description,
        b.category?.name ?? '',
        b.supplier?.name ?? '',
        formatDecimal(b.amount),
        formatDate(b.dueDate),
        b.status,
        formatDate(b.paidAt),
        b.account?.name ?? '',
        b.safra?.name ?? '',
        b.installmentNumber !== null ? String(b.installmentNumber) : '',
        b.installmentCount !== null ? String(b.installmentCount) : '',
      ])
      return { format: 'csv' as const, content: buildCsv(headers, rows), count: data.length }
    }

    return { format: 'json' as const, data, count: data.length }
  },

  async safras(companyId: string, query: SafraReportQuery) {
    const bounds = dateBounds(query.dateFrom, query.dateTo)
    const safras = await prisma.safra.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(query.safraId ? { id: query.safraId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.farmLocationId ? { farmLocationId: query.farmLocationId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
        ...(bounds ? { startDate: bounds } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        estimatedYield: true,
        product: { select: { id: true, name: true, unit: true } },
        farmLocation: { select: { id: true, name: true, type: true } },
      },
      orderBy: { startDate: 'desc' },
    })

    const safraIds = safras.map((safra) => safra.id)
    if (safraIds.length === 0) return { data: [], count: 0 }

    const [revenues, expenses, bills] = await Promise.all([
      prisma.revenue.findMany({
        where: { companyId, deletedAt: null, safraId: { in: safraIds } },
        select: { safraId: true, status: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: { companyId, deletedAt: null, safraId: { in: safraIds } },
        select: { safraId: true, status: true, amount: true },
      }),
      prisma.bill.findMany({
        where: { companyId, deletedAt: null, safraId: { in: safraIds } },
        select: { safraId: true, status: true, amount: true },
      }),
    ])

    const receivedRevenueBySafra = new Map<string, number>()
    const pendingRevenueBySafra = new Map<string, number>()
    const paidExpensesBySafra = new Map<string, number>()
    const pendingExpensesBySafra = new Map<string, number>()
    const paidBillsBySafra = new Map<string, number>()
    const pendingBillsBySafra = new Map<string, number>()

    for (const revenue of revenues) {
      if (!revenue.safraId) continue
      if (revenue.status === 'RECEIVED') addToBucket(receivedRevenueBySafra, revenue.safraId, revenue.totalAmount)
      if (revenue.status === 'PENDING') addToBucket(pendingRevenueBySafra, revenue.safraId, revenue.totalAmount)
    }

    for (const expense of expenses) {
      if (!expense.safraId) continue
      if (expense.status === 'PAID') addToBucket(paidExpensesBySafra, expense.safraId, expense.amount)
      if (expense.status === 'PENDING' || expense.status === 'OVERDUE') {
        addToBucket(pendingExpensesBySafra, expense.safraId, expense.amount)
      }
    }

    for (const bill of bills) {
      if (!bill.safraId) continue
      if (bill.status === 'PAID') addToBucket(paidBillsBySafra, bill.safraId, bill.amount)
      if (bill.status === 'PENDING' || bill.status === 'OVERDUE') {
        addToBucket(pendingBillsBySafra, bill.safraId, bill.amount)
      }
    }

    const data = safras.map((safra) => {
      const receivedRevenue = receivedRevenueBySafra.get(safra.id) ?? 0
      const pendingRevenue = pendingRevenueBySafra.get(safra.id) ?? 0
      const totalRevenue = receivedRevenue + pendingRevenue
      const paidExpenses = paidExpensesBySafra.get(safra.id) ?? 0
      const pendingExpenses = pendingExpensesBySafra.get(safra.id) ?? 0
      const totalExpenses = paidExpenses + pendingExpenses
      const paidBills = paidBillsBySafra.get(safra.id) ?? 0
      const pendingBills = pendingBillsBySafra.get(safra.id) ?? 0
      const totalBills = paidBills + pendingBills
      const paidCosts = paidExpenses + paidBills
      const pendingCosts = pendingExpenses + pendingBills
      const totalCosts = totalExpenses + totalBills
      const realizedResult = receivedRevenue - paidCosts
      const projectedResult = totalRevenue - totalCosts

      return {
        safraId: safra.id,
        safraName: safra.name,
        product: safra.product,
        farmLocation: safra.farmLocation,
        status: safra.status,
        startDate: safra.startDate,
        endDate: safra.endDate,
        estimatedYield: safra.estimatedYield === null ? null : toNumber(safra.estimatedYield),
        receivedRevenue,
        pendingRevenue,
        totalRevenue,
        paidExpenses,
        pendingExpenses,
        totalExpenses,
        paidBills,
        pendingBills,
        totalBills,
        paidCosts,
        pendingCosts,
        totalCosts,
        realizedResult,
        projectedResult,
        costPerEstimatedUnit: perEstimatedUnit(totalCosts, safra.estimatedYield),
        revenuePerEstimatedUnit: perEstimatedUnit(totalRevenue, safra.estimatedYield),
        resultPerEstimatedUnit: perEstimatedUnit(projectedResult, safra.estimatedYield),
        revenueTotal: totalRevenue,
        expenseTotal: totalExpenses,
        result: projectedResult,
      }
    })

    return { data, count: data.length }
  },

  async safraDetail(companyId: string, id: string) {
    const list = await ReportService.safras(companyId, { safraId: id })
    const summary = list.data[0]
    if (!summary) throw AppError.notFound('Safra')

    const [expenses, revenues, bills] = await Promise.all([
      prisma.expense.findMany({
        where: { companyId, deletedAt: null, safraId: id },
        select: {
          id: true,
          date: true,
          dueDate: true,
          paidAt: true,
          description: true,
          amount: true,
          status: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.revenue.findMany({
        where: { companyId, deletedAt: null, safraId: id },
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
        orderBy: { date: 'desc' },
      }),
      prisma.bill.findMany({
        where: { companyId, deletedAt: null, safraId: id },
        select: {
          id: true,
          dueDate: true,
          paidAt: true,
          description: true,
          amount: true,
          status: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'desc' },
      }),
    ])

    const costsByCategoryMap = new Map<string, {
      categoryId: string | null
      categoryName: string
      expenseAmount: number
      billAmount: number
      paidAmount: number
      pendingAmount: number
      totalAmount: number
    }>()

    for (const expense of expenses) {
      const current = costsByCategoryMap.get(expense.category.id) ?? {
        categoryId: expense.category.id,
        categoryName: expense.category.name,
        expenseAmount: 0,
        billAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        totalAmount: 0,
      }
      const amount = toNumber(expense.amount)
      current.expenseAmount += amount
      if (expense.status === 'PAID') current.paidAmount += amount
      if (expense.status === 'PENDING' || expense.status === 'OVERDUE') current.pendingAmount += amount
      current.totalAmount += amount
      costsByCategoryMap.set(expense.category.id, current)
    }

    for (const bill of bills) {
      const key = bill.category?.id ?? 'uncategorized-bills'
      const current = costsByCategoryMap.get(key) ?? {
        categoryId: bill.category?.id ?? null,
        categoryName: bill.category?.name ?? 'Sem categoria',
        expenseAmount: 0,
        billAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        totalAmount: 0,
      }
      const amount = toNumber(bill.amount)
      current.billAmount += amount
      if (bill.status === 'PAID') current.paidAmount += amount
      if (bill.status === 'PENDING' || bill.status === 'OVERDUE') current.pendingAmount += amount
      current.totalAmount += amount
      costsByCategoryMap.set(key, current)
    }

    const revenuesByProductClientMap = new Map<string, {
      productId: string
      productName: string
      client: string | null
      receivedAmount: number
      pendingAmount: number
      totalAmount: number
    }>()

    for (const revenue of revenues) {
      const client = revenue.client ?? null
      const key = `${revenue.product.id}:${client ?? ''}`
      const current = revenuesByProductClientMap.get(key) ?? {
        productId: revenue.product.id,
        productName: revenue.product.name,
        client,
        receivedAmount: 0,
        pendingAmount: 0,
        totalAmount: 0,
      }
      const amount = toNumber(revenue.totalAmount)
      if (revenue.status === 'RECEIVED') current.receivedAmount += amount
      if (revenue.status === 'PENDING') current.pendingAmount += amount
      current.totalAmount += amount
      revenuesByProductClientMap.set(key, current)
    }

    const recentMovements = [
      ...revenues.map((revenue) => ({
        id: revenue.id,
        type: 'REVENUE' as const,
        sourceLabel: 'Receita',
        date: revenue.receivedAt ?? revenue.date,
        description: revenue.client ?? revenue.notes ?? revenue.product.name,
        status: revenue.status,
        amount: toNumber(revenue.totalAmount),
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        type: 'EXPENSE' as const,
        sourceLabel: 'Despesa',
        date: expense.paidAt ?? expense.dueDate ?? expense.date,
        description: expense.description,
        status: expense.status,
        amount: toNumber(expense.amount),
      })),
      ...bills.map((bill) => ({
        id: bill.id,
        type: 'BILL' as const,
        sourceLabel: 'Boleto',
        date: bill.paidAt ?? bill.dueDate,
        description: bill.description,
        status: bill.status,
        amount: toNumber(bill.amount),
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20)

    return {
      summary,
      expensesByCategory: Array.from(costsByCategoryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
      costsByCategory: Array.from(costsByCategoryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
      revenuesByProductClient: Array.from(revenuesByProductClientMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
      recentMovements,
    }
  },

  async cashflow(companyId: string, query: CashflowReportQuery) {
    const bounds = dateBounds(query.dateFrom, query.dateTo)

    const [revenues, expenses, bills] = await Promise.all([
      prisma.revenue.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'RECEIVED',
          ...(query.productId ? { productId: query.productId } : {}),
          ...(query.safraId ? { safraId: query.safraId } : {}),
          ...(query.accountId ? { accountId: query.accountId } : {}),
          ...cashDateFallbackWhere('receivedAt', 'date', bounds),
        },
        select: {
          id: true,
          date: true,
          receivedAt: true,
          totalAmount: true,
          client: true,
          notes: true,
          account: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } },
          safra: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.supplierId ? { supplierId: query.supplierId } : {}),
          ...(query.safraId ? { safraId: query.safraId } : {}),
          ...(query.accountId ? { accountId: query.accountId } : {}),
          ...(query.productId ? { safra: { productId: query.productId } } : {}),
          ...cashDateFallbackWhere('paidAt', 'date', bounds),
        },
        select: {
          id: true,
          date: true,
          paidAt: true,
          amount: true,
          description: true,
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          safra: { select: { id: true, name: true } },
        },
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.supplierId ? { supplierId: query.supplierId } : {}),
          ...(query.safraId ? { safraId: query.safraId } : {}),
          ...(query.accountId ? { accountId: query.accountId } : {}),
          ...cashDateFallbackWhere('paidAt', 'dueDate', bounds),
        },
        select: {
          id: true,
          dueDate: true,
          paidAt: true,
          amount: true,
          description: true,
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          safra: { select: { id: true, name: true } },
        },
      }),
    ])

    const data = [
      ...revenues.map((item) => ({
        type: 'INFLOW' as const,
        source: 'REVENUE' as const,
        sourceId: item.id,
        date: item.receivedAt ?? item.date,
        amount: toNumber(item.totalAmount),
        description: item.client ?? item.notes ?? 'Receita',
        account: item.account,
        product: item.product,
        category: null,
        supplier: null,
        safra: item.safra,
      })),
      ...expenses.map((item) => ({
        type: 'OUTFLOW' as const,
        source: 'EXPENSE' as const,
        sourceId: item.id,
        date: item.paidAt ?? item.date,
        amount: toNumber(item.amount),
        description: item.description,
        account: item.account,
        product: null,
        category: item.category,
        supplier: item.supplier,
        safra: item.safra,
      })),
      ...bills.map((item) => ({
        type: 'OUTFLOW' as const,
        source: 'BILL' as const,
        sourceId: item.id,
        date: item.paidAt ?? item.dueDate,
        amount: toNumber(item.amount),
        description: item.description,
        account: item.account,
        product: null,
        category: item.category,
        supplier: item.supplier,
        safra: item.safra,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime())

    return { data, count: data.length }
  },

  async accounts(companyId: string, query: AccountsReportQuery) {
    const bounds = dateBounds(query.dateFrom, query.dateTo)
    const active = query.active ?? true
    const includeDeleted = query.includeDeleted ?? false

    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        ...(query.accountId ? { id: query.accountId } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        currentBalance: true,
        initialBalance: true,
        active: true,
      },
      orderBy: { name: 'asc' },
    })

    const accountIds = accounts.map((account) => account.id)

    const [revenues, expenses, bills] = await Promise.all([
      prisma.revenue.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'RECEIVED',
          accountId: { in: accountIds },
          ...cashDateFallbackWhere('receivedAt', 'date', bounds),
        },
        select: { accountId: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          accountId: { in: accountIds },
          ...cashDateFallbackWhere('paidAt', 'date', bounds),
        },
        select: { accountId: true, amount: true },
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          accountId: { in: accountIds },
          ...cashDateFallbackWhere('paidAt', 'dueDate', bounds),
        },
        select: { accountId: true, amount: true },
      }),
    ])

    const inflows = new Map<string, number>()
    const outflows = new Map<string, number>()

    for (const item of revenues) {
      if (!item.accountId) continue
      inflows.set(item.accountId, (inflows.get(item.accountId) ?? 0) + toNumber(item.totalAmount))
    }

    for (const item of expenses) {
      if (!item.accountId) continue
      outflows.set(item.accountId, (outflows.get(item.accountId) ?? 0) + toNumber(item.amount))
    }

    for (const item of bills) {
      if (!item.accountId) continue
      outflows.set(item.accountId, (outflows.get(item.accountId) ?? 0) + toNumber(item.amount))
    }

    const data = accounts.map((account) => {
      const totalInflows = inflows.get(account.id) ?? 0
      const totalOutflows = outflows.get(account.id) ?? 0
      return {
        id: account.id,
        name: account.name,
        type: account.type,
        currentBalance: toNumber(account.currentBalance),
        initialBalance: toNumber(account.initialBalance),
        active: account.active,
        totalInflows,
        totalOutflows,
        netMovement: totalInflows - totalOutflows,
      }
    })

    return { data, count: data.length }
  },
}
