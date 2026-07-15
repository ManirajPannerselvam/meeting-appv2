import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ['error', 'warn'] // optional: remove in production
  })

// Prevent multiple instances in dev with HMR
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}