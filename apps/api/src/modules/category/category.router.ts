import { Router } from 'express'
import { CategoryService } from './category.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess, adminOnly } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
  categoryParamsSchema,
  type ListCategoriesQuery,
} from './category.schemas'

export const categoryRouter = Router()

categoryRouter.use(authenticate)
categoryRouter.use(requireCompany)

// GET /api/v1/categories
categoryRouter.get(
  '/',
  anyMember,
  validate(listCategoriesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await CategoryService.list(
      req.company!.id,
      req.query as unknown as ListCategoriesQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// POST /api/v1/categories
categoryRouter.post(
  '/',
  financialAccess,
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await CategoryService.create(req.company!.id, req.body, req)
    res.status(201).json({ success: true, data: category })
  }),
)

// GET /api/v1/categories/:id
categoryRouter.get(
  '/:id',
  anyMember,
  validate(categoryParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const category = await CategoryService.findById(req.company!.id, req.params.id)
    res.json({ success: true, data: category })
  }),
)

// PATCH /api/v1/categories/:id
categoryRouter.patch(
  '/:id',
  financialAccess,
  validate(categoryParamsSchema, 'params'),
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await CategoryService.update(
      req.company!.id,
      req.params.id,
      req.body,
      req,
    )
    res.json({ success: true, data: category })
  }),
)

// DELETE /api/v1/categories/:id
categoryRouter.delete(
  '/:id',
  adminOnly,
  validate(categoryParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await CategoryService.delete(req.company!.id, req.params.id, req)
    res.status(204).send()
  }),
)
