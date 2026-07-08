import { Router } from 'express'
import { NotificationService } from './notification.service'
import { ReminderRuleService } from './reminder-rule.service'
import { DailyReminderJobService } from './daily-reminder-job.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import { pushSubscriptionSchema, unsubscribePushSchema } from './notification.schemas'
import {
  createReminderRuleSchema,
  reminderRuleParamsSchema,
  updateReminderRuleSchema,
} from './reminder-rule.schemas'

export const notificationRouter = Router()

notificationRouter.post(
  '/jobs/daily-reminders',
  asyncHandler(async (req, res) => {
    DailyReminderJobService.assertCronSecret(req.get('x-cron-secret'))
    const data = await DailyReminderJobService.run({ dryRun: req.body?.dryRun === true })
    res.json({ success: true, data })
  }),
)

notificationRouter.use(authenticate)
notificationRouter.use(requireCompany)

notificationRouter.get(
  '/alerts',
  anyMember,
  asyncHandler(async (req, res) => {
    const data = await NotificationService.getAlerts(req.company!.id)
    res.json({ success: true, data })
  }),
)

notificationRouter.get(
  '/reminder-rules',
  anyMember,
  asyncHandler(async (req, res) => {
    const data = await ReminderRuleService.list(req.company!.id, req.user!.id)
    res.json({ success: true, data })
  }),
)

notificationRouter.get(
  '/reminder-rules/preview',
  anyMember,
  asyncHandler(async (req, res) => {
    const data = await ReminderRuleService.preview(req.company!.id, req.user!.id)
    res.json({ success: true, data })
  }),
)

notificationRouter.post(
  '/reminder-rules',
  anyMember,
  validate(createReminderRuleSchema),
  asyncHandler(async (req, res) => {
    const data = await ReminderRuleService.create(req.company!.id, req.user!.id, req.body)
    res.status(201).json({ success: true, data })
  }),
)

notificationRouter.patch(
  '/reminder-rules/:id',
  anyMember,
  validate(reminderRuleParamsSchema, 'params'),
  validate(updateReminderRuleSchema),
  asyncHandler(async (req, res) => {
    const data = await ReminderRuleService.update(req.company!.id, req.user!.id, req.params.id, req.body)
    res.json({ success: true, data })
  }),
)

notificationRouter.delete(
  '/reminder-rules/:id',
  anyMember,
  validate(reminderRuleParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const data = await ReminderRuleService.delete(req.company!.id, req.user!.id, req.params.id)
    res.json({ success: true, data })
  }),
)

notificationRouter.get(
  '/push/public-key',
  anyMember,
  asyncHandler(async (_req, res) => {
    const data = NotificationService.getPublicKey()
    res.json({ success: true, data })
  }),
)

notificationRouter.post(
  '/push/subscribe',
  anyMember,
  validate(pushSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const subscription = await NotificationService.subscribe(
      req.company!.id,
      req.user!.id,
      req.body,
      req.get('user-agent') ?? null,
    )
    res.status(201).json({ success: true, data: { id: subscription.id, active: subscription.active } })
  }),
)

notificationRouter.delete(
  '/push/unsubscribe',
  anyMember,
  validate(unsubscribePushSchema),
  asyncHandler(async (req, res) => {
    const data = await NotificationService.unsubscribe(req.company!.id, req.user!.id, req.body.endpoint)
    res.json({ success: true, data })
  }),
)

notificationRouter.post(
  '/push/test',
  anyMember,
  asyncHandler(async (req, res) => {
    const data = await NotificationService.sendTest(req.company!.id, req.user!.id)
    res.json({ success: true, data })
  }),
)
