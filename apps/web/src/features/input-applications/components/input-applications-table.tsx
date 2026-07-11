import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate, formatDecimal, formatUnit } from '@/lib/utils'
import type { InputApplication } from '@/types/api'

function firstAllocation(application: InputApplication) {
  return application.allocations[0] ?? null
}

export function InputApplicationsTable({ applications }: { applications: InputApplication[] }) {
  const columns: DataTableColumn<InputApplication>[] = [
    { header: 'Data', cell: (application) => formatDate(application.applicationDate) },
    { header: 'Insumo', cell: (application) => <span className="font-medium">{application.supply.name}</span> },
    {
      header: 'Quantidade',
      cell: (application) =>
        `${formatDecimal(application.quantityBase, 3)} ${formatUnit(application.supply.baseUnit)}`,
      className: 'text-right',
    },
    { header: 'Safra', cell: (application) => firstAllocation(application)?.safra.name ?? '-' },
    { header: 'Local', cell: (application) => firstAllocation(application)?.farmLocation?.name ?? '-' },
    { header: 'Custo', cell: (application) => formatCurrency(application.totalCost), className: 'text-right' },
    { header: 'Acoes', cell: () => <span className="text-muted-foreground">-</span> },
  ]

  return (
    <DataTable
      columns={columns}
      data={applications}
      getRowKey={(application) => application.id}
      mobileCard={(application) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Data</p>
              <p className="mt-1 font-medium">{formatDate(application.applicationDate)}</p>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(application.totalCost)}</p>
          </div>
          <div>
            <p className="break-words text-sm font-semibold text-foreground">{application.supply.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDecimal(application.quantityBase, 3)} {formatUnit(application.supply.baseUnit)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Safra</p>
            <p className="mt-1 text-sm">{firstAllocation(application)?.safra.name ?? '-'}</p>
          </div>
        </div>
      )}
    />
  )
}
