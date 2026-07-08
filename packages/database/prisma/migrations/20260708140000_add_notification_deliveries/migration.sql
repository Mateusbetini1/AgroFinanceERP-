CREATE TYPE "notification_delivery_source_type" AS ENUM ('REMINDER_RULE', 'BILL_ALERT', 'EXPENSE_ALERT', 'REVENUE_ALERT', 'DAILY_SUMMARY');

CREATE TYPE "notification_delivery_channel" AS ENUM ('PUSH');

CREATE TYPE "notification_delivery_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reminder_rule_id" TEXT,
    "source_type" "notification_delivery_source_type" NOT NULL,
    "source_id" TEXT,
    "channel" "notification_delivery_channel" NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "lead_days" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "notification_delivery_status" NOT NULL DEFAULT 'PENDING',
    "dedupe_key" TEXT NOT NULL,
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_deliveries_dedupe_key_key" ON "notification_deliveries"("dedupe_key");
CREATE INDEX "notification_deliveries_company_id_user_id_target_date_idx" ON "notification_deliveries"("company_id", "user_id", "target_date");
CREATE INDEX "notification_deliveries_company_id_status_idx" ON "notification_deliveries"("company_id", "status");
CREATE INDEX "notification_deliveries_reminder_rule_id_idx" ON "notification_deliveries"("reminder_rule_id");

ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_reminder_rule_id_fkey" FOREIGN KEY ("reminder_rule_id") REFERENCES "reminder_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
