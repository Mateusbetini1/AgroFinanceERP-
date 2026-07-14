import { Router } from 'express'
import { DashboardService } from './dashboard.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  dashboardQuerySchema,
  cashflowQuerySchema,
  forecastQuerySchema,
  monthlyDashboardQuerySchema,
  operationalSummaryQuerySchema,
  payablesQuerySchema,
  type DashboardQuery,
  type CashflowQuery,
  type ForecastQuery,
  type MonthlyDashboardQuery,
  type OperationalSummaryQuery,
  type PayablesQuery,
} from './dashboard.schemas'

export const dashboardRouter = Router()

dashboardRouter.use(authenticate)
dashboardRouter.use(requireCompany)

// GET /api/v1/dashboard/operational-summary
dashboardRouter.get(
  '/operational-summary',
  anyMember,
  validate(operationalSummaryQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await DashboardService.operationalSummary(
      req.company!.id,
      req.query as unknown as OperationalSummaryQuery,
    )
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/live
dashboardRouter.get(
  '/live',
  anyMember,
  asyncHandler(async (req, res) => {
    const data = await DashboardService.live(req.company!.id)
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/monthly
dashboardRouter.get(
  '/monthly',
  anyMember,
  validate(monthlyDashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as MonthlyDashboardQuery
    const data = await DashboardService.monthly(req.company!.id, query.month, query.year)
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/summary
dashboardRouter.get(
  '/summary',
  anyMember,
  asyncHandler(async (req, res) => {
    const data = await DashboardService.summary(req.company!.id)
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/overview
dashboardRouter.get(
  '/overview',
  anyMember,
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await DashboardService.overview(
      req.company!.id,
      req.query as unknown as DashboardQuery,
    )
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/cashflow
dashboardRouter.get(
  '/cashflow',
  anyMember,
  validate(cashflowQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await DashboardService.cashflow(
      req.company!.id,
      req.query as unknown as CashflowQuery,
    )
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/forecast
dashboardRouter.get(
  '/forecast',
  anyMember,
  validate(forecastQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await DashboardService.forecast(
      req.company!.id,
      req.query as unknown as ForecastQuery,
    )
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/categories
dashboardRouter.get(
  '/categories',
  anyMember,
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await DashboardService.categories(
      req.company!.id,
      req.query as unknown as DashboardQuery,
    )
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/products
dashboardRouter.get(
  '/products',
  anyMember,
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await DashboardService.products(
      req.company!.id,
      req.query as unknown as DashboardQuery,
    )
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/safras
dashboardRouter.get(
  '/safras',
  anyMember,
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await DashboardService.safras(
      req.company!.id,
      req.query as unknown as DashboardQuery,
    )
    res.json({ success: true, data })
  }),
)

// GET /api/v1/dashboard/payables
dashboardRouter.get(
  '/payables',
  anyMember,
  validate(payablesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await DashboardService.payables(
      req.company!.id,
      req.query as unknown as PayablesQuery,
    )
    res.json({ success: true, data })
  }),
)
