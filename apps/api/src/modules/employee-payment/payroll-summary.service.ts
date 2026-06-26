import { prisma } from '../../config/prisma'

type PayrollEmployeeSummary = {
  employeeId: string
  employeeName: string
  employeeType: 'MONTHLY' | 'DAILY'
  baseSalary: number
  expectedSalary: number
  salaryPaid: number
  remainingSalary: number
  extrasPaid: number
  dailyPaid: number
  totalPaid: number
}

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

export async function getPayrollSummary(companyId: string, month: number, year: number) {
  const [monthlyEmployees, payments] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, deletedAt: null, status: 'ACTIVE', type: 'MONTHLY' },
      select: { id: true, name: true, type: true, baseSalary: true },
      orderBy: { name: 'asc' },
    }),
    prisma.employeePayment.findMany({
      where: { companyId, deletedAt: null, referenceMonth: month, referenceYear: year },
      select: {
        employeeId: true,
        type: true,
        amount: true,
        employee: { select: { id: true, name: true, type: true, baseSalary: true } },
      },
    }),
  ])

  const employees = new Map<string, PayrollEmployeeSummary>()

  for (const employee of monthlyEmployees) {
    const baseSalary = toNumber(employee.baseSalary)
    employees.set(employee.id, {
      employeeId: employee.id,
      employeeName: employee.name,
      employeeType: 'MONTHLY',
      baseSalary,
      expectedSalary: baseSalary,
      salaryPaid: 0,
      remainingSalary: baseSalary,
      extrasPaid: 0,
      dailyPaid: 0,
      totalPaid: 0,
    })
  }

  for (const payment of payments) {
    const employee = payment.employee
    const existing =
      employees.get(payment.employeeId) ??
      {
        employeeId: payment.employeeId,
        employeeName: employee.name,
        employeeType: employee.type,
        baseSalary: toNumber(employee.baseSalary),
        expectedSalary: 0,
        salaryPaid: 0,
        remainingSalary: 0,
        extrasPaid: 0,
        dailyPaid: 0,
        totalPaid: 0,
      }

    const amount = toNumber(payment.amount)

    if (payment.type === 'SALARY' || payment.type === 'ADVANCE') existing.salaryPaid += amount
    if (payment.type === 'OVERTIME' || payment.type === 'BONUS') existing.extrasPaid += amount
    if (payment.type === 'DAILY_WAGE') existing.dailyPaid += amount

    existing.totalPaid += amount

    if (existing.expectedSalary > 0) {
      existing.remainingSalary = Math.max(existing.expectedSalary - existing.salaryPaid, 0)
    }

    employees.set(payment.employeeId, existing)
  }

  const rows = Array.from(employees.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))

  return {
    month,
    year,
    payrollExpected: rows.reduce((sum, item) => sum + item.expectedSalary, 0),
    payrollSalaryPaid: rows.reduce((sum, item) => sum + item.salaryPaid, 0),
    payrollRemaining: rows.reduce((sum, item) => sum + item.remainingSalary, 0),
    payrollExtrasPaid: rows.reduce((sum, item) => sum + item.extrasPaid, 0),
    payrollDailyPaid: rows.reduce((sum, item) => sum + item.dailyPaid, 0),
    payrollTotalPaid: rows.reduce((sum, item) => sum + item.totalPaid, 0),
    employeesWithPendingSalary: rows.filter((item) => item.remainingSalary > 0).length,
    employees: rows,
  }
}
