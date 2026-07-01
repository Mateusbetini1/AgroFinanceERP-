import { Router } from 'express'
import { AssistantService } from './assistant.service'
import {
  assistantChatSchema,
  confirmAssistantDraftSchema,
  type AssistantChatDto,
  type ConfirmAssistantDraftDto,
} from './assistant.schemas'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember, financialAccess } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'

export const assistantRouter = Router()

assistantRouter.use(authenticate)
assistantRouter.use(requireCompany)

assistantRouter.post(
  '/chat',
  anyMember,
  validate(assistantChatSchema, 'body'),
  asyncHandler(async (req, res) => {
    const data = await AssistantService.chat(req.company!.id, req.body as AssistantChatDto)
    res.json({ success: true, data })
  }),
)

assistantRouter.post(
  '/drafts/confirm',
  financialAccess,
  validate(confirmAssistantDraftSchema, 'body'),
  asyncHandler(async (req, res) => {
    const data = await AssistantService.confirmDraft(
      req.company!.id,
      req.body as ConfirmAssistantDraftDto,
      req,
    )
    res.status(201).json({ success: true, data })
  }),
)
