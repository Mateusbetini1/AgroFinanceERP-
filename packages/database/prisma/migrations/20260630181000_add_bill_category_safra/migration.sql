-- Add optional financial classification links to bills.
ALTER TABLE "bills" ADD COLUMN "category_id" TEXT;
ALTER TABLE "bills" ADD COLUMN "safra_id" TEXT;

ALTER TABLE "bills"
  ADD CONSTRAINT "bills_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bills"
  ADD CONSTRAINT "bills_safra_id_fkey"
  FOREIGN KEY ("safra_id") REFERENCES "safras"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "bills_company_id_category_id_idx" ON "bills"("company_id", "category_id");
CREATE INDEX "bills_company_id_safra_id_idx" ON "bills"("company_id", "safra_id");
