import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { Request } from 'express'
import { Prisma } from '@agrofinance/database'
import { prisma } from '../../config/prisma'
import { logger } from '../../config/logger'
import { AssistantService, withMissingFields } from '../assistant/assistant.service'
import { assistantDraftSchema, type AssistantDraft } from '../assistant/assistant.schemas'
import { getWhatsAppConfig, WhatsAppConfigurationError, type WhatsAppConfig } from './whatsapp.config'
import { incomingMessageSchema, type IncomingMessage } from './whatsapp.schemas'
import { interpretWhatsAppMedia, sendWhatsAppReply, WhatsAppInputError } from './whatsapp.client'

const FINANCIAL_ROLES = new Set(['OWNER', 'ADMIN', 'FINANCIAL'])
const CLEAR_DRAFT = { draft: Prisma.DbNull, draftCode: null, draftExpiresAt: null,
  draftUserId: null, draftCompanyId: null }
const INTERRUPTED_REPLY = 'O processamento foi interrompido. Por segurança, não repeti a operação. Confira os lançamentos no painel antes de tentar novamente.'
const HELP = 'Posso consultar suas finanças e preparar receitas, despesas, boletos, parcelamentos e pagamentos de funcionários. Envie texto, áudio, foto, PDF ou vídeo curto (até 10 MB). Para salvar, revise o rascunho e digite CONFIRMAR seguido do código. CANCELAR descarta o rascunho. Não realizo pagamentos bancários.'

export async function resolveWhatsAppIdentity(config: WhatsAppConfig, reportProblems = false) {
  const user = await prisma.user.findUnique({ where: { email: config.userEmail },
    select: { id: true, email: true } })
  if (!user) {
    if (reportProblems) logger.warn('WhatsApp: usuário não encontrado. Confira WHATSAPP_USER_EMAIL com o login do AgroFinance')
    return null
  }
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, active: true,
      ...(config.companyId ? { companyId: config.companyId } : {}),
      company: { active: true, deletedAt: null } },
    select: { role: true, company: { select: { id: true, name: true } } }, take: 2,
  })
  // Never guess a tenant when the user belongs to several companies.
  if (memberships.length !== 1) {
    if (reportProblems) logger.warn(memberships.length === 0
      ? 'WhatsApp: usuário sem vínculo ativo com a empresa. Confira WHATSAPP_COMPANY_ID e permissões'
      : 'WhatsApp: mais de uma empresa ativa. Preencha WHATSAPP_COMPANY_ID')
    return null
  }
  const membership = memberships[0]!
  const sessionId = createHash('sha256').update(
    `${config.phoneNumberId}:${config.allowedPhone}:${user.id}:${membership.company.id}`,
  ).digest('hex')
  return { user, company: membership.company, role: membership.role, sessionId }
}

type Identity = NonNullable<Awaited<ReturnType<typeof resolveWhatsAppIdentity>>>

export async function enqueueWhatsAppMessages(config: WhatsAppConfig, messages: IncomingMessage[]) {
  if (!messages.length) return
  const identity = await resolveWhatsAppIdentity(config, true)
  if (!identity) return
  const now = Date.now()
  const accepted = messages.filter((message) => message.from === config.allowedPhone &&
    Number(message.timestamp) * 1000 >= now - 24 * 60 * 60 * 1000 &&
    Number(message.timestamp) * 1000 <= now + 5 * 60 * 1000)
  if (!accepted.length) {
    logger.warn('WhatsApp: nenhuma mensagem elegível; confira remetente e horário do evento')
    return
  }
  await prisma.whatsAppSession.upsert({ where: { id: identity.sessionId },
    create: { id: identity.sessionId }, update: {} })
  const inserted = await prisma.whatsAppMessage.createMany({
    data: accepted.map((message) => ({ id: message.id, sessionId: identity.sessionId,
      receivedAt: new Date(Number(message.timestamp) * 1000),
      payload: message as Prisma.InputJsonValue })),
    skipDuplicates: true,
  })
  logger.info({ inserted: inserted.count, eligible: accepted.length }, 'WhatsApp: mensagens persistidas na fila')
}

async function clearDraft(sessionId: string) {
  await prisma.whatsAppSession.update({ where: { id: sessionId }, data: CLEAR_DRAFT })
}

const fieldLabels: Record<string, string> = {
  description: 'Descrição', amount: 'Valor', totalAmount: 'Valor total', quantity: 'Quantidade',
  unitPrice: 'Preço unitário', date: 'Data', dueDate: 'Vencimento', firstDueDate: 'Primeiro vencimento',
  paidAt: 'Pago em', receivedAt: 'Recebimento', status: 'Situação', categoryId: 'Categoria',
  supplierId: 'Fornecedor', accountId: 'Conta', safraId: 'Safra', productId: 'Produto',
  employeeId: 'Funcionário', type: 'Tipo de pagamento', referenceMonth: 'Mês de referência',
  referenceYear: 'Ano de referência', notes: 'Observações', client: 'Cliente',
  installmentCount: 'Parcelas', interval: 'Intervalo',
}
const valueLabels: Record<string, string> = {
  PAID: 'Pago', PENDING: 'Pendente', RECEIVED: 'Recebido', MONTHLY: 'Mensal',
  SALARY: 'Salário', OVERTIME: 'Hora extra', ADVANCE: 'Adiantamento', BONUS: 'Bônus', DAILY_WAGE: 'Diária',
}
const draftLabels: Record<AssistantDraft['draftType'], string> = {
  CREATE_EXPENSE: 'Nova despesa', CREATE_REVENUE: 'Nova receita', CREATE_BILL: 'Novo boleto',
  CREATE_BILL_INSTALLMENT_GROUP: 'Novo parcelamento', CREATE_EMPLOYEE_PAYMENT: 'Pagamento de funcionário',
}

export async function formatWhatsAppDraft(companyId: string, draft: AssistantDraft, code: string) {
  const payload = draft.payload as Record<string, unknown>
  const entityNames = new Map<string, string>()
  const relations = [
    ['accountId', prisma.account], ['categoryId', prisma.category], ['supplierId', prisma.supplier],
    ['safraId', prisma.safra], ['productId', prisma.product], ['employeeId', prisma.employee],
  ] as const
  await Promise.all(relations.map(async ([field, model]) => {
    if (typeof payload[field] !== 'string') return
    // All delegates share this projection; the union has incompatible generic overloads.
    const finder = model as unknown as { findFirst: (args: unknown) => Promise<{ name: string } | null> }
    const entity = await finder.findFirst({ where: { id: payload[field], companyId, deletedAt: null }, select: { name: true } })
    entityNames.set(field, entity?.name ?? 'Cadastro indisponível — confira no painel')
  }))
  const fields = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
    .map(([field, value]) => {
      let display = entityNames.get(field) ?? valueLabels[String(value)] ?? String(value)
      if (['amount', 'totalAmount', 'unitPrice'].includes(field)) {
        display = Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      } else if (['date', 'dueDate', 'firstDueDate', 'paidAt', 'receivedAt'].includes(field)) {
        display = new Date(value as string | Date).toLocaleDateString('pt-BR')
      }
      return `${fieldLabels[field] ?? field}: ${display}`
    })
  return [draftLabels[draft.draftType], ...fields,
    !payload.accountId ? 'Conta: não vinculada (não altera saldo de conta).' : '',
    draft.missingFields.length
      ? `Falta informar: ${draft.missingFields.map((field) => fieldLabels[field] ?? field).join(', ')}. Envie os dados por nome.`
      : `Confira todos os dados. Para salvar, digite CONFIRMAR ${code}. Código válido por 30 minutos.`,
    'Para descartar ou refazer valores/datas, envie CANCELAR.',
  ].filter(Boolean).join('\n')
}

async function processMessage(config: WhatsAppConfig, identity: Identity, message: IncomingMessage, lockToken: string) {
  const session = await prisma.whatsAppSession.findUniqueOrThrow({ where: { id: identity.sessionId } })
  const typedText = message.type === 'text' ? message.text?.body.trim() : undefined
  if (typedText?.toUpperCase() === 'CANCELAR') {
    await clearDraft(identity.sessionId)
    return 'Rascunho descartado. Nenhum lançamento foi salvo por este comando.'
  }
  if (typedText && /^(ajuda|menu)$/i.test(typedText)) return HELP
  const confirmation = typedText?.match(/^CONFIRMAR\s+([A-F0-9]{8})$/i)
  if (confirmation) {
    if (!FINANCIAL_ROLES.has(identity.role)) return 'Seu usuário não tem permissão para salvar lançamentos financeiros.'
    if (!session.draft || !session.draftCode || session.draftCode !== confirmation[1]!.toUpperCase() ||
        !session.draftExpiresAt || session.draftExpiresAt <= new Date() ||
        session.draftUserId !== identity.user.id || session.draftCompanyId !== identity.company.id) {
      return 'Código inválido ou expirado. Envie novamente os dados para preparar um rascunho.'
    }
    const draft = assistantDraftSchema.parse(session.draft)
    if (draft.missingFields.length) return 'Complete os campos do rascunho antes de confirmar.'
    // Consume BEFORE calling existing services. A crash after a financial commit
    // must never cause an automatic replay. The inbox records uncertain outcomes.
    const consumed = await prisma.whatsAppSession.updateMany({
      where: { id: identity.sessionId, lockToken, lockedUntil: { gt: new Date() }, draftCode: session.draftCode },
      data: CLEAR_DRAFT,
    })
    if (consumed.count !== 1) return 'Este rascunho não está mais disponível. Solicite um novo rascunho.'
    const req = { user: identity.user, company: identity.company, membership: { role: identity.role },
      headers: { 'user-agent': 'AgroFinance-WhatsApp' } } as Request
    const result = await AssistantService.confirmDraft(identity.company.id, { draft }, req)
    const created = result.created as { id?: string }
    return `Lançamento salvo: ${draftLabels[draft.draftType]}.${created.id ? `\nReferência: ${created.id}` : ''}\nConfira os detalhes no painel.`
  }
  if (typedText && /^(confirmar|confirma|sim)\b/i.test(typedText)) {
    return 'Para salvar, digite CONFIRMAR seguido do código exibido no rascunho.'
  }
  if (!typedText && !['audio', 'image', 'video', 'document'].includes(message.type)) return HELP
  const text = typedText ?? await interpretWhatsAppMedia(config, message)
  // Audio/images/video can prepare drafts, but can never execute confirmations.
  if (!typedText && /\b(confirmar|confirma|cancelar)\b/i.test(text)) {
    return 'Para confirmar ou cancelar, envie o comando por texto. Anexos não confirmam operações.'
  }
  const currentDraft = session.draft && session.draftExpiresAt && session.draftExpiresAt > new Date() &&
    session.draftUserId === identity.user.id && session.draftCompanyId === identity.company.id
    ? assistantDraftSchema.parse(session.draft) : undefined
  const result = await AssistantService.chat(identity.company.id, { message: text,
    context: { currentDraft, currentRoute: '/whatsapp' } })
  if (result.draft) {
    if (!FINANCIAL_ROLES.has(identity.role)) {
      await clearDraft(identity.sessionId)
      return 'Seu usuário pode consultar, mas não salvar lançamentos financeiros.'
    }
    const parsedDraft = assistantDraftSchema.safeParse(result.draft)
    if (!parsedDraft.success) {
      await clearDraft(identity.sessionId)
      return 'Não consegui montar um rascunho válido. Informe o tipo de lançamento, valor e data. Para parcelamentos, inclua a quantidade de parcelas.'
    }
    const draft = withMissingFields(parsedDraft.data)
    const code = randomBytes(4).toString('hex').toUpperCase()
    const preview = await formatWhatsAppDraft(identity.company.id, draft, code)
    await prisma.whatsAppSession.update({ where: { id: identity.sessionId }, data: {
      draft: JSON.parse(JSON.stringify(draft)) as Prisma.InputJsonValue, draftCode: code,
      draftExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      draftUserId: identity.user.id, draftCompanyId: identity.company.id,
    } })
    return preview
  }
  // Do not leave an old confirmation active after an unrecognized correction.
  await clearDraft(identity.sessionId)
  return `${typedText ? '' : `Entendi do anexo: ${text}\n\n`}${result.answer}`
}

export async function processWhatsAppQueue() {
  const config = getWhatsAppConfig()
  if (!config) return
  const identity = await resolveWhatsAppIdentity(config)
  if (!identity) return
  const token = randomUUID()
  const lock = await prisma.whatsAppSession.updateMany({
    where: { id: identity.sessionId, OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }] },
    data: { lockToken: token, lockedUntil: new Date(Date.now() + 10 * 60 * 1000) },
  })
  if (lock.count !== 1) return
  try {
    await prisma.whatsAppSession.updateMany({
      where: { id: identity.sessionId, draftExpiresAt: { lt: new Date() } }, data: CLEAR_DRAFT,
    })
    // PROCESSING from a previous owner is uncertain: never replay financial work.
    const interrupted = await prisma.whatsAppMessage.updateMany({
      where: { sessionId: identity.sessionId, status: 'PROCESSING' },
      data: { status: 'READY', payload: Prisma.DbNull, reply: INTERRUPTED_REPLY },
    })
    if (interrupted.count) await clearDraft(identity.sessionId)
    const next = await prisma.whatsAppMessage.findFirst({
      where: { sessionId: identity.sessionId, status: { in: ['PENDING', 'READY'] } },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    })
    if (!next) return
    logger.info({ messageId: next.id, status: next.status }, 'WhatsApp: processando fila')
    if (next.receivedAt.getTime() < Date.now() - 23 * 60 * 60 * 1000) {
      await prisma.whatsAppMessage.update({ where: { id: next.id },
        data: { status: 'EXPIRED', payload: Prisma.DbNull, reply: null } })
      await clearDraft(identity.sessionId)
      return
    }
    let reply = next.reply
    if (next.status === 'PENDING') {
      await prisma.whatsAppMessage.update({ where: { id: next.id }, data: { status: 'PROCESSING' } })
      try {
        reply = await processMessage(config, identity, incomingMessageSchema.parse(next.payload), token)
      } catch (error) {
        await clearDraft(identity.sessionId)
        const incoming = incomingMessageSchema.safeParse(next.payload)
        const wasConfirmation = incoming.success && incoming.data.type === 'text' &&
          /^CONFIRMAR\s+/i.test(incoming.data.text?.body.trim() ?? '')
        reply = error instanceof WhatsAppInputError ? error.message : wasConfirmation ? INTERRUPTED_REPLY :
          'Não consegui interpretar ou consultar esses dados. Nenhum lançamento foi salvo. Tente uma mensagem mais simples ou confira a configuração do assistente.'
        logger.warn({ messageId: next.id }, 'WhatsApp: processamento não concluído; não será repetido')
      }
      await prisma.whatsAppMessage.update({ where: { id: next.id },
        data: { status: 'READY', reply, payload: Prisma.DbNull } })
    }
    if (next.nextSendAt && next.nextSendAt > new Date()) return
    try {
      await sendWhatsAppReply(config, reply ?? 'Não consegui processar a mensagem. Envie AJUDA para ver exemplos.')
    } catch {
      const attempts = next.sendAttempts + 1
      await prisma.whatsAppMessage.update({ where: { id: next.id }, data: {
        sendAttempts: attempts, status: attempts >= 5 ? 'DELIVERY_FAILED' : 'READY',
        nextSendAt: new Date(Date.now() + Math.min(300000, 10000 * 2 ** attempts)),
      } })
      logger.warn({ messageId: next.id }, 'WhatsApp: resposta não entregue')
      return
    }
    await prisma.whatsAppMessage.update({ where: { id: next.id },
      data: { status: 'DONE', reply: null, nextSendAt: null } })
    logger.info({ messageId: next.id }, 'WhatsApp: resposta aceita pela API da Meta')
  } finally {
    await prisma.whatsAppSession.updateMany({ where: { id: identity.sessionId, lockToken: token },
      data: { lockToken: null, lockedUntil: null } })
  }
}

export function startWhatsAppWorker() {
  try {
    if (!getWhatsAppConfig()) return async () => undefined
  } catch (error) {
    if (!(error instanceof WhatsAppConfigurationError)) throw error
    logger.error({ reason: error.message }, 'WhatsApp desativado por configuração inválida; API permanece disponível')
    return async () => undefined
  }
  let running: Promise<void> | undefined
  const tick = () => {
    if (running) return
    running = processWhatsAppQueue()
      .catch(() => logger.error('WhatsApp: falha na fila; verifique configuração e migração do banco'))
      .finally(() => { running = undefined })
  }
  const timer = setInterval(tick, 2000)
  logger.info('WhatsApp: worker iniciado')
  timer.unref()
  tick()
  return async () => { clearInterval(timer); await running }
}
