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
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      return new Intl.DateTimeFormat('pt-BR').format(
        new Date(Number(year), Number(month) - 1, Number(day)),
      )
    }
  }
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return ''
  if (typeof date === 'string') return date.slice(0, 10)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateInputToIso(value: string | null | undefined): string | null {
  if (!value) return null
  return `${value}T12:00:00.000Z`
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

export function formatEmployeeType(type: string | null | undefined): string {
  if (!type) return '-'
  return type === 'MONTHLY' ? 'Mensalista' : type === 'DAILY' ? 'Diarista' : type
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

export function formatPaymentType(type: string | null | undefined): string {
  if (!type) return '-'

  const labels: Record<string, string> = {
    SALARY: 'Salário',
    OVERTIME: 'Hora extra',
    ADVANCE: 'Adiantamento',
    BONUS: 'Bônus',
    DAILY_WAGE: 'Diária',
  }

  return labels[type] ?? type
}

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
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
    const data = error.response.data as { message: string; errors?: Record<string, string[]> }
    if (data.errors && Object.keys(data.errors).length > 0) {
      const details = Object.entries(data.errors)
        .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
        .join(' | ')
      return `${data.message}: ${details}`
    }
    return String(data.message)
  }
  return fallback
}
