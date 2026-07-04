// src/composables/useJsonata.ts
// JSONata helpers: module-scope compile cache, tolerant payload parsing,
// evaluate that never throws upward.
import jsonata from 'jsonata'

type Expression = ReturnType<typeof jsonata>

const compileCache = new Map<string, Expression | Error>()

// jsonata throws plain objects ({ code, position, message, ... }), not Error instances
function toError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return new Error(String((err as { message: unknown }).message))
  }
  return new Error(String(err))
}

export function compileExpr(expr: string): Expression | Error {
  let cached = compileCache.get(expr)
  if (cached === undefined) {
    try {
      cached = jsonata(expr)
    } catch (err) {
      cached = toError(err)
    }
    compileCache.set(expr, cached)
  }
  return cached
}

/** Parse an MQTT payload: JSON if possible, else number/boolean coercion, else raw string.
 *  A bare scalar payload therefore works with the default expression '$'. */
export function parsePayload(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch (_) {
    const trimmed = raw.trim()
    if (trimmed !== '' && !isNaN(Number(trimmed))) return Number(trimmed)
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    return raw
  }
}

export type EvalResult = { value?: unknown; error?: string }

export async function evalExpr(expr: string, raw: string): Promise<EvalResult> {
  const compiled = compileExpr(expr)
  if (compiled instanceof Error) {
    return { error: compiled.message }
  }
  try {
    const value = await compiled.evaluate(parsePayload(raw))
    return { value }
  } catch (err) {
    return { error: toError(err).message }
  }
}
