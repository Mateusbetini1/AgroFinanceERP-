export enum MembershipRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  FINANCIAL = 'FINANCIAL',
  AGRONOMIST = 'AGRONOMIST',
  VIEWER = 'VIEWER',
}

export enum UnitType {
  KG = 'KG',
  BOX = 'BOX',
  UNIT = 'UNIT',
  BAG = 'BAG',
  TON = 'TON',
  LITER = 'LITER',
  METER = 'METER',
  HECTARE = 'HECTARE',
}

export enum AccountType {
  CASH = 'CASH',
  BANK = 'BANK',
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionReference {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  BILL = 'BILL',
  EMPLOYEE_PAYMENT = 'EMPLOYEE_PAYMENT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum CategoryType {
  EXPENSE = 'EXPENSE',
  REVENUE = 'REVENUE',
  BOTH = 'BOTH',
}

export enum RevenueStatus {
  RECEIVED = 'RECEIVED',
  PENDING = 'PENDING',
}

export enum ExpenseStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
}

export enum BillStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
}

export enum EmployeeType {
  MONTHLY = 'MONTHLY',
  DAILY = 'DAILY',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum PaymentType {
  SALARY = 'SALARY',
  OVERTIME = 'OVERTIME',
  ADVANCE = 'ADVANCE',
  BONUS = 'BONUS',
  DAILY_WAGE = 'DAILY_WAGE',
}

export enum SafraStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum FarmLocationType {
  GREENHOUSE = 'GREENHOUSE',
  PLOT = 'PLOT',
  FIELD = 'FIELD',
}

export enum FileType {
  PDF = 'PDF',
  XML = 'XML',
  IMAGE = 'IMAGE',
}

export enum OcrStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum PlanTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}
