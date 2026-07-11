import { Router } from 'express'
import { MembershipRole } from '@agrofinance/database'
import { InputPurchaseService } from './input-purchase.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, authorize } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  cancelInputPurchaseSchema,
  createInputPurchaseSchema,
  inputPurchaseParamsSchema,
  listInputPurchasesSchema,
  type ListInputPurchasesQuery,
} from './input-purchase.schemas'

export const inputPurchaseRouter = Router()

const inputPurchaseWriteAccess = authorize([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.FINANCIAL,
  MembershipRole.AGRONOMIST,
])

inputPurchaseRouter.use(authenticate)
inputPurchaseRouter.use(requireCompany)

// GET /api/v1/input-purchases
inputPurchaseRouter.get(
  '/',
  anyMember,
  validate(listInputPurchasesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await InputPurchaseService.list(
      req.company!.id,
      req.query as unknown as ListInputPurchasesQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/input-purchases
inputPurchaseRouter.post(
  '/',
  inputPurchaseWriteAccess,
  validate(createInputPurchaseSchema),
  asyncHandler(async (req, res) => {
    const purchase = await InputPurchaseService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: purchase })
  }),
)

// PATCH /api/v1/input-purchases/:id/cancel
inputPurchaseRouter.patch(
  '/:id/cancel',
  inputPurchaseWriteAccess,
  validate(inputPurchaseParamsSchema, 'params'),
  validate(cancelInputPurchaseSchema),
  asyncHandler(async (req, res) => {
    const purchase = await InputPurchaseService.cancel(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: purchase })
  }),
)

// GET /api/v1/input-purchases/:id
inputPurchaseRouter.get(
  '/:id',
  anyMember,
  validate(inputPurchaseParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const purchase = await InputPurchaseService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: purchase })
  }),
)
