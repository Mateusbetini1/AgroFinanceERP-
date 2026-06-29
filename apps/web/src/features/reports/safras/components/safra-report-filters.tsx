'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { FarmLocation, Product, Safra, SafraStatus } from '@/types/api'
import type { SafraReportFilters } from '../types'

interface SafraReportFiltersProps {
  filters: SafraReportFilters
  safras: Safra[]
  products: Product[]
  farmLocations: FarmLocation[]
  onChange: (filters: SafraReportFilters) => void
}

export function SafraReportFilters({
  filters,
  safras,
  products,
  farmLocations,
  onChange,
}: SafraReportFiltersProps) {
  function setFilter<K extends keyof SafraReportFilters>(key: K, value: SafraReportFilters[K] | '') {
    onChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <div className="space-y-2 md:col-span-2 xl:col-span-2">
        <Label htmlFor="safra-report-search">Busca por nome</Label>
        <Input
          id="safra-report-search"
          value={filters.search ?? ''}
          onChange={(event) => setFilter('search', event.target.value)}
          placeholder="Ex.: Safra Pepino"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-report-safra">Safra</Label>
        <Select
          id="safra-report-safra"
          value={filters.safraId ?? ''}
          onChange={(event) => setFilter('safraId', event.target.value)}
        >
          <option value="">Todas</option>
          {safras.map((safra) => (
            <option key={safra.id} value={safra.id}>
              {safra.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-report-product">Produto/Cultura</Label>
        <Select
          id="safra-report-product"
          value={filters.productId ?? ''}
          onChange={(event) => setFilter('productId', event.target.value)}
        >
          <option value="">Todos</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-report-location">Local</Label>
        <Select
          id="safra-report-location"
          value={filters.farmLocationId ?? ''}
          onChange={(event) => setFilter('farmLocationId', event.target.value)}
        >
          <option value="">Todos</option>
          {farmLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-report-status">Status</Label>
        <Select
          id="safra-report-status"
          value={filters.status ?? ''}
          onChange={(event) => setFilter('status', event.target.value as SafraStatus)}
        >
          <option value="">Todos</option>
          <option value="PLANNED">Planejada</option>
          <option value="ACTIVE">Ativa</option>
          <option value="COMPLETED">Concluida</option>
          <option value="CANCELLED">Cancelada</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-report-date-from">Inicio de</Label>
        <Input
          id="safra-report-date-from"
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(event) => setFilter('dateFrom', event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="safra-report-date-to">Inicio ate</Label>
        <Input
          id="safra-report-date-to"
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(event) => setFilter('dateTo', event.target.value)}
        />
      </div>
    </div>
  )
}
