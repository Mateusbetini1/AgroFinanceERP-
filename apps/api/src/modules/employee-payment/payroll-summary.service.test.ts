import { beforeEach, describe, expect, it } from 'vitest'
import { getPayrollSummary } from './payroll-summary.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'

describe('getPayrollSummary', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('mensalista sem pagamento gera remaining igual ao baseSalary', async () => {
    prismaMock.employee.findMany.mockResolvedValue([
      { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
    ])
    prismaMock.employeePayment.findMany.mockResolvedValue([])

    const result = await getPayrollSummary(companyId, 6, 2026)

    expect(result.payrollExpected).toBe(2500)
    expect(result.payrollSalaryPaid).toBe(0)
    expect(result.payrollRemaining).toBe(2500)
    expect(result.employeesWithPendingSalary).toBe(1)
    expect(result.employees[0]).toEqual(expect.objectContaining({ expectedSalary: 2500, remainingSalary: 2500 }))
  })

  it('mensalista com ADVANCE abate salario', async () => {
    prismaMock.employee.findMany.mockResolvedValue([
      { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
    ])
    prismaMock.employeePayment.findMany.mockResolvedValue([
      {
        employeeId: 'employee-1',
        type: 'ADVANCE',
        amount: 1000,
        employee: { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
      },
    ])

    const result = await getPayrollSummary(companyId, 6, 2026)

    expect(result.payrollSalaryPaid).toBe(1000)
    expect(result.payrollRemaining).toBe(1500)
    expect(result.payrollTotalPaid).toBe(1000)
    expect(result.totalsByType.ADVANCE).toBe(1000)
  })

  it('OVERTIME e BONUS contam como extras mas nao abatem salario', async () => {
    prismaMock.employee.findMany.mockResolvedValue([
      { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
    ])
    prismaMock.employeePayment.findMany.mockResolvedValue([
      {
        employeeId: 'employee-1',
        type: 'OVERTIME',
        amount: 200,
        employee: { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
      },
      {
        employeeId: 'employee-1',
        type: 'BONUS',
        amount: 300,
        employee: { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
      },
    ])

    const result = await getPayrollSummary(companyId, 6, 2026)

    expect(result.payrollExtrasPaid).toBe(500)
    expect(result.payrollSalaryPaid).toBe(0)
    expect(result.payrollRemaining).toBe(2500)
    expect(result.payrollTotalPaid).toBe(500)
    expect(result.totalsByType.OVERTIME).toBe(200)
    expect(result.totalsByType.BONUS).toBe(300)
  })

  it('DAILY nao gera expectedSalary e entra apenas pelo pagamento realizado', async () => {
    prismaMock.employee.findMany.mockResolvedValue([])
    prismaMock.employeePayment.findMany.mockResolvedValue([
      {
        employeeId: 'employee-2',
        type: 'DAILY_WAGE',
        amount: 180,
        employee: { id: 'employee-2', name: 'Maria', type: 'DAILY', baseSalary: 180 },
      },
    ])

    const result = await getPayrollSummary(companyId, 6, 2026)

    expect(result.payrollExpected).toBe(0)
    expect(result.payrollDailyPaid).toBe(180)
    expect(result.payrollTotalPaid).toBe(180)
    expect(result.totalsByType.DAILY_WAGE).toBe(180)
    expect(result.employees[0]).toEqual(expect.objectContaining({ employeeType: 'DAILY', expectedSalary: 0, remainingSalary: 0 }))
  })

  it('filtra pagamentos pela empresa e competencia informada', async () => {
    prismaMock.employee.findMany.mockResolvedValue([])
    prismaMock.employeePayment.findMany.mockResolvedValue([])

    await getPayrollSummary(companyId, 7, 2026)

    expect(prismaMock.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId, deletedAt: null, status: 'ACTIVE', type: 'MONTHLY' },
      }),
    )
    expect(prismaMock.employeePayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId, deletedAt: null, referenceMonth: 7, referenceYear: 2026 },
      }),
    )
  })

  it('consulta resumo sem alterar saldo ou status', async () => {
    prismaMock.employee.findMany.mockResolvedValue([])
    prismaMock.employeePayment.findMany.mockResolvedValue([])

    await getPayrollSummary(companyId, 7, 2026)

    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.account.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.employee.update).not.toHaveBeenCalled()
    expect(prismaMock.employee.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.update).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.updateMany).not.toHaveBeenCalled()
  })
})
