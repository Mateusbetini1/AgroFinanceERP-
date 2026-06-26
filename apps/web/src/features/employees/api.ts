import { api } from '@/lib/api'
import type { ApiResponse, Employee, EmployeeStatus, EmployeeType, PaginatedResponse } from '@/types/api'

export interface EmployeePayload {
  name?: string
  role?: string
  document?: string | null
  phone?: string | null
  pixKey?: string | null
  baseSalary?: number
  type?: EmployeeType
  status?: EmployeeStatus
  hireDate?: string
  notes?: string | null
}

function cleanCreateEmployeePayload(payload: EmployeePayload): EmployeePayload {
  const clean: EmployeePayload = {
    name: payload.name,
    role: payload.role,
    baseSalary: payload.baseSalary,
    type: payload.type,
    hireDate: payload.hireDate,
  }

  if (payload.status && payload.status !== 'ACTIVE') clean.status = payload.status
  if (payload.document) clean.document = payload.document
  if (payload.phone) clean.phone = payload.phone
  if (payload.pixKey) clean.pixKey = payload.pixKey
  if (payload.notes) clean.notes = payload.notes

  return clean
}

function cleanUpdateEmployeePayload(payload: EmployeePayload): EmployeePayload {
  const clean: EmployeePayload = {}

  for (const [key, value] of Object.entries(payload) as Array<[keyof EmployeePayload, EmployeePayload[keyof EmployeePayload]]>) {
    if (value === undefined || value === '') continue

    if (value === null) {
      if (key === 'document' || key === 'phone' || key === 'pixKey' || key === 'notes') {
        clean[key] = value
      }
      continue
    }

    clean[key] = value as never
  }

  return clean
}

export async function listEmployees() {
  const { data } = await api.get<PaginatedResponse<Employee>>('/employees')
  return data
}

export async function listActiveEmployees() {
  const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
    params: { status: 'ACTIVE' },
  })
  return data
}

export async function createEmployee(payload: EmployeePayload) {
  const { data } = await api.post<ApiResponse<Employee>>('/employees', cleanCreateEmployeePayload(payload))
  return data.data
}

export async function updateEmployee(id: string, payload: EmployeePayload) {
  const { data } = await api.patch<ApiResponse<Employee>>(`/employees/${id}`, cleanUpdateEmployeePayload(payload))
  return data.data
}

export async function deleteEmployee(id: string) {
  await api.delete(`/employees/${id}`)
}
