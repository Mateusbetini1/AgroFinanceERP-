import { Button } from '@/components/ui/button'

interface ListPaginationProps {
  page: number
  limit: number
  total: number
  totalPages: number
  isFetching?: boolean
  itemLabel: string
  onPageChange: (page: number) => void
}

export function ListPagination({
  page,
  limit,
  total,
  totalPages,
  isFetching = false,
  itemLabel,
  onPageChange,
}: ListPaginationProps) {
  if (total <= 0) return null

  const firstItem = (page - 1) * limit + 1
  const lastItem = Math.min(page * limit, total)
  const canGoPrevious = page > 1
  const canGoNext = page < totalPages

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        Mostrando {firstItem}-{lastItem} de {total} {itemLabel}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoPrevious || isFetching}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoNext || isFetching}
          onClick={() => onPageChange(page + 1)}
        >
          Proxima
        </Button>
      </div>
    </div>
  )
}
