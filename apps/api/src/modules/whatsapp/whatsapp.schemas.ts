import { z } from 'zod'

const mediaSchema = z.object({
  id: z.string().regex(/^\d+$/),
  mime_type: z.string().max(100).optional(),
  caption: z.string().max(1000).optional(),
})

export const incomingMessageSchema = z.object({
  id: z.string().min(1).max(250),
  from: z.string().regex(/^\d{8,15}$/),
  timestamp: z.string().regex(/^\d+$/),
  type: z.string().max(40),
  text: z.object({ body: z.string().min(1).max(1000) }).optional(),
  audio: mediaSchema.optional(),
  image: mediaSchema.optional(),
  video: mediaSchema.optional(),
  document: mediaSchema.optional(),
})

export const webhookSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    changes: z.array(z.object({
      field: z.string(),
      value: z.object({
        metadata: z.object({ phone_number_id: z.string() }).optional(),
        messages: z.array(z.unknown()).optional(),
      }),
    })).max(100),
  })).max(100),
})

export type IncomingMessage = z.infer<typeof incomingMessageSchema>
