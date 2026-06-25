import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import type { CreateCompanyDto, UpdateCompanyDto, InviteMemberDto } from './company.schemas'

export const CompanyService = {
  // Criar empresa e vincular criador como OWNER
  async create(userId: string, data: CreateCompanyDto) {
    if (data.document) {
      const existing = await prisma.company.findUnique({
        where: { document: data.document },
        select: { id: true },
      })
      if (existing) {
        throw AppError.conflict('Já existe uma empresa com este CNPJ/CPF')
      }
    }

    const company = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.name,
          document: data.document,
          email: data.email,
          phone: data.phone,
        },
      })

      await tx.membership.create({
        data: {
          companyId: company.id,
          userId,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      })

      return company
    })

    return company
  },

  async findById(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        document: true,
        email: true,
        phone: true,
        logoUrl: true,
        planTier: true,
        active: true,
        createdAt: true,
      },
    })
    if (!company) throw AppError.notFound('Empresa')
    return company
  },

  async update(companyId: string, data: UpdateCompanyDto) {
    return prisma.company.update({
      where: { id: companyId },
      data,
      select: {
        id: true,
        name: true,
        document: true,
        email: true,
        phone: true,
        updatedAt: true,
      },
    })
  },

  async listMembers(companyId: string) {
    return prisma.membership.findMany({
      where: { companyId, active: true },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })
  },

  // Convidar usuário existente para a empresa
  async inviteMember(companyId: string, data: InviteMemberDto) {
    const targetUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    })

    if (!targetUser) {
      throw AppError.notFound('Usuário com este email')
    }

    const existing = await prisma.membership.findUnique({
      where: { companyId_userId: { companyId, userId: targetUser.id } },
    })

    if (existing?.active) {
      throw AppError.conflict('Usuário já é membro desta empresa')
    }

    // Re-ativar se existia e estava inativo
    if (existing) {
      return prisma.membership.update({
        where: { id: existing.id },
        data: { active: true, role: data.role, joinedAt: new Date() },
      })
    }

    return prisma.membership.create({
      data: {
        companyId,
        userId: targetUser.id,
        role: data.role,
        joinedAt: new Date(),
      },
    })
  },

  async removeMember(companyId: string, memberUserId: string, requestingUserId: string) {
    if (memberUserId === requestingUserId) {
      throw AppError.badRequest('Você não pode remover a si mesmo')
    }

    const membership = await prisma.membership.findUnique({
      where: { companyId_userId: { companyId, userId: memberUserId } },
    })

    if (!membership) throw AppError.notFound('Membro')
    if (membership.role === 'OWNER') {
      throw AppError.forbidden('Não é possível remover o proprietário da empresa')
    }

    return prisma.membership.update({
      where: { id: membership.id },
      data: { active: false },
    })
  },
}
