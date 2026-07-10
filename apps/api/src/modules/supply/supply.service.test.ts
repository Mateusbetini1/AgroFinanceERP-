import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { SupplyCategory, SupplyUnit } from '@agrofinance/database'
import { SupplyService } from './supply.service'
import { updateSupplySchema, createSupplySchema } from './supply.schemas'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const otherCompanyId = 'company-2'
const supplyId = 'supply-1'

const supply = {
  id: supplyId,
  name: 'Defensivo X',
  category: SupplyCategory.DEFENSIVE,
  baseUnit: SupplyUnit.KG,
  purchaseUnitDefault: SupplyUnit.KG,
  packageSizeBaseQuantity: null,
  packageSizeUnit: null,
  active: true,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function mockRequest(): Request {
  return {} as Request
}

describe('SupplyService', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('cria insumo válido usando companyId do backend', async () => {
    prismaMock.supply.findFirst.mockResolvedValue(null)
    prismaMock.supply.create.mockResolvedValue(supply)

    const result = await SupplyService.create(
      companyId,
      {
        name: 'Defensivo X',
        category: SupplyCategory.DEFENSIVE,
        baseUnit: SupplyUnit.KG,
        purchaseUnitDefault: SupplyUnit.KG,
        active: true,
      },
      mockRequest(),
    )

    expect(result).toEqual(supply)
    expect(prismaMock.supply.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId, name: 'Defensivo X' }),
      }),
    )
  })

  it('lista apenas insumos da empresa informada', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply])
    prismaMock.supply.count.mockResolvedValue(1)

    await SupplyService.list(companyId, { page: 1, limit: 10 })

    expect(prismaMock.supply.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId, deletedAt: null }),
      }),
    )
    expect(prismaMock.supply.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ companyId, deletedAt: null }),
    })
  })

  it('bloqueia nome duplicado ativo na mesma empresa', async () => {
    prismaMock.supply.findFirst.mockResolvedValue({ id: 'existing-supply' })

    await expect(
      SupplyService.create(
        companyId,
        {
          name: 'Defensivo X',
          category: SupplyCategory.DEFENSIVE,
          baseUnit: SupplyUnit.KG,
          purchaseUnitDefault: SupplyUnit.KG,
          active: true,
        },
        mockRequest(),
      ),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })

    expect(prismaMock.supply.create).not.toHaveBeenCalled()
  })

  it('permite mesmo nome em empresas diferentes por escopar conflito pelo companyId atual', async () => {
    prismaMock.supply.findFirst.mockResolvedValue(null)
    prismaMock.supply.create.mockResolvedValue({ ...supply, id: 'supply-2' })

    await SupplyService.create(
      otherCompanyId,
      {
        name: 'Defensivo X',
        category: SupplyCategory.DEFENSIVE,
        baseUnit: SupplyUnit.KG,
        purchaseUnitDefault: SupplyUnit.KG,
        active: true,
      },
      mockRequest(),
    )

    expect(prismaMock.supply.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: otherCompanyId }),
      }),
    )
    expect(prismaMock.supply.create).toHaveBeenCalled()
  })

  it('edita insumo existente', async () => {
    prismaMock.supply.findFirst
      .mockResolvedValueOnce(supply)
      .mockResolvedValueOnce(null)
    prismaMock.supply.update.mockResolvedValue({
      ...supply,
      name: 'Defensivo X Plus',
    })

    const result = await SupplyService.update(
      companyId,
      supplyId,
      { name: 'Defensivo X Plus' },
      mockRequest(),
    )

    expect(result.name).toBe('Defensivo X Plus')
    expect(prismaMock.supply.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: supplyId },
        data: { name: 'Defensivo X Plus' },
      }),
    )
  })

  it('rejeita PATCH vazio', () => {
    expect(() => updateSupplySchema.parse({})).toThrow('Nenhum campo enviado para atualização')
  })

  it('faz soft delete e desativa o insumo', async () => {
    prismaMock.supply.findFirst.mockResolvedValue(supply)
    prismaMock.supply.update.mockResolvedValue({
      ...supply,
      active: false,
      deletedAt: new Date('2026-01-02T00:00:00.000Z'),
    })

    await SupplyService.delete(companyId, supplyId, mockRequest())

    expect(prismaMock.supply.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: supplyId },
        data: expect.objectContaining({ active: false, deletedAt: expect.any(Date) }),
      }),
    )
  })

  it('bloqueia acesso a insumo de outra empresa', async () => {
    prismaMock.supply.findFirst.mockResolvedValue(null)

    await expect(SupplyService.findById(companyId, supplyId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })

    expect(prismaMock.supply.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: supplyId, companyId, deletedAt: null },
      }),
    )
  })

  it('valida packageSizeBaseQuantity positivo', () => {
    expect(() =>
      createSupplySchema.parse({
        name: 'Defensivo X',
        category: SupplyCategory.DEFENSIVE,
        baseUnit: SupplyUnit.KG,
        purchaseUnitDefault: SupplyUnit.BAG,
        packageSizeBaseQuantity: -1,
      }),
    ).toThrow('Tamanho da embalagem deve ser positivo')
  })
})
