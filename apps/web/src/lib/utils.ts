import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatDecimal(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '-'
  return Number(value).toFixed(decimals)
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return '-'

  const labels: Record<string, string> = {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    PENDING: 'Pendente',
    RECEIVED: 'Recebido',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
  }

  return labels[status] ?? status
}

export function formatAccountType(type: string | null | undefined): string {
  if (!type) return '-'
  return type === 'CASH' ? 'Caixa' : type === 'BANK' ? 'Banco' : type
}

export function formatUnit(unit: string | null | undefined): string {
  if (!unit) return '-'

  const labels: Record<string, string> = {
    KG: 'kg',
    BOX: 'Caixa',
    UNIT: 'Unidade',
    BAG: 'Saca',
    TON: 'Tonelada',
    LITER: 'Litro',
    METER: 'Metro',
    HECTARE: 'Hectare',
  }

  return labels[unit] ?? unit
}

export function getApiErrorMessage(error: unknown, fallback = 'Erro inesperado. Tente novamente.'): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data
  ) {
    return String((error.response.data as { message: string }).message)
  }
  return fallback
}
