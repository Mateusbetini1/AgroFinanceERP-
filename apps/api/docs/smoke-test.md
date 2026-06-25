# Smoke test real da API

Este roteiro valida o backend contra PostgreSQL real, usando o seed demo e chamadas HTTP reais na API.

## Pre-requisitos

- Docker Desktop rodando
- Dependencias instaladas com pnpm
- PostgreSQL dev do projeto disponivel em localhost:5432

## Variaveis de ambiente

No PowerShell usado para migrations e seed:

~~~powershell
$env:DATABASE_URL="postgresql://agrofinance:agrofinance_dev_password@localhost:5432/agrofinance_dev"
~~~

No PowerShell usado para subir a API:

~~~powershell
$env:DATABASE_URL="postgresql://agrofinance:agrofinance_dev_password@localhost:5432/agrofinance_dev"
$env:JWT_SECRET="change-me-with-at-least-32-random-characters"
$env:JWT_REFRESH_SECRET="change-me-with-another-32-random-characters"
$env:JWT_ACCESS_EXPIRES_IN="15m"
$env:JWT_REFRESH_EXPIRES_IN="7d"
$env:NODE_ENV="development"
$env:PORT="3001"
$env:CORS_ORIGIN="http://localhost:3000"
~~~

## Preparar banco

~~~powershell
cd D:\projetofinancas
docker compose -f docker-compose.dev.yml up -d postgres
$env:DATABASE_URL="postgresql://agrofinance:agrofinance_dev_password@localhost:5432/agrofinance_dev"
pnpm db:migrate
pnpm db:generate
pnpm db:seed
~~~

O seed cria:

- Empresa AgroFinance Demo
- Usuario admin@agrofinance.com / Admin@123456
- Membership OWNER
- Contas Caixa e Banco Sicredi
- Produtos Pepino, Pimentao e Cafe
- Categorias Insumos, Funcionarios, Energia e Defensivos
- Fornecedores Baricitrus e Casa Agricola Demo
- FarmLocation Estufa A
- Safra Pepino Estufa A 2026
- Employee ativo
- Receitas, despesas, boletos, transferencia, pagamento de funcionario e uma invoice simples

O seed recalcula Account.currentBalance explicitamente no final.

## Subir API

Em outro PowerShell:

~~~powershell
cd D:\projetofinancas
$env:DATABASE_URL="postgresql://agrofinance:agrofinance_dev_password@localhost:5432/agrofinance_dev"
$env:JWT_SECRET="change-me-with-at-least-32-random-characters"
$env:JWT_REFRESH_SECRET="change-me-with-another-32-random-characters"
$env:JWT_ACCESS_EXPIRES_IN="15m"
$env:JWT_REFRESH_EXPIRES_IN="7d"
$env:NODE_ENV="development"
$env:PORT="3001"
$env:CORS_ORIGIN="http://localhost:3000"
pnpm --filter api dev
~~~

## Rodar smoke test

Com a API aberta:

~~~powershell
cd D:\projetofinancas
pnpm --filter api smoke
~~~

Variaveis opcionais:

~~~powershell
$env:API_BASE_URL="http://localhost:3001"
$env:SMOKE_EMAIL="admin@agrofinance.com"
$env:SMOKE_PASSWORD="Admin@123456"
pnpm --filter api smoke
~~~

## Endpoints validados

- GET /health
- POST /api/v1/auth/login
- GET /api/v1/accounts
- GET /api/v1/products
- GET /api/v1/categories
- GET /api/v1/suppliers
- GET /api/v1/revenues
- GET /api/v1/expenses
- GET /api/v1/bills
- GET /api/v1/transfers
- GET /api/v1/employee-payments
- GET /api/v1/dashboard/overview
- GET /api/v1/dashboard/cashflow
- GET /api/v1/reports/revenues
- GET /api/v1/reports/expenses
- GET /api/v1/reports/cashflow

## Resultado esperado

O script deve imprimir uma linha OK para cada endpoint e finalizar com:

~~~text
Smoke test completed successfully.
~~~
