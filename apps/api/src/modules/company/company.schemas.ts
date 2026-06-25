import { z } from 'zod'
import { cpfCnpjSchema, brazilianPhoneSchema } from '@agrofinance/shared'
import { MembershipRole } from '@agrofinance/database'

export const createCompanySchema = z.object({
  name: z.string().min(2).max(200),
  document: cpfCnpjSchema,
  email: z.string().email().optional(),
  phone: brazilianPhoneSchema,
})

export const updateCompanySchema = createCompanySchema.partial()

// OWNER não pode ser atribuído via convite — é exclusivo do criador da empresa.
const assignableRoles = Object.values(MembershipRole).filter(
  (r) => r !== MembershipRole.OWNER,
) as [MembershipRole, ...MembershipRole[]]

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(assignableRoles),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(assignableRoles),
})

export type CreateCompanyDto = z.infer<typeof createCompanySchema>
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>
