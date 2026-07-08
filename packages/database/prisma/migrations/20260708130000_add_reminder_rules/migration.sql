CREATE TYPE "reminder_rule_type" AS ENUM ('BILL', 'EXPENSE', 'REVENUE', 'GENERAL');

CREATE TYPE "reminder_recurrence_type" AS ENUM ('MONTHLY_DAY', 'ONE_TIME');

CREATE TABLE "reminder_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "reminder_rule_type" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "recurrence_type" "reminder_recurrence_type" NOT NULL,
    "day_of_month" INTEGER,
    "due_date" TIMESTAMP(3),
    "lead_days" INTEGER[] NOT NULL,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reminder_rules_company_id_user_id_idx" ON "reminder_rules"("company_id", "user_id");
CREATE INDEX "reminder_rules_company_id_user_id_active_idx" ON "reminder_rules"("company_id", "user_id", "active");
CREATE INDEX "reminder_rules_company_id_recurrence_type_idx" ON "reminder_rules"("company_id", "recurrence_type");

ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
