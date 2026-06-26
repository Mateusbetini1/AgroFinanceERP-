# AgroFinance ERP - Setup de Desenvolvimento

Este guia prepara o backend com PostgreSQL real em Docker, migrations Prisma, seed demo e smoke test HTTP.

## Pre-requisitos

- Node.js >= 20
- pnpm >= 9
- Docker Desktop com Docker Compose

## 1. Instalar dependencias

```powershell
cd D:\projetofinancas
pnpm install
```

## 2. Subir PostgreSQL dev

O projeto usa `docker-compose.dev.yml` para infraestrutura local.

```powershell
docker compose -f docker-compose.dev.yml up -d postgres
```

PostgreSQL dev:

```text
Host: localhost
Port: 5432
Database: agrofinance_dev
User: agrofinance
Password: agrofinance_dev_password
```

DATABASE_URL local:

```powershell
$env:DATABASE_URL="postgresql://agrofinance:agrofinance_dev_password@localhost:5432/agrofinance_dev"
```

## 3. Rodar migrations, generate e seed

```powershell
pnpm db:migrate
pnpm db:generate
pnpm db:seed
```

O seed cria dados demo para:

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
- Revenue, Expense, Bill, Transfer, EmployeePayment e Invoice simples

## 4. Subir a API

Em um PowerShell separado:

```powershell
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
```

Health check:

```text
http://localhost:3001/health
```

## 5. Rodar testes e build

```powershell
pnpm --filter api type-check
pnpm --filter api test
pnpm --filter api build
```

## 5.1. Subir o frontend web

Em outro PowerShell, com a API rodando:

```powershell
cd D:\projetofinancas
$env:NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
pnpm --filter web dev
```

Acesse:

```text
http://localhost:3000
```

Login demo criado pelo seed:

```text
Email: admin@agrofinance.com
Senha: Admin@123456
```

O seed atual usa UUIDs validos em todos os registros demo, evitando erro 422 ao editar/excluir dados criados pelo seed.

Build local do web:

```powershell
pnpm --filter web build
```

No Windows, o build local nao habilita `output: 'standalone'` por padrao para evitar erro `EPERM` ao criar symlinks. O build Docker de producao continua habilitando standalone automaticamente com `NEXT_OUTPUT_STANDALONE=true`.

## 6. Rodar smoke test real

Com a API rodando:

```powershell
cd D:\projetofinancas
pnpm --filter api smoke
```

Variaveis opcionais:

```powershell
$env:API_BASE_URL="http://localhost:3001"
$env:SMOKE_EMAIL="admin@agrofinance.com"
$env:SMOKE_PASSWORD="Admin@123456"
pnpm --filter api smoke
```

Resultado esperado:

```text
Smoke test completed successfully.
```

## 7. Comandos uteis

Abrir Prisma Studio:

```powershell
pnpm db:studio
```

Resetar banco dev, apagando dados:

```powershell
pnpm db:reset
```

Build completo do monorepo:

```powershell
pnpm build
```

## 8. Arquivos de ambiente

Nao versione `.env` real.

Use `.env.example` como modelo. Secrets reais de banco, JWT, AWS e producao devem ficar fora do Git.

## 9. Headers autenticados

Rotas autenticadas fora de `/api/v1/auth` usam:

```text
Authorization: Bearer <access_token>
x-company-id: <company_uuid>
```

O `company_uuid` aparece no retorno de `POST /api/v1/auth/login`, em `data.memberships[0].company.id`.
