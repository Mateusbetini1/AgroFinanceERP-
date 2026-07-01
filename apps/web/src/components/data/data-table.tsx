import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DataTableColumn<T> = {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  mobileCard?: (row: T) => ReactNode
}

export function DataTable<T>({ columns, data, getRowKey, mobileCard }: DataTableProps<T>) {
  return (
    <>
      {mobileCard && (
        <div className="divide-y md:hidden">
          {data.map((row) => (
            <div key={getRowKey(row)} className="p-4">
              {mobileCard(row)}
            </div>
          ))}
        </div>
      )}

      <div className={cn('overflow-x-auto', mobileCard && 'hidden md:block')}>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
              {columns.map((column) => (
                <th key={column.header} className={cn('px-4 py-3', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={getRowKey(row)} className="border-b last:border-0 hover:bg-muted/30">
                {columns.map((column) => (
                  <td key={column.header} className={cn('px-4 py-3 align-middle', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
