'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListPage } from '@/components/data/list-page'
import { listInputStock, listInputStockMovements } from '@/features/input-stock/api'
import { InputStockMovementsTable } from '@/features/input-stock/components/input-stock-movements-table'
import { InputStockTable } from '@/features/input-stock/components/input-stock-table'

export default function InputStockPage() {
  const stockQuery = useQuery({ queryKey: ['input-stock'], queryFn: listInputStock })
  const movementsQuery = useQuery({ queryKey: ['input-stock-movements'], queryFn: listInputStockMovements })
  const balances = stockQuery.data?.data ?? []
  const movements = movementsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <ListPage
        title="Estoque de insumos"
        description="Acompanhe saldo, custo médio e valor em estoque."
        isLoading={stockQuery.isLoading}
        isError={stockQuery.isError}
        isEmpty={balances.length === 0}
        emptyMessage="Nenhum saldo de estoque encontrado. Registre uma compra de insumo para iniciar o estoque."
        errorMessage="Não foi possível carregar o estoque de insumos."
        onRetry={() => void stockQuery.refetch()}
      >
        <InputStockTable balances={balances} />
      </ListPage>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimentações recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movementsQuery.isLoading && (
            <div className="p-4 text-sm text-muted-foreground">Carregando movimentações...</div>
          )}
          {movementsQuery.isError && (
            <div className="p-4 text-sm text-destructive">Não foi possível carregar as movimentações.</div>
          )}
          {!movementsQuery.isLoading && !movementsQuery.isError && movements.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Nenhuma movimentação registrada.</div>
          )}
          {!movementsQuery.isLoading && !movementsQuery.isError && movements.length > 0 && (
            <InputStockMovementsTable movements={movements} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
