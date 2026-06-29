import { Router } from 'express'
import { BillService } from './bill.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createBillSchema,
  createBillInstallmentsSchema,
  updateBillSchema,
  listBillsSchema,
  listBillGroupsSchema,
  billParamsSchema,
  type ListBillsQuery,
  type ListBillGroupsQuery,
} from './bill.schemas'

export const billRouter = Router()

billRouter.use(authenticate)
billRouter.use(requireCompany)

// GET /api/v1/bills
billRouter.get(
  '/',
  anyMember,
  validate(listBillsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await BillService.list(
      req.company!.id,
      req.query as unknown as ListBillsQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/bills
billRouter.post(
  '/',
  financialAccess,
  validate(createBillSchema),
  asyncHandler(async (req, res) => {
    const bill = await BillService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: bill })
  }),
)

// POST /api/v1/bills/installments
billRouter.post(
  '/installments',
  financialAccess,
  validate(createBillInstallmentsSchema),
  asyncHandler(async (req, res) => {
    const result = await BillService.createInstallments(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: result })
  }),
)

// GET /api/v1/bills/groups
billRouter.get(
  '/groups',
  anyMember,
  validate(listBillGroupsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await BillService.listGroups(
      req.company!.id,
      req.query as unknown as ListBillGroupsQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// GET /api/v1/bills/groups/:id
billRouter.get(
  '/groups/:id',
  anyMember,
  validate(billParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const group = await BillService.findGroupById(req.company!.id, req.params.id)
    res.json({ success: true, data: group })
  }),
)

// GET /api/v1/bills/:id
billRouter.get(
  '/:id',
  anyMember,
  validate(billParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const bill = await BillService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: bill })
  }),
)

// PATCH /api/v1/bills/:id
billRouter.patch(
  '/:id',
  financialAccess,
  validate(billParamsSchema, 'params'),
  validate(updateBillSchema),
  asyncHandler(async (req, res) => {
    const bill = await BillService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: bill })
  }),
)

// DELETE /api/v1/bills/:id
billRouter.delete(
  '/:id',
  financialAccess,
  validate(billParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await BillService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
