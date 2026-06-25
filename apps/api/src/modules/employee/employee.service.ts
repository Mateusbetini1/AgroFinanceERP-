import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateEmployeeDto, UpdateEmployeeDto, ListEmployeesQuery } from './employee.schemas'

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  role: true,
  document: true,
  phone: true,
  pixKey: true,
  baseSalary: true,
  type: true,
  status: true,
  hireDate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

async function checkDocumentConflict(
  companyId: string,
  document: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.employee.findFirst({
    where: {
      companyId,
      document,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (conflict) {
    throw AppError.conflict('Ja existe um funcionario ativo com este CPF')
  }
}

export const EmployeeService = {
  async listEmployees(companyId: string, query: ListEmployeesQuery) {
    const { page, limit, search, status, type } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { role: { contains: search, mode: 'insensitive' as const } },
              { document: { contains: search } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: EMPLOYEE_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.employee.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async getEmployeeById(companyId: string, id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
      select: EMPLOYEE_SELECT,
    })

    if (!employee) throw AppError.notFound('Funcionario')
    return employee
  },

  async createEmployee(companyId: string, data: CreateEmployeeDto, req: Request) {
    if (data.document) {
      await checkDocumentConflict(companyId, data.document)
    }

    const employee = await prisma.employee.create({
      data: { ...data, companyId },
      select: EMPLOYEE_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: employee.id,
      after: employee,
    })

    return employee
  },

  async updateEmployee(companyId: string, id: string, data: UpdateEmployeeDto, req: Request) {
    const existing = await EmployeeService.getEmployeeById(companyId, id)

    if (data.document && data.document !== existing.document) {
      await checkDocumentConflict(companyId, data.document, id)
    }

    const updated = await prisma.employee.update({
      where: { id },
      data,
      select: EMPLOYEE_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Employee',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async deleteEmployee(companyId: string, id: string, req: Request) {
    const existing = await EmployeeService.getEmployeeById(companyId, id)

    await prisma.employee.update({
      where: { id },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Employee',
      entityId: id,
      before: existing,
    })
  },
}
