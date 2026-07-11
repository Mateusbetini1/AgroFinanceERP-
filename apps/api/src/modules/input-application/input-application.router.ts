import { Router } from 'express'
import { MembershipRole } from '@agrofinance/database'
import { authenticate } from '../../shared/middleware/authenticate'
import { anyMember, authorize } from '../../shared/middleware/authorize'
import { requireCompany } from '../../shared/middleware/require-company'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import { InputApplicationService } from './input-application.service'
import {
  createInputApplicationSchema,
  inputApplicationParamsSchema,
  listInputApplicationsSchema,
  type ListInputApplicationsQuery,
} from './input-application.schemas'

export const inputApplicationRouter = Router()

const inputApplicationWriteAccess = authorize([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.FINANCIAL,
  MembershipRole.AGRONOMIST,
])

inputApplicationRouter.use(authenticate)
inputApplicationRouter.use(requireCompany)

// GET /api/v1/input-applications
inputApplicationRouter.get(
  '/',
  anyMember,
  validate(listInputApplicationsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await InputApplicationService.list(
      req.company!.id,
      req.query as unknown as ListInputApplicationsQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/input-applications
inputApplicationRouter.post(
  '/',
  inputApplicationWriteAccess,
  validate(createInputApplicationSchema),
  asyncHandler(async (req, res) => {
    const application = await InputApplicationService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: application })
  }),
)

// GET /api/v1/input-applications/:id
inputApplicationRouter.get(
  '/:id',
  anyMember,
  validate(inputApplicationParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const application = await InputApplicationService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: application })
  }),
)
