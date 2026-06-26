import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'admin@agrofinance.com'
const DEMO_PASSWORD = 'Admin@123456'
const DEMO_COMPANY_DOCUMENT = '00000000000000'

function seedId(companyId: string, type: string, key: string): string {
  const hash = createHash('sha256')
    .update(['agrofinance-demo-seed', companyId, type, key].join(':'))
    .digest('hex')
    .slice(0, 32)
    .split('')

  hash[12] = '5'
  hash[16] = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16)

  const value = hash.join('')
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join('-')
}

function atNoon(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(12, 0, 0, 0)
  return copy
}

function daysFromNow(days: number): Date {
  const date = atNoon(new Date())
  date.setDate(date.getDate() + days)
  return date
}

function currentReference() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

async function ensureCategory(
  companyId: string,
  data: { name: string; type: 'EXPENSE' | 'REVENUE' | 'BOTH'; color: string },
) {
  const existing = await prisma.category.findFirst({
    where: { companyId, name: data.name, deletedAt: null },
  })

  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: { type: data.type, color: data.color, active: true, deletedAt: null },
    })
  }

  return prisma.category.upsert({
    where: { id: seedId(companyId, 'category', data.name) },
    update: { name: data.name, type: data.type, color: data.color, active: true, deletedAt: null },
    create: {
      id: seedId(companyId, 'category', data.name),
      companyId,
      name: data.name,
      type: data.type,
      color: data.color,
      active: true,
    },
  })
}

async function ensureProduct(
  companyId: string,
  data: { name: string; unit: 'KG' | 'BOX' | 'BAG' | 'TON'; description?: string },
) {
  const existing = await prisma.product.findFirst({
    where: { companyId, name: data.name, deletedAt: null },
  })

  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        unit: data.unit,
        description: data.description ?? null,
        active: true,
        deletedAt: null,
      },
    })
  }

  return prisma.product.upsert({
    where: { id: seedId(companyId, 'product', data.name) },
    update: {
      name: data.name,
      unit: data.unit,
      description: data.description ?? null,
      active: true,
      deletedAt: null,
    },
    create: {
      id: seedId(companyId, 'product', data.name),
      companyId,
      name: data.name,
      unit: data.unit,
      description: data.description ?? null,
      active: true,
    },
  })
}

async function ensureSupplier(
  companyId: string,
  data: { name: string; document: string; email?: string; phone?: string; contactName?: string; notes?: string },
) {
  const existing = await prisma.supplier.findFirst({
    where: { companyId, document: data.document, deletedAt: null },
  })

  const payload = {
    name: data.name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    contactName: data.contactName ?? null,
    notes: data.notes ?? null,
    deletedAt: null,
  }

  if (existing) {
    return prisma.supplier.update({ where: { id: existing.id }, data: payload })
  }

  return prisma.supplier.upsert({
    where: { id: seedId(companyId, 'supplier', data.document) },
    update: { document: data.document, ...payload },
    create: {
      id: seedId(companyId, 'supplier', data.document),
      companyId,
      document: data.document,
      ...payload,
    },
  })
}

async function ensureAccount(
  companyId: string,
  data: {
    name: string
    type: 'CASH' | 'BANK'
    initialBalance: number
    currentBalance: number
    bankName?: string
    agency?: string
    accountNumber?: string
  },
) {
  const existing = await prisma.account.findFirst({
    where: { companyId, name: data.name, deletedAt: null },
  })

  const payload = {
    type: data.type,
    bankName: data.bankName ?? null,
    agency: data.agency ?? null,
    accountNumber: data.accountNumber ?? null,
    initialBalance: data.initialBalance,
    currentBalance: data.currentBalance,
    active: true,
    deletedAt: null,
  }

  if (existing) {
    return prisma.account.update({ where: { id: existing.id }, data: payload })
  }

  return prisma.account.upsert({
    where: { id: seedId(companyId, 'account', data.name) },
    update: { name: data.name, ...payload },
    create: {
      id: seedId(companyId, 'account', data.name),
      companyId,
      name: data.name,
      ...payload,
    },
  })
}

async function main() {
  console.log('Seeding AgroFinance demo database...')

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: 'Admin AgroFinance', passwordHash },
    create: {
      name: 'Admin AgroFinance',
      email: DEMO_EMAIL,
      passwordHash,
    },
  })

  const company = await prisma.company.upsert({
    where: { document: DEMO_COMPANY_DOCUMENT },
    update: {
      name: 'AgroFinance Demo',
      email: 'contato@agrofinancedemo.com',
      phone: '11999999999',
      planTier: 'PRO',
      active: true,
      deletedAt: null,
    },
    create: {
      name: 'AgroFinance Demo',
      document: DEMO_COMPANY_DOCUMENT,
      email: 'contato@agrofinancedemo.com',
      phone: '11999999999',
      planTier: 'PRO',
      active: true,
    },
  })

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: { role: 'OWNER', active: true, joinedAt: new Date() },
    create: {
      companyId: company.id,
      userId: user.id,
      role: 'OWNER',
      active: true,
      joinedAt: new Date(),
    },
  })

  const categories = {
    insumos: await ensureCategory(company.id, { name: 'Insumos', type: 'EXPENSE', color: '#2563EB' }),
    funcionarios: await ensureCategory(company.id, { name: 'Funcionários', type: 'EXPENSE', color: '#DC2626' }),
    energia: await ensureCategory(company.id, { name: 'Energia', type: 'EXPENSE', color: '#F59E0B' }),
    defensivos: await ensureCategory(company.id, { name: 'Defensivos', type: 'EXPENSE', color: '#16A34A' }),
  }

  const products = {
    pepino: await ensureProduct(company.id, { name: 'Pepino', unit: 'BOX', description: 'Pepino para venda em caixas' }),
    pimentao: await ensureProduct(company.id, { name: 'Pimentão', unit: 'BOX', description: 'Pimentão colorido de estufa' }),
    cafe: await ensureProduct(company.id, { name: 'Café', unit: 'BAG', description: 'Café beneficiado em sacas' }),
  }

  const suppliers = {
    baricitrus: await ensureSupplier(company.id, {
      name: 'Baricitrus',
      document: '11222333000144',
      email: 'financeiro@baricitrus.example',
      phone: '11988887777',
      contactName: 'Marina Barros',
    }),
    casaAgricola: await ensureSupplier(company.id, {
      name: 'Casa Agrícola Demo',
      document: '22333444000155',
      email: 'vendas@casaagricola.example',
      phone: '11977776666',
      contactName: 'Carlos Silva',
    }),
  }

  const caixaInitialBalance = 2500
  const sicrediInitialBalance = 8000

  const accounts = {
    caixa: await ensureAccount(company.id, {
      name: 'Caixa',
      type: 'CASH',
      initialBalance: caixaInitialBalance,
      currentBalance: caixaInitialBalance,
    }),
    sicredi: await ensureAccount(company.id, {
      name: 'Banco Sicredi',
      type: 'BANK',
      bankName: 'Sicredi',
      agency: '0101',
      accountNumber: '12345-6',
      initialBalance: sicrediInitialBalance,
      currentBalance: sicrediInitialBalance,
    }),
  }

  const farmLocation = await prisma.farmLocation.upsert({
    where: { id: seedId(company.id, 'farm-location', 'Estufa A') },
    update: {
      name: 'Estufa A',
      type: 'GREENHOUSE',
      area: 1200,
      notes: 'Área protegida para hortifruti',
      active: true,
    },
    create: {
      id: seedId(company.id, 'farm-location', 'Estufa A'),
      companyId: company.id,
      name: 'Estufa A',
      type: 'GREENHOUSE',
      area: 1200,
      notes: 'Área protegida para hortifruti',
      active: true,
    },
  })

  const safra = await prisma.safra.upsert({
    where: { id: seedId(company.id, 'safra', 'Safra Pepino Estufa A 2026') },
    update: {
      productId: products.pepino.id,
      farmLocationId: farmLocation.id,
      name: 'Safra Pepino Estufa A 2026',
      startDate: daysFromNow(-20),
      endDate: daysFromNow(90),
      estimatedYield: 18000,
      status: 'ACTIVE',
      notes: 'Safra demo para dashboard e reports',
      active: true,
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'safra', 'Safra Pepino Estufa A 2026'),
      companyId: company.id,
      productId: products.pepino.id,
      farmLocationId: farmLocation.id,
      name: 'Safra Pepino Estufa A 2026',
      startDate: daysFromNow(-20),
      endDate: daysFromNow(90),
      estimatedYield: 18000,
      status: 'ACTIVE',
      notes: 'Safra demo para dashboard e reports',
      active: true,
    },
  })

  const employee = await prisma.employee.upsert({
    where: { id: seedId(company.id, 'employee', 'Joao Operador') },
    update: {
      name: 'João Operador',
      role: 'Operador de Estufa',
      document: '12345678901',
      phone: '11966665555',
      pixKey: 'joao.operador@example.com',
      baseSalary: 2200,
      type: 'MONTHLY',
      status: 'ACTIVE',
      hireDate: daysFromNow(-120),
      notes: 'Funcionário demo ativo',
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'employee', 'Joao Operador'),
      companyId: company.id,
      name: 'João Operador',
      role: 'Operador de Estufa',
      document: '12345678901',
      phone: '11966665555',
      pixKey: 'joao.operador@example.com',
      baseSalary: 2200,
      type: 'MONTHLY',
      status: 'ACTIVE',
      hireDate: daysFromNow(-120),
      notes: 'Funcionário demo ativo',
    },
  })

  const receivedRevenueTotal = 4200
  const pendingRevenueTotal = 1750
  const paidExpenseAmount = 850
  const pendingExpenseAmount = 620
  const paidBillAmount = 420
  const pendingBillAmount = 1200
  const transferAmount = 300
  const employeePaymentAmount = 1200

  const receivedRevenue = await prisma.revenue.upsert({
    where: { id: seedId(company.id, 'revenue', 'venda-pepino-recebida') },
    update: {
      productId: products.pepino.id,
      accountId: accounts.sicredi.id,
      safraId: safra.id,
      date: daysFromNow(-2),
      receivedAt: daysFromNow(-1),
      quantity: 120,
      unitPrice: 35,
      totalAmount: receivedRevenueTotal,
      client: 'Mercado Central Demo',
      notes: 'Venda recebida seed',
      status: 'RECEIVED',
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'revenue', 'venda-pepino-recebida'),
      companyId: company.id,
      productId: products.pepino.id,
      accountId: accounts.sicredi.id,
      safraId: safra.id,
      date: daysFromNow(-2),
      receivedAt: daysFromNow(-1),
      quantity: 120,
      unitPrice: 35,
      totalAmount: receivedRevenueTotal,
      client: 'Mercado Central Demo',
      notes: 'Venda recebida seed',
      status: 'RECEIVED',
    },
  })

  await prisma.revenue.upsert({
    where: { id: seedId(company.id, 'revenue', 'venda-pimentao-pendente') },
    update: {
      productId: products.pimentao.id,
      accountId: null,
      safraId: safra.id,
      date: daysFromNow(5),
      receivedAt: null,
      quantity: 50,
      unitPrice: 35,
      totalAmount: pendingRevenueTotal,
      client: 'Restaurante Demo',
      notes: 'Venda pendente seed',
      status: 'PENDING',
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'revenue', 'venda-pimentao-pendente'),
      companyId: company.id,
      productId: products.pimentao.id,
      accountId: null,
      safraId: safra.id,
      date: daysFromNow(5),
      receivedAt: null,
      quantity: 50,
      unitPrice: 35,
      totalAmount: pendingRevenueTotal,
      client: 'Restaurante Demo',
      notes: 'Venda pendente seed',
      status: 'PENDING',
    },
  })

  await prisma.expense.upsert({
    where: { id: seedId(company.id, 'expense', 'insumos-pago') },
    update: {
      categoryId: categories.insumos.id,
      supplierId: suppliers.casaAgricola.id,
      accountId: accounts.caixa.id,
      safraId: safra.id,
      date: daysFromNow(-3),
      dueDate: daysFromNow(-3),
      paidAt: daysFromNow(-2),
      amount: paidExpenseAmount,
      description: 'Compra de insumos para estufa',
      status: 'PAID',
      attachmentUrl: null,
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'expense', 'insumos-pago'),
      companyId: company.id,
      categoryId: categories.insumos.id,
      supplierId: suppliers.casaAgricola.id,
      accountId: accounts.caixa.id,
      safraId: safra.id,
      date: daysFromNow(-3),
      dueDate: daysFromNow(-3),
      paidAt: daysFromNow(-2),
      amount: paidExpenseAmount,
      description: 'Compra de insumos para estufa',
      status: 'PAID',
      attachmentUrl: null,
    },
  })

  await prisma.expense.upsert({
    where: { id: seedId(company.id, 'expense', 'defensivos-pendente') },
    update: {
      categoryId: categories.defensivos.id,
      supplierId: suppliers.baricitrus.id,
      accountId: null,
      safraId: safra.id,
      date: daysFromNow(4),
      dueDate: daysFromNow(8),
      paidAt: null,
      amount: pendingExpenseAmount,
      description: 'Defensivos para manejo preventivo',
      status: 'PENDING',
      attachmentUrl: null,
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'expense', 'defensivos-pendente'),
      companyId: company.id,
      categoryId: categories.defensivos.id,
      supplierId: suppliers.baricitrus.id,
      accountId: null,
      safraId: safra.id,
      date: daysFromNow(4),
      dueDate: daysFromNow(8),
      paidAt: null,
      amount: pendingExpenseAmount,
      description: 'Defensivos para manejo preventivo',
      status: 'PENDING',
      attachmentUrl: null,
    },
  })

  const paidBill = await prisma.bill.upsert({
    where: { id: seedId(company.id, 'bill', 'energia-paga') },
    update: {
      supplierId: suppliers.baricitrus.id,
      accountId: accounts.sicredi.id,
      description: 'Conta de energia da estufa',
      amount: paidBillAmount,
      dueDate: daysFromNow(-4),
      paidAt: daysFromNow(-3),
      status: 'PAID',
      fileUrl: null,
      installmentNumber: null,
      installmentCount: null,
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'bill', 'energia-paga'),
      companyId: company.id,
      supplierId: suppliers.baricitrus.id,
      accountId: accounts.sicredi.id,
      description: 'Conta de energia da estufa',
      amount: paidBillAmount,
      dueDate: daysFromNow(-4),
      paidAt: daysFromNow(-3),
      status: 'PAID',
      fileUrl: null,
      installmentNumber: null,
      installmentCount: null,
    },
  })

  await prisma.bill.upsert({
    where: { id: seedId(company.id, 'bill', 'fornecedor-pendente') },
    update: {
      supplierId: suppliers.casaAgricola.id,
      accountId: null,
      description: 'Boleto de compra parcelada',
      amount: pendingBillAmount,
      dueDate: daysFromNow(6),
      paidAt: null,
      status: 'PENDING',
      fileUrl: null,
      installmentNumber: 1,
      installmentCount: 2,
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'bill', 'fornecedor-pendente'),
      companyId: company.id,
      supplierId: suppliers.casaAgricola.id,
      accountId: null,
      description: 'Boleto de compra parcelada',
      amount: pendingBillAmount,
      dueDate: daysFromNow(6),
      paidAt: null,
      status: 'PENDING',
      fileUrl: null,
      installmentNumber: 1,
      installmentCount: 2,
    },
  })

  await prisma.transfer.upsert({
    where: { id: seedId(company.id, 'transfer', 'caixa-para-sicredi') },
    update: {
      fromAccountId: accounts.caixa.id,
      toAccountId: accounts.sicredi.id,
      amount: transferAmount,
      description: 'Reforço de saldo no Banco Sicredi',
      date: daysFromNow(-1),
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'transfer', 'caixa-para-sicredi'),
      companyId: company.id,
      fromAccountId: accounts.caixa.id,
      toAccountId: accounts.sicredi.id,
      amount: transferAmount,
      description: 'Reforço de saldo no Banco Sicredi',
      date: daysFromNow(-1),
    },
  })

  const reference = currentReference()
  await prisma.employeePayment.upsert({
    where: { id: seedId(company.id, 'employee-payment', 'salario-joao') },
    update: {
      employeeId: employee.id,
      accountId: accounts.caixa.id,
      type: 'SALARY',
      amount: employeePaymentAmount,
      date: daysFromNow(-1),
      referenceMonth: reference.month,
      referenceYear: reference.year,
      notes: 'Pagamento mensal seed',
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'employee-payment', 'salario-joao'),
      companyId: company.id,
      employeeId: employee.id,
      accountId: accounts.caixa.id,
      type: 'SALARY',
      amount: employeePaymentAmount,
      date: daysFromNow(-1),
      referenceMonth: reference.month,
      referenceYear: reference.year,
      notes: 'Pagamento mensal seed',
    },
  })

  await prisma.invoice.upsert({
    where: { id: seedId(company.id, 'invoice', 'nf-venda-pepino') },
    update: {
      number: 'NF-DEMO-001',
      amount: receivedRevenueTotal,
      issuedAt: daysFromNow(-2),
      fileUrl: 'https://example.com/agrofinance-demo/nf-demo-001.pdf',
      fileType: 'PDF',
      revenueId: receivedRevenue.id,
      expenseId: null,
      billId: null,
      ocrStatus: 'NONE',
      ocrData: null,
      deletedAt: null,
    },
    create: {
      id: seedId(company.id, 'invoice', 'nf-venda-pepino'),
      companyId: company.id,
      number: 'NF-DEMO-001',
      amount: receivedRevenueTotal,
      issuedAt: daysFromNow(-2),
      fileUrl: 'https://example.com/agrofinance-demo/nf-demo-001.pdf',
      fileType: 'PDF',
      revenueId: receivedRevenue.id,
      ocrStatus: 'NONE',
    },
  })

  const caixaCurrentBalance =
    caixaInitialBalance - paidExpenseAmount - transferAmount - employeePaymentAmount
  const sicrediCurrentBalance =
    sicrediInitialBalance + receivedRevenueTotal - paidBillAmount + transferAmount

  await prisma.account.update({
    where: { id: accounts.caixa.id },
    data: {
      initialBalance: caixaInitialBalance,
      currentBalance: caixaCurrentBalance,
      active: true,
      deletedAt: null,
    },
  })

  await prisma.account.update({
    where: { id: accounts.sicredi.id },
    data: {
      initialBalance: sicrediInitialBalance,
      currentBalance: sicrediCurrentBalance,
      active: true,
      deletedAt: null,
    },
  })

  console.log('Seed completed.')
  console.log('User: ' + DEMO_EMAIL)
  console.log('Password: ' + DEMO_PASSWORD)
  console.log('Company: ' + company.name + ' (' + company.id + ')')
  console.log('Caixa currentBalance: ' + caixaCurrentBalance)
  console.log('Banco Sicredi currentBalance: ' + sicrediCurrentBalance)
  console.log('Paid bill seed id: ' + paidBill.id)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
