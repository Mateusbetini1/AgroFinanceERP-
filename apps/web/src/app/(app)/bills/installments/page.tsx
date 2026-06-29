'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { listSuppliers } from '@/features/suppliers/api'
import { getBillGroup, listBillGroups } from '@/features/bills/groups/api'
import { BillGroupDetailPanel } from '@/features/bills/groups/components/bill-group-detail'
import { BillGroupsTable } from '@/features/bills/groups/components/bill-groups-table'
import type { BillGroupFilters, BillGroupStatus, BillGroupSummary } from '@/features/bills/groups/types'
import { getApiErrorMessage } from '@/lib/utils'

const statusOptions: Array<{ value: BillGroupStatus; label: string }> = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'PAID', label: 'Pago' },
  { value: 'OVERDUE', label: 'Vencido' },
]

export default function BillInstallmentsPage() {
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [status, setStatus] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<BillGroupSummary | null>(null)

  const filters: BillGroupFilters = {
    page: 1,
    limit: 50,
    search,
    supplierId: supplierId || undefined,
    status: status ? (status as BillGroupStatus) : undefined,
  }

  const groupsQuery = useQuery({
    queryKey: ['bill-groups', filters],
    queryFn: () => listBillGroups(filters),
  })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const detailQuery = useQuery({
    queryKey: ['bill-groups', selectedGroup?.id],
    queryFn: () => getBillGroup(selectedGroup!.id),
    enabled: Boolean(selectedGroup),
  })

  const groups = groupsQuery.data?.data ?? []
  const suppliers = suppliersQuery.data?.data ?? []

  function clearFilters() {
    setSearch('')
    setSupplierId('')
    setStatus('')
    setSelectedGroup(null)
  }

  function selectGroup(group: BillGroupSummary) {
    setSelectedGroup(group)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Parcelamentos</h1>
          <p className="text-sm text-muted-foreground">
            Visualize compras parceladas criadas em boletos como um conjunto.
          </p>
        </div>
      </div>

      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Esta visao agrupa parcelas criadas em Boletos. Edicao, pagamento e exclusao continuam sendo feitos em cada
        parcela individual.
      </p>

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="bill-group-search">Busca</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="bill-group-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Descricao do parcelamento"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-group-supplier">Fornecedor</Label>
            <Select
              id="bill-group-supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              disabled={suppliersQuery.isLoading}
            >
              <option value="">Todos</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-group-status">Status</Label>
            <Select id="bill-group-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {groupsQuery.isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Spinner className="h-5 w-5 text-primary" />
            Carregando parcelamentos...
          </CardContent>
        </Card>
      )}

      {groupsQuery.isError && (
        <InlineAlert tone="error">{getApiErrorMessage(groupsQuery.error)}</InlineAlert>
      )}

      {!groupsQuery.isLoading && !groupsQuery.isError && groups.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Nenhum parcelamento encontrado.</CardContent>
        </Card>
      )}

      {!groupsQuery.isLoading && !groupsQuery.isError && groups.length > 0 && (
        <Card>
          <BillGroupsTable groups={groups} selectedId={selectedGroup?.id} onSelect={selectGroup} />
        </Card>
      )}

      {selectedGroup && detailQuery.isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Spinner className="h-5 w-5 text-primary" />
            Carregando detalhes...
          </CardContent>
        </Card>
      )}

      {selectedGroup && detailQuery.isError && (
        <InlineAlert tone="error">{getApiErrorMessage(detailQuery.error)}</InlineAlert>
      )}

      {detailQuery.data && <BillGroupDetailPanel detail={detailQuery.data} />}
    </div>
  )
}
