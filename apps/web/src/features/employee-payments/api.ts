import { api } from '@/lib/api'
import type { ApiResponse, EmployeePayment, PaginatedResponse, PaymentType } from '@/types/api'

export interface EmployeePaymentPayload {
  employeeId?: string
  accountId?: string | null
  type?: PaymentType
  amount?: number
  date?: string
  referenceMonth?: number
  referenceYear?: number
  notes?: string | null
}

function cleanCreateEmployeePaymentPayload(payload: EmployeePaymentPayload): EmployeePaymentPayload {
  const clean: EmployeePaymentPayload = {
    employeeId: payload.employeeId,
    type: payload.type,
    amount: payload.amount,
    date: payload.date,
    referenceMonth: payload.referenceMonth,
    referenceYear: payload.referenceYear,
  }

  if (payload.accountId) clean.accountId = payload.accountId
  if (payload.notes) clean.notes = payload.notes

  return clean
}

function cleanUpdateEmployeePaymentPayload(payload: EmployeePaymentPayload): EmployeePaymentPayload {
  const clean: EmployeePaymentPayload = {}

  for (const [key, value] of Object.entries(payload) as Array<
    [keyof EmployeePaymentPayload, EmployeePaymentPayload[keyof EmployeePaymentPayload]]
  >) {
    if (value === undefined || value === '') continue

    if (value === null) {
      if (key === 'accountId' || key === 'notes') clean[key] = value
      continue
    }

    clean[key] = value as never
  }

  return clean
}

export async function listEmployeePayments() {
  const { data } = await api.get<PaginatedResponse<EmployeePayment>>('/employee-payments')
  return data
}

export async function createEmployeePayment(payload: EmployeePaymentPayload) {
  const { data } = await api.post<ApiResponse<EmployeePayment>>(
    '/employee-payments',
    cleanCreateEmployeePaymentPayload(payload),
  )
  return data.data
}

export async function updateEmployeePayment(id: string, payload: EmployeePaymentPayload) {
  const { data } = await api.patch<ApiResponse<EmployeePayment>>(
    `/employee-payments/${id}`,
    cleanUpdateEmployeePaymentPayload(payload),
  )
  return data.data
}

export async function deleteEmployeePayment(id: string) {
  await api.delete(`/employee-payments/${id}`)
}
