import { Router } from 'express'
import { TransferService } from './transfer.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createTransferSchema,
  updateTransferSchema,
  listTransfersSchema,
  transferParamsSchema,
  type ListTransfersQuery,
} from './transfer.schemas'

export const transferRouter = Router()

transferRouter.use(authenticate)
transferRouter.use(requireCompany)

// GET /api/v1/transfers
transferRouter.get(
  '/',
  anyMember,
  validate(listTransfersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await TransferService.listTransfers(
      req.company!.id,
      req.query as unknown as ListTransfersQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/transfers
transferRouter.post(
  '/',
  financialAccess,
  validate(createTransferSchema),
  asyncHandler(async (req, res) => {
    const transfer = await TransferService.createTransfer(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: transfer })
  }),
)

// GET /api/v1/transfers/:id
transferRouter.get(
  '/:id',
  anyMember,
  validate(transferParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const transfer = await TransferService.getTransferById(req.company!.id, req.params.id)
    res.json({ success: true, data: transfer })
  }),
)

// PATCH /api/v1/transfers/:id
transferRouter.patch(
  '/:id',
  financialAccess,
  validate(transferParamsSchema, 'params'),
  validate(updateTransferSchema),
  asyncHandler(async (req, res) => {
    const transfer = await TransferService.updateTransfer(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: transfer })
  }),
)

// DELETE /api/v1/transfers/:id
transferRouter.delete(
  '/:id',
  financialAccess,
  validate(transferParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await TransferService.deleteTransfer(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
