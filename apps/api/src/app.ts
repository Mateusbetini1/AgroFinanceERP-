import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import { errorHandler } from './shared/middleware/error-handler'
import { requestLogger } from './shared/middleware/request-logger'

// Routers — importar conforme módulos forem implementados
import { authRouter } from './modules/auth/auth.router'
import { companyRouter } from './modules/company/company.router'
import { productRouter } from './modules/product/product.router'
import { supplyRouter } from './modules/supply/supply.router'
import { inputPurchaseRouter } from './modules/input-purchase/input-purchase.router'
import { inputApplicationRouter } from './modules/input-application/input-application.router'
import { inputStockRouter } from './modules/input-stock/input-stock.router'
import { categoryRouter } from './modules/category/category.router'
import { supplierRouter } from './modules/supplier/supplier.router'
import { accountRouter } from './modules/account/account.router'
import { transferRouter } from './modules/transfer/transfer.router'
import { revenueRouter } from './modules/revenue/revenue.router'
import { expenseRouter } from './modules/expense/expense.router'
import { billRouter } from './modules/bill/bill.router'
import { employeeRouter } from './modules/employee/employee.router'
import { safraRouter } from './modules/safra/safra.router'
import { employeePaymentRouter } from './modules/employee-payment/employee-payment.router'
import { farmLocationRouter } from './modules/farm-location/farm-location.router'
import { dashboardRouter } from './modules/dashboard/dashboard.router'
import { reportRouter } from './modules/report/report.router'
import { invoiceRouter } from './modules/invoice/invoice.router'
import { assistantRouter } from './modules/assistant/assistant.router'
import { notificationRouter } from './modules/notification/notification.router'
// import { farmLocationRouter } from './modules/farm-location/farm-location.router'
// import { dashboardRouter } from './modules/dashboard/dashboard.router'
// import { reportRouter } from './modules/report/report.router'

export function createApp() {
  const app = express()

  // ── Segurança ───────────────────────────────────────────────
  app.use(helmet())
  app.set('trust proxy', 1)
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id', 'x-cron-secret'],
    }),
  )

  // ── Rate limiting global ─────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        code: 'RATE_LIMIT',
        message: 'Muitas requisições. Tente novamente em alguns minutos.',
      },
    }),
  )

  // Rate limit restritivo para endpoints de autenticação
  const authRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10,
    message: {
      success: false,
      code: 'RATE_LIMIT',
      message: 'Muitas tentativas de login. Aguarde 1 minuto.',
    },
  })

  // ── Body parsing ────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // ── Request logging ─────────────────────────────────────────
  app.use(requestLogger)

  // ── Health check ────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    })
  })

  // ── API Routes ──────────────────────────────────────────────
  app.use('/api/v1/auth', authRateLimit, authRouter)
  app.use('/api/v1/companies', companyRouter)
  app.use('/api/v1/products', productRouter)
  app.use('/api/v1/supplies', supplyRouter)
  app.use('/api/v1/input-purchases', inputPurchaseRouter)
  app.use('/api/v1/input-applications', inputApplicationRouter)
  app.use('/api/v1/input-stock', inputStockRouter)
  app.use('/api/v1/categories', categoryRouter)
  app.use('/api/v1/suppliers', supplierRouter)
  app.use('/api/v1/accounts', accountRouter)
  app.use('/api/v1/transfers', transferRouter)
  app.use('/api/v1/revenues', revenueRouter)
  app.use('/api/v1/expenses', expenseRouter)
  app.use('/api/v1/bills', billRouter)
  app.use('/api/v1/employees', employeeRouter)
  app.use('/api/v1/safras', safraRouter)
  app.use('/api/v1/employee-payments', employeePaymentRouter)
  app.use('/api/v1/farm-locations', farmLocationRouter)
  app.use('/api/v1/dashboard', dashboardRouter)
  app.use('/api/v1/reports', reportRouter)
  app.use('/api/v1/invoices', invoiceRouter)
  app.use('/api/v1/assistant', assistantRouter)
  app.use('/api/v1/notifications', notificationRouter)
  // app.use('/api/v1/farm-locations', farmLocationRouter)
  // app.use('/api/v1/dashboard', dashboardRouter)
  // app.use('/api/v1/reports', reportRouter)

  // ── 404 ─────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: `Rota ${req.method} ${req.path} não encontrada`,
    })
  })

  // ── Error handler (deve ser o último middleware) ─────────────
  app.use(errorHandler)

  return app
}
