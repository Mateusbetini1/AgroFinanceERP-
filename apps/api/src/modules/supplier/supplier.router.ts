import { Router } from 'express'
import { SupplierService } from './supplier.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess, adminOnly } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersSchema,
  supplierParamsSchema,
  type ListSuppliersQuery,
} from './supplier.schemas'

export const supplierRouter = Router()

supplierRouter.use(authenticate)
supplierRouter.use(requireCompany)

// GET /api/v1/suppliers
supplierRouter.get(
  '/',
  anyMember,
  validate(listSuppliersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await SupplierService.list(
      req.company!.id,
      req.query as unknown as ListSuppliersQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/suppliers
supplierRouter.post(
  '/',
  financialAccess,
  validate(createSupplierSchema),
  asyncHandler(async (req, res) => {
    const supplier = await SupplierService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: supplier })
  }),
)

// GET /api/v1/suppliers/:id
supplierRouter.get(
  '/:id',
  anyMember,
  validate(supplierParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const supplier = await SupplierService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: supplier })
  }),
)

// PATCH /api/v1/suppliers/:id
supplierRouter.patch(
  '/:id',
  financialAccess,
  validate(supplierParamsSchema, 'params'),
  validate(updateSupplierSchema),
  asyncHandler(async (req, res) => {
    const supplier = await SupplierService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: supplier })
  }),
)

// DELETE /api/v1/suppliers/:id
supplierRouter.delete(
  '/:id',
  adminOnly,
  validate(supplierParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await SupplierService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
