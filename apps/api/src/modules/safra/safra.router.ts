import { Router } from 'express'
import { MembershipRole } from '@agrofinance/database'
import { SafraService } from './safra.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, authorize } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createSafraSchema,
  updateSafraSchema,
  listSafrasSchema,
  safraParamsSchema,
  type ListSafrasQuery,
} from './safra.schemas'

export const safraRouter = Router()

const safraWriteAccess = authorize([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.FINANCIAL,
  MembershipRole.AGRONOMIST,
])

const safraDeleteAccess = authorize([MembershipRole.OWNER, MembershipRole.ADMIN])

safraRouter.use(authenticate)
safraRouter.use(requireCompany)

// GET /api/v1/safras
safraRouter.get(
  '/',
  anyMember,
  validate(listSafrasSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await SafraService.list(
      req.company!.id,
      req.query as unknown as ListSafrasQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/safras
safraRouter.post(
  '/',
  safraWriteAccess,
  validate(createSafraSchema),
  asyncHandler(async (req, res) => {
    const safra = await SafraService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: safra })
  }),
)

// GET /api/v1/safras/:id
safraRouter.get(
  '/:id',
  anyMember,
  validate(safraParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const safra = await SafraService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: safra })
  }),
)

// PATCH /api/v1/safras/:id
safraRouter.patch(
  '/:id',
  safraWriteAccess,
  validate(safraParamsSchema, 'params'),
  validate(updateSafraSchema),
  asyncHandler(async (req, res) => {
    const safra = await SafraService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: safra })
  }),
)

// DELETE /api/v1/safras/:id
safraRouter.delete(
  '/:id',
  safraDeleteAccess,
  validate(safraParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await SafraService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
