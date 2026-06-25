import { Router } from 'express'
import { ReportService } from './report.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  revenueReportSchema,
  expenseReportSchema,
  billReportSchema,
  safraReportSchema,
  cashflowReportSchema,
  accountsReportSchema,
  type RevenueReportQuery,
  type ExpenseReportQuery,
  type BillReportQuery,
  type SafraReportQuery,
  type CashflowReportQuery,
  type AccountsReportQuery,
} from './report.schemas'

export const reportRouter = Router()

reportRouter.use(authenticate)
reportRouter.use(requireCompany)

type ReportResult =
  | { format: 'csv'; content: string; count: number; data?: undefined }
  | { format: 'json'; data: unknown[]; count: number; content?: undefined }

function sendReport(res: import('express').Response, result: ReportResult, filename: string) {
  if (result.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"')
    res.send(result.content)
  } else {
    res.json({ success: true, count: result.count, data: result.data })
  }
}

// GET /api/v1/reports/revenues
reportRouter.get(
  '/revenues',
  anyMember,
  validate(revenueReportSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await ReportService.revenues(
      req.company!.id,
      req.query as unknown as RevenueReportQuery,
    )
    sendReport(res, result, 'receitas-' + Date.now() + '.csv')
  }),
)

// GET /api/v1/reports/expenses
reportRouter.get(
  '/expenses',
  anyMember,
  validate(expenseReportSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await ReportService.expenses(
      req.company!.id,
      req.query as unknown as ExpenseReportQuery,
    )
    sendReport(res, result, 'despesas-' + Date.now() + '.csv')
  }),
)

// GET /api/v1/reports/bills
reportRouter.get(
  '/bills',
  anyMember,
  validate(billReportSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await ReportService.bills(
      req.company!.id,
      req.query as unknown as BillReportQuery,
    )
    sendReport(res, result, 'boletos-' + Date.now() + '.csv')
  }),
)

// GET /api/v1/reports/safras
reportRouter.get(
  '/safras',
  anyMember,
  validate(safraReportSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await ReportService.safras(
      req.company!.id,
      req.query as unknown as SafraReportQuery,
    )
    res.json({ success: true, count: result.count, data: result.data })
  }),
)

// GET /api/v1/reports/cashflow
reportRouter.get(
  '/cashflow',
  anyMember,
  validate(cashflowReportSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await ReportService.cashflow(
      req.company!.id,
      req.query as unknown as CashflowReportQuery,
    )
    res.json({ success: true, count: result.count, data: result.data })
  }),
)

// GET /api/v1/reports/accounts
reportRouter.get(
  '/accounts',
  anyMember,
  validate(accountsReportSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await ReportService.accounts(
      req.company!.id,
      req.query as unknown as AccountsReportQuery,
    )
    res.json({ success: true, count: result.count, data: result.data })
  }),
)
