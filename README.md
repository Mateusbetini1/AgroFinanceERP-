# AgroFinance ERP

AgroFinance ERP is a multi-tenant ERP backend for rural and hortifruti financial operations. It supports operational records, financial cash movement, dashboard KPIs, reports, audit logs, and role-based access per company.

## Stack

- Monorepo with pnpm and Turborepo
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL, Prisma
- Tests: Vitest and Supertest
- Frontend: Next.js
- Infrastructure: Docker Compose for local development

## Backend Modules

Implemented backend modules:

- Auth and memberships
- Company
- Product
- Category
- Supplier
- Account
- Revenue
- Expense
- Bill
- Employee
- EmployeePayment
- Transfer
- FarmLocation
- Safra
- Invoice
- Dashboard v2
- Reports v2
- AuditLog

## Main Commands

Install dependencies:

```powershell
pnpm install
```

Generate Prisma Client:

```powershell
pnpm db:generate
```

Run migrations:

```powershell
pnpm db:migrate
```

Seed demo data:

```powershell
pnpm db:seed
```

Run API checks:

```powershell
pnpm --filter api type-check
pnpm --filter api test
pnpm --filter api build
```

Run API smoke test after the API is running:

```powershell
pnpm --filter api smoke
```

## Environment Files

Do not commit real `.env` files.

Use `.env.example` as a template and create your local `.env` manually. Secrets such as `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, AWS keys, and production passwords must stay outside Git.

## Migrations

Prisma migrations in `packages/database/prisma/migrations` are part of the project history and should be committed.
