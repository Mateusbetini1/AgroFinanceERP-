import { Router } from 'express'
import { AuthService } from './auth.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import { registerSchema, loginSchema, refreshSchema } from './auth.schemas'

export const authRouter = Router()

// POST /api/v1/auth/register
authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const user = await AuthService.register(req.body)
    res.status(201).json({ success: true, data: user })
  }),
)

// POST /api/v1/auth/login
authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body)
    res.json({ success: true, data: result })
  }),
)

// POST /api/v1/auth/refresh
authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await AuthService.refresh(req.body.refreshToken)
    res.json({ success: true, data: result })
  }),
)

// POST /api/v1/auth/logout
authRouter.post(
  '/logout',
  authenticate,
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    await AuthService.logout(req.body.refreshToken)
    res.json({ success: true, message: 'Logout realizado com sucesso' })
  }),
)

// GET /api/v1/auth/me
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await AuthService.me(req.user!.id)
    res.json({ success: true, data: user })
  }),
)
