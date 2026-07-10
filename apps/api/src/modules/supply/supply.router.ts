import { Router } from 'express'
import { MembershipRole } from '@agrofinance/database'
import { SupplyService } from './supply.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, authorize } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createSupplySchema,
  updateSupplySchema,
  listSuppliesSchema,
  supplyParamsSchema,
  type ListSuppliesQuery,
} from './supply.schemas'

export const supplyRouter = Router()

const supplyWriteAccess = authorize([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.FINANCIAL,
  MembershipRole.AGRONOMIST,
])

const supplyDeleteAccess = authorize([MembershipRole.OWNER, MembershipRole.ADMIN])

supplyRouter.use(authenticate)
supplyRouter.use(requireCompany)

// GET /api/v1/supplies
supplyRouter.get(
  '/',
  anyMember,
  validate(listSuppliesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await SupplyService.list(
      req.company!.id,
      req.query as unknown as ListSuppliesQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/supplies
supplyRouter.post(
  '/',
  supplyWriteAccess,
  validate(createSupplySchema),
  asyncHandler(async (req, res) => {
    const supply = await SupplyService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: supply })
  }),
)

// GET /api/v1/supplies/:id
supplyRouter.get(
  '/:id',
  anyMember,
  validate(supplyParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const supply = await SupplyService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: supply })
  }),
)

// PATCH /api/v1/supplies/:id
supplyRouter.patch(
  '/:id',
  supplyWriteAccess,
  validate(supplyParamsSchema, 'params'),
  validate(updateSupplySchema),
  asyncHandler(async (req, res) => {
    const supply = await SupplyService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: supply })
  }),
)

// DELETE /api/v1/supplies/:id
supplyRouter.delete(
  '/:id',
  supplyDeleteAccess,
  validate(supplyParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await SupplyService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
