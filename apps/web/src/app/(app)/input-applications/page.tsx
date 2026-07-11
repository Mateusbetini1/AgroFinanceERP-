'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListPage } from '@/components/data/list-page'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { Dialog } from '@/components/ui/dialog'
import { listFarmLocations } from '@/features/farm-locations/api'
import { createInputApplication, listInputApplications, type InputApplicationPayload } from '@/features/input-applications/api'
import { InputApplicationForm } from '@/features/input-applications/components/input-application-form'
import { InputApplicationsTable } from '@/features/input-applications/components/input-applications-table'
import { listInputStock } from '@/features/input-stock/api'
import { listSafras } from '@/features/safras/api'
import { listSupplies } from '@/features/supplies/api'
import { getApiErrorMessage } from '@/lib/utils'

export default function InputApplicationsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['input-applications'], queryFn: listInputApplications })
  const suppliesQuery = useQuery({ queryKey: ['supplies'], queryFn: listSupplies })
  const stockQuery = useQuery({ queryKey: ['input-stock'], queryFn: listInputStock })
  const safrasQuery = useQuery({ queryKey: ['safras'], queryFn: listSafras })
  const farmLocationsQuery = useQuery({
    queryKey: ['farm-locations', { active: true }],
    queryFn: () => listFarmLocations({ active: true }),
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const applications = query.data?.data ?? []
  const supplies = suppliesQuery.data?.data ?? []
  const balances = stockQuery.data?.data ?? []
  const safras = safrasQuery.data?.data ?? []
  const farmLocations = farmLocationsQuery.data?.data ?? []

  const createMutation = useMutation({
    mutationFn: createInputApplication,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['input-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['input-stock'] }),
        queryClient.invalidateQueries({ queryKey: ['input-stock-movements'] }),
      ])
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Aplicacao de insumo registrada com sucesso.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) }),
  })

  function openCreate() {
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleSubmit(payload: InputApplicationPayload) {
    createMutation.mutate(payload)
  }

  return (
    <>
      <ListPage
        title="Aplicacoes de Insumos"
        description="Registre o consumo de defensivos, fertilizantes e outros insumos por safra."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={applications.length === 0}
        emptyMessage="Nenhuma aplicacao de insumo registrada."
        errorMessage="Nao foi possivel carregar as aplicacoes de insumos."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
        newLabel="Nova aplicacao"
      >
        <div className="space-y-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}
          <InputApplicationsTable applications={applications} />
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title="Nova aplicacao de insumo"
        description="Informe a safra, a quantidade consumida e o local quando houver."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <InputApplicationForm
            supplies={supplies}
            balances={balances}
            safras={safras}
            farmLocations={farmLocations}
            isSubmitting={
              createMutation.isPending ||
              suppliesQuery.isLoading ||
              stockQuery.isLoading ||
              safrasQuery.isLoading ||
              farmLocationsQuery.isLoading
            }
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
