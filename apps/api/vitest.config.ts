import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'src/**/*.d.ts'],
    },
    env: {
      NODE_ENV: 'test',
      PORT: '3001',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/agrofinance_test',
      JWT_SECRET: 'test-secret-must-be-at-least-32-characters-long',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars-long',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
})
