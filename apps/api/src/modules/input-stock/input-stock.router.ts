import { Router } from 'express'
import { InputStockService } from './input-stock.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  listInputStockMovementsSchema,
  listInputStockSchema,
  type ListInputStockMovementsQuery,
  type ListInputStockQuery,
} from './input-stock.schemas'

export const inputStockRouter = Router()

inputStockRouter.use(authenticate)
inputStockRouter.use(requireCompany)

// GET /api/v1/input-stock
inputStockRouter.get(
  '/',
  anyMember,
  validate(listInputStockSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await InputStockService.listBalances(
      req.company!.id,
      req.query as unknown as ListInputStockQuery,
    )
    res.json({ success: true, ...result })
  }),
)

// GET /api/v1/input-stock/movements
inputStockRouter.get(
  '/movements',
  anyMember,
  validate(listInputStockMovementsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await InputStockService.listMovements(
      req.company!.id,
      req.query as unknown as ListInputStockMovementsQuery,
    )
    res.json({ success: true, ...result })
  }),
)
