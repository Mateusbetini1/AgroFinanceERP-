ALTER TABLE "reminder_rules" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "reminder_rules_company_id_user_id_deleted_at_idx" ON "reminder_rules"("company_id", "user_id", "deleted_at");
