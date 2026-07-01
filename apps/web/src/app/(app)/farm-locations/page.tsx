'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { ListPage } from '@/components/data/list-page'
import {
  createFarmLocation,
  deleteFarmLocation,
  listFarmLocations,
  updateFarmLocation,
  type FarmLocationPayload,
} from '@/features/farm-locations/api'
import { FarmLocationForm } from '@/features/farm-locations/components/farm-location-form'
import { FarmLocationsTable } from '@/features/farm-locations/components/farm-locations-table'
import { getApiErrorMessage } from '@/lib/utils'
import type { FarmLocation, FarmLocationType } from '@/types/api'

type ActiveFilter = 'true' | 'false'
type TypeFilter = FarmLocationType | ''

function getFarmLocationErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    error.response.status === 403
  ) {
    return 'Você não tem permissão para alterar locais.'
  }

  return getApiErrorMessage(error, fallback)
}

export default function FarmLocationsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<TypeFilter>('')
  const [active, setActive] = useState<ActiveFilter>('true')

  const query = useQuery({
    queryKey: ['farm-locations', { search, type, active }],
    queryFn: () =>
      listFarmLocations({
        search,
        type: type || undefined,
        active: active === 'true',
      }),
  })

  const farmLocations = query.data?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FarmLocation | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['farm-locations'] })
    await queryClient.invalidateQueries({ queryKey: ['safras'] })
  }

  const createMutation = useMutation({
    mutationFn: createFarmLocation,
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setFeedback({ type: 'success', message: 'Local criado com sucesso.' })
    },
    onError: (error) =>
      setFeedback({
        type: 'error',
        message: getFarmLocationErrorMessage(error, 'Não foi possível criar o local.'),
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FarmLocationPayload }) =>
      updateFarmLocation(id, payload),
    onSuccess: async () => {
      await invalidate()
      setDialogOpen(false)
      setEditing(null)
      setFeedback({ type: 'success', message: 'Local atualizado com sucesso.' })
    },
    onError: (error) =>
      setFeedback({
        type: 'error',
        message: getFarmLocationErrorMessage(error, 'Não foi possível atualizar o local.'),
      }),
  })

  const deactivateMutation = useMutation({
    mutationFn: deleteFarmLocation,
    onMutate: (id) => setDeactivatingId(id),
    onSuccess: async () => {
      await invalidate()
      setFeedback({ type: 'success', message: 'Local desativado com sucesso.' })
    },
    onError: (error) =>
      setFeedback({
        type: 'error',
        message: getFarmLocationErrorMessage(
          error,
          'Não foi possível desativar o local. Verifique se há safras vinculadas.',
        ),
      }),
    onSettled: () => setDeactivatingId(null),
  })

  function openCreate() {
    setEditing(null)
    setFeedback(null)
    setDialogOpen(true)
  }

  function openEdit(location: FarmLocation) {
    setEditing(location)
    setFeedback(null)
    setDialogOpen(true)
  }

  function handleDeactivate(location: FarmLocation) {
    if (
      !window.confirm(
        'Desativar local? Ele deixará de aparecer nos selects ativos, mas continuará no histórico.',
      )
    ) {
      return
    }
    deactivateMutation.mutate(location.id)
  }

  function handleSubmit(payload: FarmLocationPayload) {
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  return (
    <>
      <ListPage
        title="Locais"
        description="Locais e áreas da fazenda usados em safras e futuros relatórios por área."
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={false}
        errorMessage="Não foi possível carregar os locais."
        onRetry={() => void query.refetch()}
        onNew={openCreate}
      >
        <div className="space-y-4 p-4">
          {feedback && <InlineAlert tone={feedback.type}>{feedback.message}</InlineAlert>}

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_160px]">
            <div className="space-y-2">
              <Label htmlFor="farm-location-search">Busca por nome</Label>
              <Input
                id="farm-location-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex.: Estufa A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-location-type-filter">Tipo</Label>
              <Select
                id="farm-location-type-filter"
                value={type}
                onChange={(event) => setType(event.target.value as TypeFilter)}
              >
                <option value="">Todos</option>
                <option value="GREENHOUSE">Estufa</option>
                <option value="PLOT">Talhão</option>
                <option value="FIELD">Campo/Área</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-location-active-filter">Status</Label>
              <Select
                id="farm-location-active-filter"
                value={active}
                onChange={(event) => setActive(event.target.value as ActiveFilter)}
              >
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </Select>
            </div>
          </div>

          {farmLocations.length === 0 ? (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              {search || type ? 'Nenhum resultado encontrado para os filtros atuais.' : 'Nenhum local cadastrado.'}
            </div>
          ) : (
            <FarmLocationsTable
              farmLocations={farmLocations}
              deactivatingId={deactivatingId}
              onEdit={openEdit}
              onDeactivate={handleDeactivate}
            />
          )}
        </div>
      </ListPage>

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar local' : 'Novo local'}
        description="Preencha os dados do local ou área da fazenda."
        onClose={() => setDialogOpen(false)}
      >
        {feedback?.type === 'error' && <InlineAlert>{feedback.message}</InlineAlert>}
        <div className="mt-4">
          <FarmLocationForm
            initialValue={editing}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </Dialog>
    </>
  )
}
