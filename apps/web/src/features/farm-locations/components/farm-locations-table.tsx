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
  const columns: DataTableColumn<FarmLocation>[] = [
    { header: 'Nome', cell: (location) => <span className="font-medium">{location.name}</span> },
    { header: 'Tipo', cell: (location) => formatFarmLocationType(location.type) },
    { header: 'Area', cell: (location) => formatDecimal(location.area, 2) },
    { header: 'Observacoes', cell: (location) => location.notes ?? '-' },
    {
      header: 'Ativo',
      cell: (location) => (
        <Badge variant={location.active ? 'success' : 'muted'}>
          {formatStatusLabel(location.active ? 'ACTIVE' : 'INACTIVE')}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (location) => (
        <div className="flex justify-end gap-2">
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
      ),
    },
  ]

  return <DataTable columns={columns} data={farmLocations} getRowKey={(location) => location.id} />
}
