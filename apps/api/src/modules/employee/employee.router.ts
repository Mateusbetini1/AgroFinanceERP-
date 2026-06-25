import { Router } from 'express'
import { EmployeeService } from './employee.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesSchema,
  employeeParamsSchema,
  type ListEmployeesQuery,
} from './employee.schemas'

export const employeeRouter = Router()

employeeRouter.use(authenticate)
employeeRouter.use(requireCompany)

// GET /api/v1/employees
employeeRouter.get(
  '/',
  anyMember,
  validate(listEmployeesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await EmployeeService.listEmployees(
      req.company!.id,
      req.query as unknown as ListEmployeesQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/employees
employeeRouter.post(
  '/',
  financialAccess,
  validate(createEmployeeSchema),
  asyncHandler(async (req, res) => {
    const employee = await EmployeeService.createEmployee(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: employee })
  }),
)

// GET /api/v1/employees/:id
employeeRouter.get(
  '/:id',
  anyMember,
  validate(employeeParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const employee = await EmployeeService.getEmployeeById(req.company!.id, req.params.id)
    res.json({ success: true, data: employee })
  }),
)

// PATCH /api/v1/employees/:id
employeeRouter.patch(
  '/:id',
  financialAccess,
  validate(employeeParamsSchema, 'params'),
  validate(updateEmployeeSchema),
  asyncHandler(async (req, res) => {
    const employee = await EmployeeService.updateEmployee(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: employee })
  }),
)

// DELETE /api/v1/employees/:id
employeeRouter.delete(
  '/:id',
  financialAccess,
  validate(employeeParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await EmployeeService.deleteEmployee(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
