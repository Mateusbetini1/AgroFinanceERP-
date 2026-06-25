import { Router } from 'express'
import { ExpenseService } from './expense.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  expenseParamsSchema,
  type ListExpensesQuery,
} from './expense.schemas'

export const expenseRouter = Router()

expenseRouter.use(authenticate)
expenseRouter.use(requireCompany)

// GET /api/v1/expenses
expenseRouter.get(
  '/',
  anyMember,
  validate(listExpensesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await ExpenseService.list(
      req.company!.id,
      req.query as unknown as ListExpensesQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/expenses
expenseRouter.post(
  '/',
  financialAccess,
  validate(createExpenseSchema),
  asyncHandler(async (req, res) => {
    const expense = await ExpenseService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: expense })
  }),
)

// GET /api/v1/expenses/:id
expenseRouter.get(
  '/:id',
  anyMember,
  validate(expenseParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const expense = await ExpenseService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: expense })
  }),
)

// PATCH /api/v1/expenses/:id
expenseRouter.patch(
  '/:id',
  financialAccess,
  validate(expenseParamsSchema, 'params'),
  validate(updateExpenseSchema),
  asyncHandler(async (req, res) => {
    const expense = await ExpenseService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: expense })
  }),
)

// DELETE /api/v1/expenses/:id
expenseRouter.delete(
  '/:id',
  financialAccess,
  validate(expenseParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await ExpenseService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
