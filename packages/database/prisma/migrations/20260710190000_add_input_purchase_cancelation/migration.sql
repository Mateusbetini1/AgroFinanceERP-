-- CreateEnum
CREATE TYPE "input_purchase_status" AS ENUM ('ACTIVE', 'CANCELED');

-- AlterEnum
ALTER TYPE "input_stock_movement_type" ADD VALUE 'PURCHASE_CANCEL';

-- AlterTable
ALTER TABLE "input_purchases"
  ADD COLUMN "status" "input_purchase_status" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "canceled_at" TIMESTAMP(3),
  ADD COLUMN "canceled_by_user_id" TEXT,
  ADD COLUMN "cancel_reason" TEXT;

-- CreateIndex
CREATE INDEX "input_purchases_company_id_status_idx" ON "input_purchases"("company_id", "status");

-- AddForeignKey
ALTER TABLE "input_purchases"
  ADD CONSTRAINT "input_purchases_canceled_by_user_id_fkey"
  FOREIGN KEY ("canceled_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
