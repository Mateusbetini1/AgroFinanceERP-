"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanTier = exports.AuditAction = exports.OcrStatus = exports.FileType = exports.FarmLocationType = exports.SafraStatus = exports.PaymentType = exports.EmployeeStatus = exports.EmployeeType = exports.BillStatus = exports.ExpenseStatus = exports.RevenueStatus = exports.CategoryType = exports.TransactionReference = exports.TransactionType = exports.AccountType = exports.UnitType = exports.MembershipRole = void 0;
var MembershipRole;
(function (MembershipRole) {
    MembershipRole["OWNER"] = "OWNER";
    MembershipRole["ADMIN"] = "ADMIN";
    MembershipRole["FINANCIAL"] = "FINANCIAL";
    MembershipRole["AGRONOMIST"] = "AGRONOMIST";
    MembershipRole["VIEWER"] = "VIEWER";
})(MembershipRole || (exports.MembershipRole = MembershipRole = {}));
var UnitType;
(function (UnitType) {
    UnitType["KG"] = "KG";
    UnitType["BOX"] = "BOX";
    UnitType["UNIT"] = "UNIT";
    UnitType["BAG"] = "BAG";
    UnitType["TON"] = "TON";
    UnitType["LITER"] = "LITER";
    UnitType["METER"] = "METER";
    UnitType["HECTARE"] = "HECTARE";
})(UnitType || (exports.UnitType = UnitType = {}));
var AccountType;
(function (AccountType) {
    AccountType["CASH"] = "CASH";
    AccountType["BANK"] = "BANK";
})(AccountType || (exports.AccountType = AccountType = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["CREDIT"] = "CREDIT";
    TransactionType["DEBIT"] = "DEBIT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionReference;
(function (TransactionReference) {
    TransactionReference["REVENUE"] = "REVENUE";
    TransactionReference["EXPENSE"] = "EXPENSE";
    TransactionReference["BILL"] = "BILL";
    TransactionReference["EMPLOYEE_PAYMENT"] = "EMPLOYEE_PAYMENT";
    TransactionReference["TRANSFER"] = "TRANSFER";
    TransactionReference["ADJUSTMENT"] = "ADJUSTMENT";
})(TransactionReference || (exports.TransactionReference = TransactionReference = {}));
var CategoryType;
(function (CategoryType) {
    CategoryType["EXPENSE"] = "EXPENSE";
    CategoryType["REVENUE"] = "REVENUE";
    CategoryType["BOTH"] = "BOTH";
})(CategoryType || (exports.CategoryType = CategoryType = {}));
var RevenueStatus;
(function (RevenueStatus) {
    RevenueStatus["RECEIVED"] = "RECEIVED";
    RevenueStatus["PENDING"] = "PENDING";
})(RevenueStatus || (exports.RevenueStatus = RevenueStatus = {}));
var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["PAID"] = "PAID";
    ExpenseStatus["PENDING"] = "PENDING";
    ExpenseStatus["OVERDUE"] = "OVERDUE";
})(ExpenseStatus || (exports.ExpenseStatus = ExpenseStatus = {}));
var BillStatus;
(function (BillStatus) {
    BillStatus["PAID"] = "PAID";
    BillStatus["PENDING"] = "PENDING";
    BillStatus["OVERDUE"] = "OVERDUE";
})(BillStatus || (exports.BillStatus = BillStatus = {}));
var EmployeeType;
(function (EmployeeType) {
    EmployeeType["MONTHLY"] = "MONTHLY";
    EmployeeType["DAILY"] = "DAILY";
})(EmployeeType || (exports.EmployeeType = EmployeeType = {}));
var EmployeeStatus;
(function (EmployeeStatus) {
    EmployeeStatus["ACTIVE"] = "ACTIVE";
    EmployeeStatus["INACTIVE"] = "INACTIVE";
})(EmployeeStatus || (exports.EmployeeStatus = EmployeeStatus = {}));
var PaymentType;
(function (PaymentType) {
    PaymentType["SALARY"] = "SALARY";
    PaymentType["OVERTIME"] = "OVERTIME";
    PaymentType["ADVANCE"] = "ADVANCE";
    PaymentType["BONUS"] = "BONUS";
    PaymentType["DAILY_WAGE"] = "DAILY_WAGE";
})(PaymentType || (exports.PaymentType = PaymentType = {}));
var SafraStatus;
(function (SafraStatus) {
    SafraStatus["PLANNED"] = "PLANNED";
    SafraStatus["ACTIVE"] = "ACTIVE";
    SafraStatus["COMPLETED"] = "COMPLETED";
    SafraStatus["CANCELLED"] = "CANCELLED";
})(SafraStatus || (exports.SafraStatus = SafraStatus = {}));
var FarmLocationType;
(function (FarmLocationType) {
    FarmLocationType["GREENHOUSE"] = "GREENHOUSE";
    FarmLocationType["PLOT"] = "PLOT";
    FarmLocationType["FIELD"] = "FIELD";
})(FarmLocationType || (exports.FarmLocationType = FarmLocationType = {}));
var FileType;
(function (FileType) {
    FileType["PDF"] = "PDF";
    FileType["XML"] = "XML";
    FileType["IMAGE"] = "IMAGE";
})(FileType || (exports.FileType = FileType = {}));
var OcrStatus;
(function (OcrStatus) {
    OcrStatus["NONE"] = "NONE";
    OcrStatus["PENDING"] = "PENDING";
    OcrStatus["PROCESSING"] = "PROCESSING";
    OcrStatus["COMPLETED"] = "COMPLETED";
    OcrStatus["FAILED"] = "FAILED";
})(OcrStatus || (exports.OcrStatus = OcrStatus = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var PlanTier;
(function (PlanTier) {
    PlanTier["FREE"] = "FREE";
    PlanTier["PRO"] = "PRO";
    PlanTier["ENTERPRISE"] = "ENTERPRISE";
})(PlanTier || (exports.PlanTier = PlanTier = {}));
//# sourceMappingURL=index.js.map