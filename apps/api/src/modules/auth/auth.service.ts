import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { AppError } from '../../shared/errors/AppError'
import type { RegisterDto, LoginDto } from './auth.schemas'

const REFRESH_TOKEN_BYTES = 64
const BCRYPT_SALT_ROUNDS = 12

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function generateRawRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
}

// Converte strings como "7d", "15m", "1h", "30s" para milissegundos.
// Lança erro se o formato for inválido para falhar fast no startup.
function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/)
  if (!match) {
    throw new Error(`JWT_REFRESH_EXPIRES_IN inválido: "${duration}". Use formato como "7d", "15m", "1h".`)
  }
  const value = parseInt(match[1], 10)
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }
  return value * multipliers[match[2]]
}

const MEMBERSHIP_SELECT = {
  role: true,
  company: {
    select: { id: true, name: true, logoUrl: true, planTier: true },
  },
} as const

const ACTIVE_MEMBERSHIP_FILTER = {
  active: true,
  company: { active: true, deletedAt: null },
} as const

async function createTokenPair(userId: string, email: string) {
  // Usar `exp` no payload evita conflito com ms.StringValue em @types/jsonwebtoken
  const accessExpiresMs = parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN)
  const accessToken = jwt.sign(
    { sub: userId, email, exp: Math.floor((Date.now() + accessExpiresMs) / 1000) },
    env.JWT_SECRET,
  )

  const rawRefreshToken = generateRawRefreshToken()
  const tokenHash = hashToken(rawRefreshToken)

  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN))

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  })

  return { accessToken, refreshToken: rawRefreshToken }
}

export const AuthService = {
  async register(data: RegisterDto) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    })

    if (existing) {
      throw AppError.conflict('Este email já está cadastrado')
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS)

    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    return user
  },

  async login(data: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, name: true, email: true, passwordHash: true },
    })

    // Tempo constante para evitar timing attacks (bcrypt.compare roda mesmo se usuário não existe)
    const fakeHash = '$2b$12$invalidhashpaddingtomakethisconstanttime'
    const valid = await bcrypt.compare(
      data.password,
      user?.passwordHash ?? fakeHash,
    )

    if (!user || !valid) {
      throw AppError.unauthorized('Email ou senha inválidos')
    }

    const { accessToken, refreshToken } = await createTokenPair(user.id, user.email)

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, ...ACTIVE_MEMBERSHIP_FILTER },
      select: MEMBERSHIP_SELECT,
    })

    return {
      user: { id: user.id, name: user.name, email: user.email },
      memberships,
      accessToken,
      refreshToken,
    }
  },

  async refresh(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken)

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, email: true } },
      },
    })

    if (!stored) {
      throw AppError.unauthorized('Refresh token inválido')
    }

    if (stored.revokedAt) {
      // Token já foi usado — possível replay attack. Revogar todos os tokens do usuário.
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      throw AppError.unauthorized('Refresh token comprometido. Faça login novamente.')
    }

    if (stored.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token expirado')
    }

    // Rotação: revogar o token atual e emitir novo par
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const { accessToken, refreshToken } = await createTokenPair(
      stored.user.id,
      stored.user.email,
    )

    return { accessToken, refreshToken }
  },

  async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken)

    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        memberships: {
          where: ACTIVE_MEMBERSHIP_FILTER,
          select: MEMBERSHIP_SELECT,
        },
      },
    })

    if (!user) throw AppError.notFound('Usuário')

    return user
  },
}
