import { Pencil, Power } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatDecimal, formatFarmLocationType, formatStatusLabel } from '@/lib/utils'
import type { FarmLocation } from '@/types/api'

export function FarmLocationsTable({
  farmLocations,
  deactivatingId,
  onEdit,
  onDeactivate,
}: {
  farmLocations: FarmLocation[]
  deactivatingId?: string | null
  onEdit: (farmLocation: FarmLocation) => void
  onDeactivate: (farmLocation: FarmLocation) => void
}) {
  const actions = (location: FarmLocation) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(location)}>
        <Pencil className="h-4 w-4" />
        Editar
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        loading={deactivatingId === location.id}
        disabled={!location.active}
        onClick={() => onDeactivate(location)}
      >
        <Power className="h-4 w-4" />
        Desativar
      </Button>
    </div>
  )

  const columns: DataTableColumn<FarmLocation>[] = [
    { header: 'Nome', cell: (location) => <span className="font-medium">{location.name}</span> },
    { header: 'Tipo', cell: (location) => formatFarmLocationType(location.type) },
    { header: 'Área', cell: (location) => formatDecimal(location.area, 2) },
    { header: 'Observações', cell: (location) => location.notes ?? '-' },
    {
      header: 'Status',
      cell: (location) => (
        <Badge variant={location.active ? 'success' : 'muted'}>
          {formatStatusLabel(location.active ? 'ACTIVE' : 'INACTIVE')}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: actions,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={farmLocations}
      getRowKey={(location) => location.id}
      mobileCard={(location) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{location.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatFarmLocationType(location.type)}</p>
            </div>
            <Badge variant={location.active ? 'success' : 'muted'}>
              {formatStatusLabel(location.active ? 'ACTIVE' : 'INACTIVE')}
            </Badge>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Área</p>
            <p className="mt-1 text-lg font-semibold tracking-normal">{formatDecimal(location.area, 2)}</p>
          </div>

          {actions(location)}
        </div>
      )}
    />
  )
}
