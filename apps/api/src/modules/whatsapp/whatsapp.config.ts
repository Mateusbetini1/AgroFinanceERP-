import { env } from '../../config/env'
import { AppError } from '../../shared/errors/AppError'

export class WhatsAppConfigurationError extends AppError {
  constructor(fields: string[]) {
    super(`WhatsApp não configurado: ${fields.join('; ')}. Confira Environment no Render.`, 503, 'WHATSAPP_NOT_CONFIGURED')
    Object.setPrototypeOf(this, WhatsAppConfigurationError.prototype)
  }
}

export function getWhatsAppConfig() {
  if (!env.WHATSAPP_ENABLED) return null
  const config = {
    token: env.WHATSAPP_ACCESS_TOKEN?.trim() ?? '',
    appSecret: env.WHATSAPP_APP_SECRET?.trim() ?? '',
    verifyToken: env.WHATSAPP_VERIFY_TOKEN?.trim() ?? '',
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? '',
    version: env.WHATSAPP_GRAPH_VERSION?.trim() ?? '',
    allowedPhone: env.WHATSAPP_ALLOWED_PHONE?.trim() ?? '',
    userEmail: env.WHATSAPP_USER_EMAIL?.trim() ?? '',
    companyId: env.WHATSAPP_COMPANY_ID?.trim() || undefined,
  }
  const required = {
    WHATSAPP_ACCESS_TOKEN: config.token,
    WHATSAPP_APP_SECRET: config.appSecret,
    WHATSAPP_VERIFY_TOKEN: config.verifyToken,
    WHATSAPP_PHONE_NUMBER_ID: config.phoneNumberId,
    WHATSAPP_GRAPH_VERSION: config.version,
    WHATSAPP_ALLOWED_PHONE: config.allowedPhone,
    WHATSAPP_USER_EMAIL: config.userEmail,
  }
  const errors = Object.entries(required).filter(([, value]) => !value).map(([name]) => `${name} ausente ou vazio`)
  if (config.allowedPhone && !/^\d{8,15}$/.test(config.allowedPhone)) {
    errors.push('WHATSAPP_ALLOWED_PHONE deve conter somente dígitos, com país e DDD')
  }
  if (config.phoneNumberId && !/^\d+$/.test(config.phoneNumberId)) {
    errors.push('WHATSAPP_PHONE_NUMBER_ID deve conter somente dígitos')
  }
  if (config.version && !/^v\d+\.0$/.test(config.version)) {
    errors.push('WHATSAPP_GRAPH_VERSION deve estar no formato v25.0')
  }
  if (errors.length) throw new WhatsAppConfigurationError(errors)
  return config
}

export type WhatsAppConfig = NonNullable<ReturnType<typeof getWhatsAppConfig>>
