-- CreateEnum
CREATE TYPE "input_stock_movement_type" AS ENUM (
  'PURCHASE',
  'APPLICATION',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT'
);

-- CreateEnum
CREATE TYPE "input_stock_movement_direction" AS ENUM (
  'IN',
  'OUT'
);

-- CreateTable
CREATE TABLE "input_purchases" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "supplier_id" TEXT,
  "purchase_date" TIMESTAMP(3) NOT NULL,
  "document_number" TEXT,
  "total_amount" DECIMAL(15,2) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "input_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_purchase_lines" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "purchase_id" TEXT NOT NULL,
  "supply_id" TEXT NOT NULL,
  "quantity" DECIMAL(15,3) NOT NULL,
  "unit" "supply_unit" NOT NULL,
  "quantity_base" DECIMAL(15,3) NOT NULL,
  "unit_cost_base" DECIMAL(15,6) NOT NULL,
  "total_amount" DECIMAL(15,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "input_purchase_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_stock_balances" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "supply_id" TEXT NOT NULL,
  "quantity_base" DECIMAL(15,3) NOT NULL DEFAULT 0,
  "average_cost_base" DECIMAL(15,6) NOT NULL DEFAULT 0,
  "total_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "input_stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_stock_movements" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "supply_id" TEXT NOT NULL,
  "type" "input_stock_movement_type" NOT NULL,
  "direction" "input_stock_movement_direction" NOT NULL,
  "quantity_base" DECIMAL(15,3) NOT NULL,
  "unit_cost_base" DECIMAL(15,6) NOT NULL,
  "total_cost" DECIMAL(15,2) NOT NULL,
  "balance_quantity_after" DECIMAL(15,3) NOT NULL,
  "balance_value_after" DECIMAL(15,2) NOT NULL,
  "purchase_line_id" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "input_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "input_purchases_company_id_idx" ON "input_purchases"("company_id");

-- CreateIndex
CREATE INDEX "input_purchases_company_id_purchase_date_idx" ON "input_purchases"("company_id", "purchase_date");

-- CreateIndex
CREATE INDEX "input_purchases_company_id_supplier_id_idx" ON "input_purchases"("company_id", "supplier_id");

-- CreateIndex
CREATE INDEX "input_purchase_lines_company_id_idx" ON "input_purchase_lines"("company_id");

-- CreateIndex
CREATE INDEX "input_purchase_lines_purchase_id_idx" ON "input_purchase_lines"("purchase_id");

-- CreateIndex
CREATE INDEX "input_purchase_lines_company_id_supply_id_idx" ON "input_purchase_lines"("company_id", "supply_id");

-- CreateIndex
CREATE UNIQUE INDEX "input_stock_balances_company_id_supply_id_key" ON "input_stock_balances"("company_id", "supply_id");

-- CreateIndex
CREATE INDEX "input_stock_balances_company_id_idx" ON "input_stock_balances"("company_id");

-- CreateIndex
CREATE INDEX "input_stock_movements_company_id_idx" ON "input_stock_movements"("company_id");

-- CreateIndex
CREATE INDEX "input_stock_movements_company_id_supply_id_idx" ON "input_stock_movements"("company_id", "supply_id");

-- CreateIndex
CREATE INDEX "input_stock_movements_company_id_occurred_at_idx" ON "input_stock_movements"("company_id", "occurred_at");

-- CreateIndex
CREATE INDEX "input_stock_movements_purchase_line_id_idx" ON "input_stock_movements"("purchase_line_id");

-- AddForeignKey
ALTER TABLE "input_purchases"
  ADD CONSTRAINT "input_purchases_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_purchases"
  ADD CONSTRAINT "input_purchases_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_purchase_lines"
  ADD CONSTRAINT "input_purchase_lines_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_purchase_lines"
  ADD CONSTRAINT "input_purchase_lines_purchase_id_fkey"
  FOREIGN KEY ("purchase_id") REFERENCES "input_purchases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_purchase_lines"
  ADD CONSTRAINT "input_purchase_lines_supply_id_fkey"
  FOREIGN KEY ("supply_id") REFERENCES "supplies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_stock_balances"
  ADD CONSTRAINT "input_stock_balances_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_stock_balances"
  ADD CONSTRAINT "input_stock_balances_supply_id_fkey"
  FOREIGN KEY ("supply_id") REFERENCES "supplies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_stock_movements"
  ADD CONSTRAINT "input_stock_movements_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_stock_movements"
  ADD CONSTRAINT "input_stock_movements_supply_id_fkey"
  FOREIGN KEY ("supply_id") REFERENCES "supplies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_stock_movements"
  ADD CONSTRAINT "input_stock_movements_purchase_line_id_fkey"
  FOREIGN KEY ("purchase_line_id") REFERENCES "input_purchase_lines"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
