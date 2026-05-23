type ExpiredTokenHandler = (error: unknown) => void

const expiredTokenHandlers = new Set<ExpiredTokenHandler>()

export function subscribeExpiredAuthToken(handler: ExpiredTokenHandler): () => void {
  expiredTokenHandlers.add(handler)
  return () => {
    expiredTokenHandlers.delete(handler)
  }
}

export function emitExpiredAuthToken(error: unknown): void {
  for (const handler of expiredTokenHandlers) {
    handler(error)
  }
}
