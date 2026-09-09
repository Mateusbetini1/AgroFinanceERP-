import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@agrofinance/database'
import { env } from '../../config/env'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'
import { AssistantService } from '../assistant/assistant.service'
import { getWhatsAppConfig } from './whatsapp.config'
import { enqueueWhatsAppMessages, processWhatsAppQueue, resolveWhatsAppIdentity } from './whatsapp.service'
import { interpretWhatsAppMedia, sendWhatsAppReply } from './whatsapp.client'
import type { IncomingMessage } from './whatsapp.schemas'

vi.mock('./whatsapp.client', async (importOriginal) => ({
  ...await importOriginal<typeof import('./whatsapp.client')>(),
  sendWhatsAppReply: vi.fn(), interpretWhatsAppMedia: vi.fn(),
}))

// Stateful storage fake exercises duplicate webhook deliveries and multi-message
// confirmation flows against the same persisted inbox/session.
type Row = Record<string, any>
let session: Row | null
let inbox: Map<string, Row>
let sequence = 0
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((branch: Row) => matches(row, branch))
    if (value && typeof value === 'object') {
      if ('in' in value) return value.in.includes(row[key])
      if ('lt' in value) return row[key] && row[key] < value.lt
      if ('gt' in value) return row[key] && row[key] > value.gt
    }
    return row[key] === value
  })
}
function update(row: Row, data: Row) {
  Object.assign(row, Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === Prisma.DbNull ? null : value])))
  row.updatedAt = new Date()
  return { ...row }
}
const draft = {
  draftType: 'CREATE_BILL' as const, payload: { description: 'Adubo', amount: 850,
    dueDate: new Date(2026, 8, 20), status: 'PENDING' as const }, missingFields: [], confirmationRequired: true as const,
}
async function queue(body: string, id = `wamid.${++sequence}`, extra: Partial<IncomingMessage> = {}) {
  await enqueueWhatsAppMessages(getWhatsAppConfig()!, [{ id, from: env.WHATSAPP_ALLOWED_PHONE!,
    timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body }, ...extra }])
  await processWhatsAppQueue()
}

describe('WhatsApp personal assistant', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 9, 12))
    Object.assign(env, { WHATSAPP_ENABLED: true, WHATSAPP_ACCESS_TOKEN: 'token', WHATSAPP_APP_SECRET: 'secret',
      WHATSAPP_VERIFY_TOKEN: 'verify', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_GRAPH_VERSION: 'v25.0',
      WHATSAPP_ALLOWED_PHONE: '5511999999999', WHATSAPP_USER_EMAIL: 'owner@example.com', WHATSAPP_COMPANY_ID: undefined })
    session = null
    inbox = new Map()
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'owner@example.com' })
    prismaMock.membership.findMany.mockResolvedValue([{ role: 'OWNER', company: { id: 'company-1', name: 'Fazenda' } }])
    prismaMock.whatsAppSession.upsert.mockImplementation(async ({ create }) => {
      session ??= { ...create, draft: null, draftCode: null, draftExpiresAt: null, lockedUntil: null, lockToken: null }
      return { ...session }
    })
    prismaMock.whatsAppSession.findUniqueOrThrow.mockImplementation(async () => ({ ...session }))
    prismaMock.whatsAppSession.update.mockImplementation(async ({ data }) => update(session!, data))
    prismaMock.whatsAppSession.updateMany.mockImplementation(async ({ where, data }) => {
      if (!session || !matches(session, where)) return { count: 0 }
      update(session, data)
      return { count: 1 }
    })
    prismaMock.whatsAppMessage.createMany.mockImplementation(async ({ data }) => {
      for (const item of data) if (!inbox.has(item.id)) inbox.set(item.id, {
        status: 'PENDING', reply: null, sendAttempts: 0, nextSendAt: null, receivedAt: new Date(), updatedAt: new Date(), ...item })
      return { count: data.length }
    })
    prismaMock.whatsAppMessage.findFirst.mockImplementation(async ({ where }) =>
      [...inbox.values()].find((row) => matches(row, where)) ?? null)
    prismaMock.whatsAppMessage.update.mockImplementation(async ({ where, data }) => update(inbox.get(where.id)!, data))
    prismaMock.whatsAppMessage.updateMany.mockImplementation(async ({ where, data }) => {
      const rows = [...inbox.values()].filter((row) => matches(row, where))
      rows.forEach((row) => update(row, data))
      return { count: rows.length }
    })
    vi.spyOn(AssistantService, 'chat').mockResolvedValue({ kind: 'DRAFT', answer: 'Confira', sources: [], draft })
    vi.spyOn(AssistantService, 'confirmDraft').mockResolvedValue({ draftType: 'CREATE_BILL', created: { id: 'bill-1' } } as never)
    vi.mocked(sendWhatsAppReply).mockReset().mockResolvedValue(undefined)
    vi.mocked(interpretWhatsAppMedia).mockReset().mockResolvedValue('criar boleto de R$ 850')
  })
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

  it('prepara rascunho, exige código e salva apenas uma vez em reentregas', async () => {
    await queue('criar boleto de R$ 850')
    expect(AssistantService.confirmDraft).not.toHaveBeenCalled()
    const code = session!.draftCode
    expect(sendWhatsAppReply).toHaveBeenLastCalledWith(expect.anything(), expect.stringContaining(`CONFIRMAR ${code}`))
    await queue('sim')
    expect(AssistantService.confirmDraft).not.toHaveBeenCalled()
    await queue(`CONFIRMAR ${code}`, 'confirmation-1')
    await queue(`CONFIRMAR ${code}`, 'confirmation-1')
    await queue(`CONFIRMAR ${code}`)
    expect(AssistantService.confirmDraft).toHaveBeenCalledTimes(1)
    expect(AssistantService.confirmDraft).toHaveBeenCalledWith('company-1', expect.anything(), expect.objectContaining({
      user: { id: 'user-1', email: 'owner@example.com' }, company: { id: 'company-1', name: 'Fazenda' },
    }))
  })
  it('reenvia somente resposta quando entrega falha após salvar', async () => {
    await queue('criar boleto de R$ 850')
    vi.mocked(sendWhatsAppReply).mockRejectedValueOnce(new Error('network'))
    await queue(`CONFIRMAR ${session!.draftCode}`, 'confirm-failed-send')
    expect(inbox.get('confirm-failed-send')!.status).toBe('READY')
    vi.setSystemTime(new Date(Date.now() + 60000))
    await processWhatsAppQueue()
    expect(AssistantService.confirmDraft).toHaveBeenCalledTimes(1)
    expect(inbox.get('confirm-failed-send')!.status).toBe('DONE')
  })
  it('cancela e expira confirmações', async () => {
    await queue('criar boleto de R$ 850')
    const code = session!.draftCode
    await queue('CANCELAR')
    await queue(`CONFIRMAR ${code}`)
    await queue('criar boleto de R$ 850')
    const expired = session!.draftCode
    vi.setSystemTime(new Date(Date.now() + 31 * 60000))
    await queue(`CONFIRMAR ${expired}`)
    expect(AssistantService.confirmDraft).not.toHaveBeenCalled()
  })
  it('revalida permissão de gravação antes da confirmação', async () => {
    await queue('criar boleto de R$ 850')
    const code = session!.draftCode
    prismaMock.membership.findMany.mockResolvedValue([{ role: 'VIEWER', company: { id: 'company-1', name: 'Fazenda' } }])
    await queue(`CONFIRMAR ${code}`)
    expect(AssistantService.confirmDraft).not.toHaveBeenCalled()
    expect(sendWhatsAppReply).toHaveBeenLastCalledWith(expect.anything(), expect.stringContaining('permissão'))
  })
  it('não escolhe empresa quando há mais de uma e não consulta sem vínculo', async () => {
    prismaMock.membership.findMany.mockResolvedValue([{ role: 'OWNER', company: { id: 'a' } }, { role: 'OWNER', company: { id: 'b' } }])
    expect(await resolveWhatsAppIdentity(getWhatsAppConfig()!)).toBeNull()
    prismaMock.membership.findMany.mockResolvedValue([])
    await queue('quanto tenho a pagar?')
    expect(AssistantService.chat).not.toHaveBeenCalled()
    expect(sendWhatsAppReply).not.toHaveBeenCalled()
  })
  it('usa anexo para rascunho, mas não aceita confirmação por áudio', async () => {
    await queue('ignored', undefined, { type: 'image', image: { id: '456' } })
    expect(AssistantService.chat).toHaveBeenLastCalledWith('company-1', expect.objectContaining({ message: 'criar boleto de R$ 850' }))
    vi.mocked(interpretWhatsAppMedia).mockResolvedValueOnce(`CONFIRMAR ${session!.draftCode}`)
    await queue('ignored', undefined, { type: 'audio', audio: { id: '789' } })
    expect(AssistantService.confirmDraft).not.toHaveBeenCalled()
  })
  it('não repete operação após resultado incerto e invalida o código', async () => {
    await queue('criar boleto de R$ 850')
    const code = session!.draftCode
    vi.mocked(AssistantService.confirmDraft).mockRejectedValueOnce(new Error('connection lost'))
    await queue(`CONFIRMAR ${code}`, 'uncertain')
    await queue(`CONFIRMAR ${code}`, 'uncertain')
    await queue(`CONFIRMAR ${code}`)
    expect(AssistantService.confirmDraft).toHaveBeenCalledTimes(1)
    expect(session!.draft).toBeNull()
  })
  it('recupera mensagem abandonada sem chamar o assistente novamente', async () => {
    await queue('criar boleto de R$ 850', 'abandoned')
    update(inbox.get('abandoned')!, { status: 'PROCESSING' })
    const calls = vi.mocked(AssistantService.chat).mock.calls.length
    await processWhatsAppQueue()
    expect(AssistantService.chat).toHaveBeenCalledTimes(calls)
    expect(sendWhatsAppReply).toHaveBeenLastCalledWith(expect.anything(), expect.stringContaining('não repeti'))
    expect(session!.draft).toBeNull()
  })
  it('não processa com lock de outro worker e ignora mensagens antigas', async () => {
    await queue('AJUDA')
    session!.lockedUntil = new Date(Date.now() + 60000)
    await queue('criar boleto de R$ 850')
    expect(AssistantService.chat).not.toHaveBeenCalled()
    await enqueueWhatsAppMessages(getWhatsAppConfig()!, [{ id: 'old', from: env.WHATSAPP_ALLOWED_PHONE!,
      timestamp: '1', type: 'text', text: { body: 'criar boleto de R$ 850' } }])
    expect(inbox.has('old')).toBe(false)
  })
  it('mantém confirmação bloqueada quando falta vencimento', async () => {
    vi.mocked(AssistantService.chat).mockResolvedValueOnce({ kind: 'DRAFT', answer: 'Confira', sources: [],
      draft: { ...draft, payload: { description: 'Adubo', amount: 850, status: 'PENDING' } } })
    await queue('criar boleto de R$ 850')
    expect(sendWhatsAppReply).toHaveBeenLastCalledWith(expect.anything(), expect.stringContaining('Vencimento'))
    await queue(`CONFIRMAR ${session!.draftCode}`)
    expect(AssistantService.confirmDraft).not.toHaveBeenCalled()
  })

  it('usa o parser real do assistente para montar o boleto extraído de uma foto', async () => {
    vi.mocked(AssistantService.chat).mockRestore()
    Object.assign(env, { AI_ENABLED: true, AI_API_KEY: 'test-key' })
    vi.mocked(interpretWhatsAppMedia).mockResolvedValueOnce('Criar boleto de R$ 850,50 com vencimento em 20/10/2026')
    await queue('ignored', undefined, { type: 'image', image: { id: '456' } })
    expect(session!.draft.payload).toMatchObject({ amount: 850.50, status: 'PENDING',
      dueDate: new Date(2026, 9, 20).toISOString() })
    expect(session!.draft.missingFields).toEqual([])
    expect(AssistantService.confirmDraft).not.toHaveBeenCalled()
  })

  it('expira usando a hora original da mensagem, inclusive entregas atrasadas', async () => {
    await enqueueWhatsAppMessages(getWhatsAppConfig()!, [{ id: 'delayed', from: env.WHATSAPP_ALLOWED_PHONE!,
      timestamp: String(Math.floor((Date.now() - 23.5 * 60 * 60 * 1000) / 1000)), type: 'text', text: { body: 'AJUDA' } }])
    await processWhatsAppQueue()
    expect(inbox.get('delayed')!.status).toBe('EXPIRED')
    expect(sendWhatsAppReply).not.toHaveBeenCalled()
  })
})
