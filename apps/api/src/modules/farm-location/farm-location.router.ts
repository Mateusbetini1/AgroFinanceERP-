import { Router } from 'express'
import { FarmLocationService } from './farm-location.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createFarmLocationSchema,
  updateFarmLocationSchema,
  listFarmLocationsSchema,
  farmLocationParamsSchema,
  type ListFarmLocationsQuery,
} from './farm-location.schemas'

export const farmLocationRouter = Router()

farmLocationRouter.use(authenticate)
farmLocationRouter.use(requireCompany)

// GET /api/v1/farm-locations
farmLocationRouter.get(
  '/',
  anyMember,
  validate(listFarmLocationsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await FarmLocationService.list(
      req.company!.id,
      req.query as unknown as ListFarmLocationsQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/farm-locations
farmLocationRouter.post(
  '/',
  financialAccess,
  validate(createFarmLocationSchema),
  asyncHandler(async (req, res) => {
    const location = await FarmLocationService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: location })
  }),
)

// GET /api/v1/farm-locations/:id
farmLocationRouter.get(
  '/:id',
  anyMember,
  validate(farmLocationParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const location = await FarmLocationService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: location })
  }),
)

// PATCH /api/v1/farm-locations/:id
farmLocationRouter.patch(
  '/:id',
  financialAccess,
  validate(farmLocationParamsSchema, 'params'),
  validate(updateFarmLocationSchema),
  asyncHandler(async (req, res) => {
    const location = await FarmLocationService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: location })
  }),
)

// DELETE /api/v1/farm-locations/:id
farmLocationRouter.delete(
  '/:id',
  financialAccess,
  validate(farmLocationParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await FarmLocationService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
