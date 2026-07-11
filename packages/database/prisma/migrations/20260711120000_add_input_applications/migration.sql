CREATE TABLE "input_applications" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "supply_id" TEXT NOT NULL,
    "application_date" TIMESTAMP(3) NOT NULL,
    "quantity_base" DECIMAL(15,3) NOT NULL,
    "unit" "supply_unit" NOT NULL,
    "original_quantity" DECIMAL(15,3) NOT NULL,
    "unit_cost_base_snapshot" DECIMAL(15,6) NOT NULL,
    "total_cost" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "input_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "input_application_allocations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "safra_id" TEXT NOT NULL,
    "farm_location_id" TEXT,
    "quantity_base" DECIMAL(15,3) NOT NULL,
    "unit_cost_base_snapshot" DECIMAL(15,6) NOT NULL,
    "total_cost" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "input_application_allocations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "input_stock_movements"
ADD COLUMN "application_allocation_id" TEXT;

CREATE INDEX "input_applications_company_id_idx" ON "input_applications"("company_id");
CREATE INDEX "input_applications_company_id_supply_id_idx" ON "input_applications"("company_id", "supply_id");
CREATE INDEX "input_applications_company_id_application_date_idx" ON "input_applications"("company_id", "application_date");

CREATE INDEX "input_application_allocations_company_id_idx" ON "input_application_allocations"("company_id");
CREATE INDEX "input_application_allocations_company_id_safra_id_idx" ON "input_application_allocations"("company_id", "safra_id");
CREATE INDEX "input_application_allocations_company_id_farm_location_id_idx" ON "input_application_allocations"("company_id", "farm_location_id");
CREATE INDEX "input_application_allocations_application_id_idx" ON "input_application_allocations"("application_id");
CREATE INDEX "input_stock_movements_application_allocation_id_idx" ON "input_stock_movements"("application_allocation_id");

ALTER TABLE "input_applications"
ADD CONSTRAINT "input_applications_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "input_applications"
ADD CONSTRAINT "input_applications_supply_id_fkey"
FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "input_application_allocations"
ADD CONSTRAINT "input_application_allocations_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "input_application_allocations"
ADD CONSTRAINT "input_application_allocations_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "input_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "input_application_allocations"
ADD CONSTRAINT "input_application_allocations_safra_id_fkey"
FOREIGN KEY ("safra_id") REFERENCES "safras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "input_application_allocations"
ADD CONSTRAINT "input_application_allocations_farm_location_id_fkey"
FOREIGN KEY ("farm_location_id") REFERENCES "farm_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "input_stock_movements"
ADD CONSTRAINT "input_stock_movements_application_allocation_id_fkey"
FOREIGN KEY ("application_allocation_id") REFERENCES "input_application_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
