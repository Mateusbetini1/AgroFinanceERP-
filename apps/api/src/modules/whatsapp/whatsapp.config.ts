import { env } from '../../config/env'

export function getWhatsAppConfig() {
  if (!env.WHATSAPP_ENABLED) return null
  const config = {
    token: env.WHATSAPP_ACCESS_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    version: env.WHATSAPP_GRAPH_VERSION,
    allowedPhone: env.WHATSAPP_ALLOWED_PHONE,
    userEmail: env.WHATSAPP_USER_EMAIL,
    companyId: env.WHATSAPP_COMPANY_ID,
  }
  if (!config.token || !config.appSecret || !config.verifyToken || !config.phoneNumberId ||
      !config.version || !config.allowedPhone || !config.userEmail ||
      !/^\d{8,15}$/.test(config.allowedPhone) || !/^\d+$/.test(config.phoneNumberId)) {
    throw new Error('Configuração do WhatsApp incompleta. Consulte docs/whatsapp.md.')
  }
  return { ...config, token: config.token, appSecret: config.appSecret, verifyToken: config.verifyToken,
    phoneNumberId: config.phoneNumberId, version: config.version,
    allowedPhone: config.allowedPhone, userEmail: config.userEmail }
}

export type WhatsAppConfig = NonNullable<ReturnType<typeof getWhatsAppConfig>>
