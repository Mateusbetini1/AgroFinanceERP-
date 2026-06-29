'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { listFarmLocations } from '@/features/farm-locations/api'
import { listProducts } from '@/features/products/api'
import { getSafraReportDetail, listSafraReports } from '@/features/reports/safras/api'
import { SafraReportDetail } from '@/features/reports/safras/components/safra-report-detail'
import { SafraReportFilters } from '@/features/reports/safras/components/safra-report-filters'
import { SafraReportSummary } from '@/features/reports/safras/components/safra-report-summary'
import { SafraReportTable } from '@/features/reports/safras/components/safra-report-table'
import type { SafraReportFilters as SafraReportFiltersType, SafraReportSummary as SafraReportSummaryType } from '@/features/reports/safras/types'
import { listSafras } from '@/features/safras/api'
import { getApiErrorMessage } from '@/lib/utils'

export default function SafraReportsPage() {
  const [filters, setFilters] = useState<SafraReportFiltersType>({})
  const [selectedSafraId, setSelectedSafraId] = useState<string | null>(null)

  const reportsQuery = useQuery({
    queryKey: ['reports', 'safras', filters],
    queryFn: () => listSafraReports(filters),
  })
  const detailQuery = useQuery({
    queryKey: ['reports', 'safras', selectedSafraId],
    queryFn: () => getSafraReportDetail(selectedSafraId!),
    enabled: Boolean(selectedSafraId),
  })
  const safrasQuery = useQuery({ queryKey: ['safras'], queryFn: listSafras })
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const farmLocationsQuery = useQuery({
    queryKey: ['farm-locations', { active: true }],
    queryFn: () => listFarmLocations({ active: true }),
  })

  const reports = reportsQuery.data?.data ?? []
  const safras = safrasQuery.data?.data ?? []
  const products = productsQuery.data?.data ?? []
  const farmLocations = farmLocationsQuery.data?.data ?? []

  function handleSelect(item: SafraReportSummaryType) {
    setSelectedSafraId((current) => (current === item.safraId ? null : item.safraId))
  }

  const hasAuxError = safrasQuery.isError || productsQuery.isError || farmLocationsQuery.isError

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Relatorio por Safra</h1>
        <p className="text-sm text-muted-foreground">
          Resultado financeiro por ciclo produtivo, separando realizado e previsto.
        </p>
      </div>

      <InlineAlert tone="success">
        Este relatorio considera receitas e despesas vinculadas diretamente a safra. Boletos, folha e parcelamentos sem
        vinculo com safra nao entram nesta versao.
      </InlineAlert>

      <Card>
        <CardContent className="p-4">
          <SafraReportFilters
            filters={filters}
            safras={safras}
            products={products}
            farmLocations={farmLocations}
            onChange={(nextFilters) => {
              setFilters(nextFilters)
              setSelectedSafraId(null)
            }}
          />
        </CardContent>
      </Card>

      {hasAuxError && (
        <InlineAlert>
          Nao foi possivel carregar todos os filtros de apoio. O relatorio ainda pode ser consultado.
        </InlineAlert>
      )}

      {reportsQuery.isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Spinner className="h-5 w-5 text-primary" />
            Carregando relatorio...
          </CardContent>
        </Card>
      )}

      {reportsQuery.isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{getApiErrorMessage(reportsQuery.error, 'Nao foi possivel carregar o relatorio.')}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void reportsQuery.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!reportsQuery.isLoading && !reportsQuery.isError && (
        <>
          <SafraReportSummary items={reports} />

          <Card>
            <CardContent className="p-0">
              {reports.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Nenhuma safra encontrada para os filtros.</div>
              ) : (
                <SafraReportTable items={reports} selectedId={selectedSafraId} onSelect={handleSelect} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {selectedSafraId && detailQuery.isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Spinner className="h-5 w-5 text-primary" />
            Carregando detalhe da safra...
          </CardContent>
        </Card>
      )}

      {selectedSafraId && detailQuery.isError && (
        <InlineAlert>{getApiErrorMessage(detailQuery.error, 'Nao foi possivel carregar o detalhe da safra.')}</InlineAlert>
      )}

      {detailQuery.data && <SafraReportDetail detail={detailQuery.data} />}
    </div>
  )
}
