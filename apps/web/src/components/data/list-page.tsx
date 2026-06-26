import { AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

interface ListPageProps {
  title: string
  description: string
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  onRetry: () => void
  onNew?: () => void
  children: React.ReactNode
}

export function ListPage({
  title,
  description,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  onNew,
  children,
}: ListPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" disabled={!onNew} onClick={onNew}>
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Spinner className="h-5 w-5 text-primary" />
            Carregando dados...
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Não foi possível carregar os dados.</p>
            </div>
            <Button type="button" variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && isEmpty && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Nenhum registro encontrado.</CardContent>
        </Card>
      )}

      {!isLoading && !isError && !isEmpty && <Card>{children}</Card>}
    </div>
  )
}
