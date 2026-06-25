import { Router } from 'express'
import { InvoiceService } from './invoice.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesSchema,
  invoiceParamsSchema,
  type ListInvoicesQuery,
} from './invoice.schemas'

export const invoiceRouter = Router()

invoiceRouter.use(authenticate)
invoiceRouter.use(requireCompany)

// GET /api/v1/invoices
invoiceRouter.get(
  '/',
  anyMember,
  validate(listInvoicesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await InvoiceService.list(
      req.company!.id,
      req.query as unknown as ListInvoicesQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/invoices
invoiceRouter.post(
  '/',
  financialAccess,
  validate(createInvoiceSchema),
  asyncHandler(async (req, res) => {
    const invoice = await InvoiceService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: invoice })
  }),
)

// GET /api/v1/invoices/:id
invoiceRouter.get(
  '/:id',
  anyMember,
  validate(invoiceParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const invoice = await InvoiceService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: invoice })
  }),
)

// PATCH /api/v1/invoices/:id
invoiceRouter.patch(
  '/:id',
  financialAccess,
  validate(invoiceParamsSchema, 'params'),
  validate(updateInvoiceSchema),
  asyncHandler(async (req, res) => {
    const invoice = await InvoiceService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: invoice })
  }),
)

// DELETE /api/v1/invoices/:id
invoiceRouter.delete(
  '/:id',
  financialAccess,
  validate(invoiceParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await InvoiceService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
