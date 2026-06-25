import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineAlertProps {
  tone?: 'success' | 'error'
  children: React.ReactNode
}

export function InlineAlert({ tone = 'error', children }: InlineAlertProps) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border px-3 py-2 text-sm',
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-destructive/20 bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
