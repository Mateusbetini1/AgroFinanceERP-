-- CreateEnum
CREATE TYPE "supply_category" AS ENUM (
  'DEFENSIVE',
  'FERTILIZER',
  'SEED',
  'SUBSTRATE',
  'PACKAGING',
  'FUEL',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "supply_unit" AS ENUM (
  'KG',
  'G',
  'L',
  'ML',
  'UNIT',
  'BAG',
  'BOX'
);

-- CreateTable
CREATE TABLE "supplies" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "supply_category" NOT NULL,
  "base_unit" "supply_unit" NOT NULL,
  "purchase_unit_default" "supply_unit" NOT NULL,
  "package_size_base_quantity" DECIMAL(15,3),
  "package_size_unit" "supply_unit",
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplies_company_id_idx" ON "supplies"("company_id");

-- CreateIndex
CREATE INDEX "supplies_company_id_active_idx" ON "supplies"("company_id", "active");

-- CreateIndex
CREATE INDEX "supplies_company_id_category_idx" ON "supplies"("company_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "supplies_company_id_name_active_unique"
  ON "supplies"("company_id", lower("name"))
  WHERE "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "supplies"
  ADD CONSTRAINT "supplies_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
