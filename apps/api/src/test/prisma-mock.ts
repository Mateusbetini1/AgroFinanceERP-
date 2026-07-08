import { vi } from 'vitest'

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    upsert: vi.fn(),
  }
}

const reminderRuleMock = createModelMock()
const notificationDeliveryMock = createModelMock()

export const prismaMock = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn(),
  user: createModelMock(),
  company: createModelMock(),
  membership: createModelMock(),
  refreshToken: createModelMock(),
  pushSubscription: createModelMock(),
  reminderRule: reminderRuleMock,
  notificationDelivery: notificationDeliveryMock,
  auditLog: createModelMock(),
  account: createModelMock(),
  transaction: createModelMock(),
  transfer: createModelMock(),
  revenue: createModelMock(),
  revenueGroup: createModelMock(),
  expense: createModelMock(),
  bill: createModelMock(),
  billGroup: createModelMock(),
  employee: createModelMock(),
  employeePayment: createModelMock(),
  product: createModelMock(),
  category: createModelMock(),
  supplier: createModelMock(),
  safra: createModelMock(),
  farmLocation: createModelMock(),
  invoice: createModelMock(),
}

function resetMockFns(target: Record<string, unknown>) {
  for (const value of Object.values(target)) {
    if (vi.isMockFunction(value)) {
      value.mockReset()
    } else if (value && typeof value === 'object') {
      resetMockFns(value as Record<string, unknown>)
    }
  }
}

export function resetPrismaMock() {
  resetMockFns(prismaMock as unknown as Record<string, unknown>)

  prismaMock.$connect.mockResolvedValue(undefined)
  prismaMock.$disconnect.mockResolvedValue(undefined)
  prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prismaMock) => unknown | Promise<unknown>)(prismaMock)
    }

    if (Array.isArray(arg)) {
      return Promise.all(arg)
    }

    return arg
  })
}

resetPrismaMock()
