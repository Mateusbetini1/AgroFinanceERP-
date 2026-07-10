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
    IN_PROGRESS: 'Em andamento',
    RECEIVED: 'Recebido',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
  }

  return labels[status] ?? status
}

export function formatSafraStatus(status: string | null | undefined): string {
  if (!status) return '-'

  const labels: Record<string, string> = {
    PLANNED: 'Planejada',
    ACTIVE: 'Ativa',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
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
    G: 'g',
    BOX: 'Caixa',
    UNIT: 'Unidade',
    BAG: 'Saca',
    L: 'Litro',
    ML: 'ml',
    TON: 'Tonelada',
    LITER: 'Litro',
    METER: 'Metro',
    HECTARE: 'Hectare',
  }

  return labels[unit] ?? unit
}

export function formatSupplyCategory(category: string | null | undefined): string {
  if (!category) return '-'

  const labels: Record<string, string> = {
    DEFENSIVE: 'Defensivo',
    FERTILIZER: 'Fertilizante',
    SEED: 'Semente',
    SUBSTRATE: 'Substrato',
    PACKAGING: 'Embalagem',
    FUEL: 'Combustível',
    OTHER: 'Outro',
  }

  return labels[category] ?? category
}

export function formatInputStockMovementType(type: string | null | undefined): string {
  if (!type) return '-'

  const labels: Record<string, string> = {
    PURCHASE: 'Compra',
    APPLICATION: 'Aplicação',
    ADJUSTMENT_IN: 'Ajuste entrada',
    ADJUSTMENT_OUT: 'Ajuste saída',
  }

  return labels[type] ?? type
}

export function formatInputStockMovementDirection(direction: string | null | undefined): string {
  if (!direction) return '-'
  return direction === 'IN' ? 'Entrada' : direction === 'OUT' ? 'Saída' : direction
}

export function formatFarmLocationType(type: string | null | undefined): string {
  if (!type) return '-'

  const labels: Record<string, string> = {
    GREENHOUSE: 'Estufa',
    PLOT: 'Talhão',
    FIELD: 'Campo/Área',
  }

  return labels[type] ?? type
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
  const responseStatus =
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response
      ? Number(error.response.status)
      : null

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
  if (responseStatus === 403) return 'Você não tem permissão para executar esta ação.'
  if (responseStatus === 409) return 'Não foi possível concluir a ação porque existem vínculos ou dependências.'
  if (responseStatus === 422) return 'Verifique os campos informados e tente novamente.'
  if (responseStatus === null && error && typeof error === 'object' && 'request' in error) {
    return 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.'
  }
  return fallback
}
