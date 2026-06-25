-- Script executado na primeira inicialização do container PostgreSQL.
-- Cria extensões necessárias antes do Prisma rodar as migrations.

-- UUID nativo do PostgreSQL (Prisma usa gen_random_uuid() no PG 13+)
-- Não é necessário na PG 13+, mas garantimos compatibilidade
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: para buscas por similaridade de texto (útil para busca de fornecedores, produtos)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- unaccent: para buscas sem acento (buscar "Baricitrus" encontra "Báricitrus")
CREATE EXTENSION IF NOT EXISTS "unaccent";
