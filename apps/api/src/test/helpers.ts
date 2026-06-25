import supertest from 'supertest'
import { createApp } from '../app'

export function createTestApp() {
  return supertest(createApp())
}
