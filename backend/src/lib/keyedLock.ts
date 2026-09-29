/**
 * Sérialise les opérations portant sur une même clé dans ce process (ex. deux
 * signataires qui valident au même instant le même document : sans verrou, les
 * deux partiraient de la même version et l'une des signatures serait perdue).
 * Suffisant pour le MVP mono-instance, comme la file du journal d'audit.
 */
const queues = new Map<string, Promise<unknown>>()

export function withKeyedLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(fn)
  const settled = next.catch(() => undefined)
  queues.set(key, settled)
  void settled.then(() => {
    if (queues.get(key) === settled) queues.delete(key)
  })
  return next
}
