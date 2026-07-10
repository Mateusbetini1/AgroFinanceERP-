# Input Inventory Module

## 1. Objective

The input inventory module will separate financial purchases from productive consumption by safra.
It will allow AgroFinance ERP to track supplies in stock, calculate moving average cost, consume supplies by safra and farm location, and include the real consumed cost in safra reports without creating duplicate financial outflows.

Core goals:

- Register supplies as inventory items.
- Register supply purchases and increase stock.
- Link supply purchases to existing financial records when applicable.
- Register applications/consumption by safra.
- Decrease stock only when consumption happens.
- Allocate consumed cost to one or more safras.
- Keep financial balance rules unchanged.

## 2. Financial Expense, Inventory, and Productive Cost

These concepts must remain separate.

### Financial expense

A financial expense is the payable or paid cash obligation. It is represented by existing financial entities such as `Expense`, `Bill`, or `BillGroup`.

Examples:

- A paid expense for R$ 100.00.
- A pending bill for R$ 100.00.
- A bill group with installments for a supply purchase.

Financial records affect cash flow and account balance according to the existing rules.

### Inventory

Inventory is the quantity and value of supplies still available for future use.

Example:

- Purchase: 10 kg of Defensive X for R$ 100.00.
- Inventory after purchase: 10 kg available, R$ 100.00 stock value.

Inventory is not automatically a safra cost. It only becomes productive cost when consumed.

### Productive cost by safra

Productive cost is the proportional cost allocated to a safra when a supply is applied or consumed.

Example:

- Current average cost: R$ 10.00/kg.
- Application: 0.500 kg in Safra Pimentao Vermelho.
- Productive cost: R$ 5.00.

This does not generate a new financial outflow because the money already left, or will leave, through the linked financial purchase.

## 3. Product Is Not Reused

`Product` remains the agricultural product/crop sold or planted, such as pimentao, pepino, or tomate.

Supplies must use a separate entity, tentatively named `Supply`, because they represent inventory inputs such as defensives, fertilizers, seeds, substrates, packaging, and other materials.

Reasons not to reuse `Product`:

- `Product` is already tied to `Revenue` and `Safra`.
- Supplies have inventory behavior and cost movement rules.
- Crops and inputs have different units, categories, lifecycle, and reports.
- Reusing `Product` would make filters, forms, reports, and business rules ambiguous.

## 4. Future Entities

The following entities are proposed for future implementation. This document does not create migrations.

### Supply

Inventory item master data.

Suggested fields:

- `id`
- `companyId`
- `name`
- `category`
- `baseUnit`
- `defaultPurchaseUnit`
- `packageSizeBaseQuantity`
- `active`
- `createdAt`
- `updatedAt`
- `deletedAt`

### InputPurchase

Header for a supply purchase.

Suggested fields:

- `id`
- `companyId`
- `supplierId`
- `expenseId`
- `billId`
- `billGroupId`
- `purchaseDate`
- `documentNumber`
- `totalAmount`
- `notes`
- `createdAt`
- `updatedAt`

Only one financial origin should normally be set: `expenseId`, `billId`, or `billGroupId`.

### InputPurchaseLine

Line item for a purchased supply.

Suggested fields:

- `id`
- `companyId`
- `purchaseId`
- `supplyId`
- `quantity`
- `unit`
- `quantityBase`
- `unitCostBase`
- `totalAmount`

### InputStockBalance

Materialized current stock by supply.

Suggested fields:

- `id`
- `companyId`
- `supplyId`
- `quantityBase`
- `averageCostBase`
- `stockValue`
- `updatedAt`

This table is for fast reads. The auditable source of stock history is `InputStockMovement`.

### InputStockMovement

Immutable stock ledger.

Suggested fields:

- `id`
- `companyId`
- `supplyId`
- `type`
- `direction`
- `quantityBase`
- `unitCostBase`
- `totalCost`
- `balanceQuantityAfter`
- `balanceValueAfter`
- `purchaseLineId`
- `applicationAllocationId`
- `adjustmentId`
- `occurredAt`
- `notes`

Suggested movement types:

- `PURCHASE`
- `APPLICATION`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `LOSS`
- `REVERSAL`

### InputApplication

Header for a supply application/consumption event.

Suggested fields:

- `id`
- `companyId`
- `supplyId`
- `applicationDate`
- `quantityBase`
- `unitCostBaseSnapshot`
- `totalCost`
- `notes`
- `createdAt`
- `updatedAt`

### InputApplicationAllocation

Allocation of an application to one or more safras and optional farm locations.

Suggested fields:

- `id`
- `companyId`
- `applicationId`
- `safraId`
- `farmLocationId`
- `quantityBase`
- `unitCostBaseSnapshot`
- `totalCost`

### InventoryAdjustment

Inventory correction, loss, or initial balance entry.

Suggested fields:

- `id`
- `companyId`
- `supplyId`
- `type`
- `quantityBase`
- `unitCostBase`
- `totalCost`
- `reason`
- `occurredAt`
- `createdAt`

Suggested adjustment types:

- `CORRECTION`
- `LOSS`
- `FOUND`
- `INITIAL_BALANCE`

## 5. Units and Conversions

Every stock movement should store both the user-entered unit and the normalized base quantity.

Recommended base units:

- Mass: `KG`
- Volume: `L`
- Count: `UNIT`

Fixed conversions:

- `KG` to `KG`: multiply by 1.
- `G` to `KG`: divide by 1000.
- `L` to `L`: multiply by 1.
- `ML` to `L`: divide by 1000.
- `UNIT` to `UNIT`: multiply by 1.

Configurable conversions:

- `BAG`: requires `packageSizeBaseQuantity` for the supply, for example 25 kg per bag.
- `BOX`: requires `packageSizeBaseQuantity` for the supply, for example 12 units per box or 10 kg per box.

Rules:

- A supply must have one base unit.
- A purchase or application unit must be compatible with the supply base unit.
- `BAG` and `BOX` cannot be used without a configured package size.
- Reports and cost calculations should use base quantity.
- UI can display the original unit where useful.

## 6. Moving Average Cost

The module should use moving average cost per supply.

On purchase:

```text
newAverageCost =
  (currentStockValue + purchaseLineTotalAmount)
  /
  (currentQuantityBase + purchasedQuantityBase)
```

On stock increase, update:

- `InputStockBalance.quantityBase`
- `InputStockBalance.averageCostBase`
- `InputStockBalance.stockValue`

On stock decrease, use the current average cost before the decrease.

```text
applicationCost = consumedQuantityBase * currentAverageCostBase
```

The average cost can change after later purchases, but past application costs must not change.

## 7. Cost Snapshot on Application

Every application and allocation must store the cost used at the time of consumption.

Fields:

- `unitCostBaseSnapshot`
- `totalCost`

Reason:

- Historical safra cost must remain stable.
- Later purchases must not retroactively change previous safra results.
- Reports can be generated from allocation snapshots without recalculating old costs.

## 8. Purchase Stock Entry

A supply purchase should:

1. Validate the supply and company.
2. Validate the optional financial origin: `Expense`, `Bill`, or `BillGroup`.
3. Validate units and convert quantity to base quantity.
4. Create `InputPurchase`.
5. Create one or more `InputPurchaseLine` records.
6. Create `InputStockMovement` records with direction `IN` and type `PURCHASE`.
7. Update `InputStockBalance`.
8. Recalculate moving average cost.

Financial effects remain with `Expense`, `Bill`, or `BillGroup`.

The stock purchase itself must not update account balance directly.

## 9. Application Stock Decrease

A supply application should:

1. Validate the supply and company.
2. Validate the safra allocation list.
3. Convert consumed quantity to base quantity.
4. Load current stock balance inside a transaction.
5. Reject the operation if available stock is insufficient.
6. Capture the current average cost as the snapshot.
7. Create `InputApplication`.
8. Create `InputApplicationAllocation` records.
9. Create `InputStockMovement` records with direction `OUT` and type `APPLICATION`.
10. Decrease `InputStockBalance.quantityBase`.
11. Decrease `InputStockBalance.stockValue` by the application total cost.

Application must not create `Expense` or `Bill`.

Application must not update `Account.currentBalance`.

## 10. Allocation Across Multiple Safras

An application can be allocated to one or more safras.

Example:

```text
Application: 1.200 kg of Defensive X

Allocations:
- 0.500 kg to Safra Pimentao Vermelho
- 0.700 kg to Safra Pimentao Amarelo
```

Rules:

- Sum of allocation quantities must equal application total quantity.
- Each allocation must use the same `unitCostBaseSnapshot`.
- Each allocation stores its own `totalCost`.
- Optional `farmLocationId` can refine where the supply was used.
- If only one safra is selected, still create one allocation record.

## 11. Preventing Negative Stock

Stock must never go negative unless a future explicit business rule allows it. The initial implementation should reject negative stock.

Required safeguards:

- Validate available quantity before consumption.
- Run application in a database transaction.
- Lock or safely update the stock balance row to avoid concurrent over-consumption.
- Recheck quantity during the transactional update.
- Add service tests for concurrent or repeated consumption scenarios when implementation begins.

The stock ledger and materialized balance must remain consistent.

## 12. Linking Purchase to Expense, Bill, or BillGroup Without Duplicating Cost

Supply purchase may be linked to one financial source:

- `Expense` for direct paid or simple expense.
- `Bill` for a single payable.
- `BillGroup` for installments.

The financial source records the cash obligation. The inventory module records stock and later productive cost.

Important rule:

- A financial record linked to a supply purchase should not be treated as immediate safra productive cost.
- Productive safra cost is created only by `InputApplicationAllocation`.

To avoid duplicated safra cost:

- Do not require `safraId` on the purchase financial record.
- If an existing `Expense` or `Bill` has `safraId`, future reporting rules must avoid counting both the purchase amount and the consumed allocation for the same inventory purchase.
- Prefer a future explicit marker or relation that identifies inventory purchase financial records.

## 13. Safra Report Treatment

The safra report should eventually separate cost sources.

### Direct expenses

Existing `Expense` records linked directly to `safraId` remain direct safra costs, unless they are identified as inventory purchases.

### Direct bills

Existing `Bill` records linked directly to `safraId` remain direct safra costs, unless they are identified as inventory purchases.

### Consumed supplies

`InputApplicationAllocation.totalCost` should be included as productive input cost for the target safra.

Suggested report fields:

- `inputCosts`
- `directExpenseCosts`
- `directBillCosts`
- `totalProductiveCosts`

### Unconsumed inventory

Purchased but unconsumed inventory remains stock value. It should not be included as safra cost.

It may appear in inventory reports, not as productive cost in safra reports.

## 14. Main Risks

Main implementation risks:

- Duplicating cost by counting both purchase financial record and supply consumption.
- Updating financial balance during consumption.
- Recalculating historical application cost after average cost changes.
- Allowing negative stock because of concurrent applications.
- Incorrect unit conversion, especially for `BAG` and `BOX`.
- Mixing agricultural products and supplies in the same entity.
- Making the first implementation too broad.
- Losing auditability by editing old stock movements instead of creating corrections.

## 15. Roadmap

### Phase 1: Analysis and modeling

- Finalize entity names.
- Finalize unit conversion rules.
- Finalize reporting rules to avoid duplication.
- Write implementation plan and test cases.
- No migration until the model is approved.

### Phase 2: Supply catalog

- Add `Supply` CRUD.
- Add supply categories and base units.
- Add frontend list/form.
- No stock movement yet.

### Phase 3: Purchases and stock entry

- Add `InputPurchase` and `InputPurchaseLine`.
- Link purchase to `Expense`, `Bill`, or `BillGroup`.
- Add `InputStockBalance`.
- Add `InputStockMovement` for purchases.
- Calculate moving average cost.

### Phase 4: Application and consumption

- Add `InputApplication`.
- Add `InputApplicationAllocation`.
- Decrease stock.
- Prevent negative stock.
- Snapshot cost at application time.

### Phase 5: Safra report integration

- Include consumed supplies as safra productive cost.
- Separate direct expenses, direct bills, and consumed input costs.
- Prevent duplicated cost from inventory purchase financial records.

### Phase 6: Adjustments and audit improvements

- Add `InventoryAdjustment`.
- Add losses and corrections.
- Add movement reversal flow.
- Add richer inventory history views.

## 16. Required Future Tests

Mandatory service tests for future phases:

- Supply CRUD validates company ownership.
- Purchase increases stock.
- Purchase creates stock movement.
- Purchase calculates average cost on first entry.
- Second purchase recalculates moving average cost.
- Purchase linked to `Expense` does not alter financial rules.
- Purchase linked to `Bill` does not alter financial rules.
- Purchase linked to `BillGroup` does not alter financial rules.
- Application decreases stock.
- Application stores cost snapshot.
- Application does not create financial expense.
- Application does not alter account balance.
- Application greater than available stock fails.
- Application allocation sum must equal application quantity.
- Application can allocate to multiple safras.
- Safra report includes consumed input cost.
- Safra report does not double count inventory purchase and consumption.
- Adjustment in increases stock.
- Adjustment out decreases stock.
- Adjustment out cannot create negative stock.
- Historical movement records are not mutated by later purchases.

## 17. What Not To Change Now

Do not change the following while this is only a planning document:

- No migration.
- No `schema.prisma` change.
- No backend implementation.
- No frontend implementation.
- No safra report implementation.
- No financial balance rule change.
- No `Expense`, `Bill`, or `Revenue` rule change.
- No AI changes.
- No notification changes.
- No OCR changes.
- No upload or attachment changes.
- No seed run.
- No reset.
- No destructive data operation.
