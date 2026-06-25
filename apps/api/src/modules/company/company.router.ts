import { Router } from 'express'
import { CompanyService } from './company.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { adminOnly } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import {
  createCompanySchema,
  updateCompanySchema,
  inviteMemberSchema,
} from './company.schemas'

export const companyRouter = Router()

// Todas as rotas requerem autenticação
companyRouter.use(authenticate)

// POST /api/v1/companies — Criar empresa (qualquer usuário autenticado)
companyRouter.post(
  '/',
  validate(createCompanySchema),
  asyncHandler(async (req, res) => {
    const company = await CompanyService.create(req.user!.id, req.body)
    res.status(201).json({ success: true, data: company })
  }),
)

// A partir daqui: requer contexto de empresa no header x-company-id
companyRouter.use(requireCompany)

// GET /api/v1/companies/current — Dados da empresa atual
companyRouter.get(
  '/current',
  asyncHandler(async (req, res) => {
    const company = await CompanyService.findById(req.company!.id)
    res.json({ success: true, data: company })
  }),
)

// PUT /api/v1/companies/current — Atualizar empresa (admin+)
companyRouter.put(
  '/current',
  adminOnly,
  validate(updateCompanySchema),
  asyncHandler(async (req, res) => {
    const company = await CompanyService.update(req.company!.id, req.body)
    res.json({ success: true, data: company })
  }),
)

// GET /api/v1/companies/members — Listar membros
companyRouter.get(
  '/members',
  asyncHandler(async (req, res) => {
    const members = await CompanyService.listMembers(req.company!.id)
    res.json({ success: true, data: members })
  }),
)

// POST /api/v1/companies/members — Convidar membro (admin+)
companyRouter.post(
  '/members',
  adminOnly,
  validate(inviteMemberSchema),
  asyncHandler(async (req, res) => {
    const membership = await CompanyService.inviteMember(req.company!.id, req.body)
    res.status(201).json({ success: true, data: membership })
  }),
)

// DELETE /api/v1/companies/members/:userId — Remover membro (admin+)
companyRouter.delete(
  '/members/:userId',
  adminOnly,
  asyncHandler(async (req, res) => {
    await CompanyService.removeMember(
      req.company!.id,
      req.params.userId,
      req.user!.id,
    )
    res.json({ success: true, message: 'Membro removido com sucesso' })
  }),
)
