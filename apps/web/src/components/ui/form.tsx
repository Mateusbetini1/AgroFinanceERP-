import type { ReactNode } from 'react'
import { Button } from './button'

export const formControlClass = 'min-h-11 text-base sm:text-sm'
export const formTextareaClass = 'min-h-[96px] text-base sm:text-sm'

export function RequiredMark() {
  return <span className="ml-1 text-destructive">*</span>
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null
  return <p className="text-xs leading-snug text-destructive">{message}</p>
}

export function OptionalSection({ children, title = 'Mais detalhes' }: { children: ReactNode; title?: string }) {
  return (
    <details className="rounded-md border bg-muted/20 p-3 open:bg-background">
      <summary className="cursor-pointer text-sm font-medium text-foreground">{title}</summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  )
}

export function FormActions({
  isSubmitting,
  onCancel,
  submitLabel = 'Salvar',
}: {
  isSubmitting?: boolean
  onCancel: () => void
  submitLabel?: string
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" className="min-h-11 w-full sm:w-auto" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </div>
  )
}
