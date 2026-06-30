'use client'

import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { listAccounts } from '@/features/accounts/api'
import { listCategories } from '@/features/categories/api'
import { createRecurringBills } from '@/features/bills/api'
import { BillRecurringForm } from '@/features/bills/components/bill-recurring-form'
import { listSafras } from '@/features/safras/api'
import { listSuppliers } from '@/features/suppliers/api'
import { cn, formatDate, getApiErrorMessage } from '@/lib/utils'

export default function RecurringBillsPage() {
  const queryClient = useQueryClient()
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const safrasQuery = useQuery({ queryKey: ['safras'], queryFn: listSafras })

  const mutation = useMutation({
    mutationFn: createRecurringBills,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bills'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['bill-groups'] })
    },
  })

  const suppliers = suppliersQuery.data?.data ?? []
  const accounts = accountsQuery.data?.data ?? []
  const categories = categoriesQuery.data?.data ?? []
  const safras = safrasQuery.data?.data ?? []
  const isLoading = suppliersQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading || safrasQuery.isLoading
  const isError = suppliersQuery.isError || accountsQuery.isError || categoriesQuery.isError || safrasQuery.isError

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Gerar Recorrentes</h1>
          <p className="text-sm text-muted-foreground">
            Gere boletos futuros pendentes em lote, sem salvar regra automática de recorrência.
          </p>
        </div>
        <Link
          href="/bills"
          className={cn(
            'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium',
            'transition-colors hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Boletos
        </Link>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Spinner className="h-5 w-5 text-primary" />
            Carregando campos de apoio...
          </CardContent>
        </Card>
      )}

      {isError && (
        <InlineAlert>Não foi possível carregar fornecedores, categorias, safras e contas. Tente novamente antes de gerar.</InlineAlert>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da recorrência</CardTitle>
          </CardHeader>
          <CardContent>
            <BillRecurringForm
              suppliers={suppliers}
              accounts={accounts}
              categories={categories}
              safras={safras}
              isSubmitting={mutation.isPending}
              onSubmit={(payload) => mutation.mutate(payload)}
            />
          </CardContent>
        </Card>
      )}

      {mutation.isError && <InlineAlert>{getApiErrorMessage(mutation.error)}</InlineAlert>}

      {mutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Criados</p>
                <p className="text-2xl font-semibold">{mutation.data.countCreated}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Ignorados</p>
                <p className="text-2xl font-semibold">{mutation.data.countSkipped}</p>
              </div>
            </div>

            {mutation.data.skipped.length > 0 && (
              <div className="rounded-md border">
                <div className="border-b px-3 py-2 text-sm font-medium">Vencimentos ignorados</div>
                <div className="divide-y">
                  {mutation.data.skipped.map((item) => (
                    <div key={`${item.existingBillId}-${item.dueDate}`} className="px-3 py-2 text-sm">
                      {formatDate(item.dueDate)} - boleto já existente
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/bills"
              className={cn(
                'inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground',
                'transition-colors hover:bg-primary/90',
              )}
            >
              Ver boletos
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
