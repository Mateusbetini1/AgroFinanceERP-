import { Router } from 'express'
import { EmployeePaymentService } from './employee-payment.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createEmployeePaymentSchema,
  updateEmployeePaymentSchema,
  listEmployeePaymentsSchema,
  employeePaymentParamsSchema,
  type ListEmployeePaymentsQuery,
} from './employee-payment.schemas'

export const employeePaymentRouter = Router()

employeePaymentRouter.use(authenticate)
employeePaymentRouter.use(requireCompany)

// GET /api/v1/employee-payments
employeePaymentRouter.get(
  '/',
  anyMember,
  validate(listEmployeePaymentsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await EmployeePaymentService.list(
      req.company!.id,
      req.query as unknown as ListEmployeePaymentsQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/employee-payments
employeePaymentRouter.post(
  '/',
  financialAccess,
  validate(createEmployeePaymentSchema),
  asyncHandler(async (req, res) => {
    const payment = await EmployeePaymentService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: payment })
  }),
)

// GET /api/v1/employee-payments/:id
employeePaymentRouter.get(
  '/:id',
  anyMember,
  validate(employeePaymentParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const payment = await EmployeePaymentService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: payment })
  }),
)

// PATCH /api/v1/employee-payments/:id
employeePaymentRouter.patch(
  '/:id',
  financialAccess,
  validate(employeePaymentParamsSchema, 'params'),
  validate(updateEmployeePaymentSchema),
  asyncHandler(async (req, res) => {
    const payment = await EmployeePaymentService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: payment })
  }),
)

// DELETE /api/v1/employee-payments/:id
employeePaymentRouter.delete(
  '/:id',
  financialAccess,
  validate(employeePaymentParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await EmployeePaymentService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
