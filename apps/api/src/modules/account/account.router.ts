import { Router } from 'express'
import { AccountService } from './account.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createAccountSchema,
  updateAccountSchema,
  listAccountsSchema,
  accountParamsSchema,
  type ListAccountsQuery,
} from './account.schemas'

export const accountRouter = Router()

accountRouter.use(authenticate)
accountRouter.use(requireCompany)

// GET /api/v1/accounts
accountRouter.get(
  '/',
  anyMember,
  validate(listAccountsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await AccountService.list(
      req.company!.id,
      req.query as unknown as ListAccountsQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/accounts
accountRouter.post(
  '/',
  financialAccess,
  validate(createAccountSchema),
  asyncHandler(async (req, res) => {
    const account = await AccountService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: account })
  }),
)

// GET /api/v1/accounts/:id
accountRouter.get(
  '/:id',
  anyMember,
  validate(accountParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const account = await AccountService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: account })
  }),
)

// PATCH /api/v1/accounts/:id
accountRouter.patch(
  '/:id',
  financialAccess,
  validate(accountParamsSchema, 'params'),
  validate(updateAccountSchema),
  asyncHandler(async (req, res) => {
    const account = await AccountService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: account })
  }),
)

// DELETE /api/v1/accounts/:id
accountRouter.delete(
  '/:id',
  financialAccess,
  validate(accountParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await AccountService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
