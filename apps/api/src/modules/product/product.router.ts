import { Router } from 'express'
import { ProductService } from './product.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess, adminOnly } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  productParamsSchema,
  type ListProductsQuery,
} from './product.schemas'

export const productRouter = Router()

productRouter.use(authenticate)
productRouter.use(requireCompany)

// GET /api/v1/products
productRouter.get(
  '/',
  anyMember,
  validate(listProductsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await ProductService.list(
      req.company!.id,
      req.query as unknown as ListProductsQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/products
productRouter.post(
  '/',
  financialAccess,
  validate(createProductSchema),
  asyncHandler(async (req, res) => {
    const product = await ProductService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: product })
  }),
)

// GET /api/v1/products/:id
productRouter.get(
  '/:id',
  anyMember,
  validate(productParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const product = await ProductService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: product })
  }),
)

// PATCH /api/v1/products/:id
productRouter.patch(
  '/:id',
  financialAccess,
  validate(productParamsSchema, 'params'),
  validate(updateProductSchema),
  asyncHandler(async (req, res) => {
    const product = await ProductService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: product })
  }),
)

// DELETE /api/v1/products/:id
productRouter.delete(
  '/:id',
  adminOnly,
  validate(productParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await ProductService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
