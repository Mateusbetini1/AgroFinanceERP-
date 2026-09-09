import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env'
import { logger } from '../../config/logger'
import { getWhatsAppConfig, WhatsAppConfigurationError } from './whatsapp.config'
import { startWhatsAppWorker } from './whatsapp.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

describe('WhatsApp configuration diagnostics', () => {
  beforeEach(() => {
    resetPrismaMock()
    Object.assign(env, { WHATSAPP_ENABLED: true, WHATSAPP_ACCESS_TOKEN: 'secret-access',
      WHATSAPP_APP_SECRET: 'secret-app', WHATSAPP_VERIFY_TOKEN: 'secret-verify',
      WHATSAPP_PHONE_NUMBER_ID: '12345', WHATSAPP_GRAPH_VERSION: 'v25.0',
      WHATSAPP_ALLOWED_PHONE: '5511999999999', WHATSAPP_USER_EMAIL: 'owner@example.com' })
  })
  afterEach(() => vi.restoreAllMocks())

  it('identifica variáveis ausentes sem revelar valores secretos', () => {
    env.WHATSAPP_VERIFY_TOKEN = '   '
    env.WHATSAPP_PHONE_NUMBER_ID = undefined
    try {
      getWhatsAppConfig()
      expect.fail('expected configuration error')
    } catch (error) {
      expect(error).toBeInstanceOf(WhatsAppConfigurationError)
      const message = (error as Error).message
      expect(message).toContain('WHATSAPP_VERIFY_TOKEN ausente ou vazio')
      expect(message).toContain('WHATSAPP_PHONE_NUMBER_ID ausente ou vazio')
      expect(message).not.toContain('secret-access')
      expect(message).not.toContain('secret-app')
    }
  })
  it('explica formatos inválidos e remove espaços nas extremidades', () => {
    env.WHATSAPP_ALLOWED_PHONE = '+55 (11) 99999-9999'
    env.WHATSAPP_GRAPH_VERSION = '25'
    expect(getWhatsAppConfig).toThrow('WHATSAPP_ALLOWED_PHONE deve conter somente dígitos')
    expect(getWhatsAppConfig).toThrow('WHATSAPP_GRAPH_VERSION deve estar no formato v25.0')
    env.WHATSAPP_ALLOWED_PHONE = ' 5511999999999 '
    env.WHATSAPP_GRAPH_VERSION = ' v25.0 '
    expect(getWhatsAppConfig()).toMatchObject({ allowedPhone: '5511999999999', version: 'v25.0' })
  })
  it('não derruba o startup nem inicia a fila com configuração incompleta', async () => {
    env.WHATSAPP_ACCESS_TOKEN = undefined
    const log = vi.spyOn(logger, 'error')
    const stop = startWhatsAppWorker()
    await stop()
    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      reason: expect.stringContaining('WHATSAPP_ACCESS_TOKEN ausente ou vazio'),
    }), expect.stringContaining('API permanece disponível'))
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })
  it('ignora configuração quando integração está desativada', () => {
    env.WHATSAPP_ENABLED = false
    env.WHATSAPP_ACCESS_TOKEN = undefined
    expect(getWhatsAppConfig()).toBeNull()
  })
})
