import { Router } from 'express'
import { RevenueService } from './revenue.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createRevenueSchema,
  updateRevenueSchema,
  listRevenuesSchema,
  revenueParamsSchema,
  type ListRevenuesQuery,
} from './revenue.schemas'

export const revenueRouter = Router()

revenueRouter.use(authenticate)
revenueRouter.use(requireCompany)

// GET /api/v1/revenues
revenueRouter.get(
  '/',
  anyMember,
  validate(listRevenuesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await RevenueService.list(
      req.company!.id,
      req.query as unknown as ListRevenuesQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/revenues
revenueRouter.post(
  '/',
  financialAccess,
  validate(createRevenueSchema),
  asyncHandler(async (req, res) => {
    const revenue = await RevenueService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: revenue })
  }),
)

// GET /api/v1/revenues/:id
revenueRouter.get(
  '/:id',
  anyMember,
  validate(revenueParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const revenue = await RevenueService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: revenue })
  }),
)

// PATCH /api/v1/revenues/:id
revenueRouter.patch(
  '/:id',
  financialAccess,
  validate(revenueParamsSchema, 'params'),
  validate(updateRevenueSchema),
  asyncHandler(async (req, res) => {
    const revenue = await RevenueService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: revenue })
  }),
)

// DELETE /api/v1/revenues/:id
revenueRouter.delete(
  '/:id',
  financialAccess,
  validate(revenueParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await RevenueService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
