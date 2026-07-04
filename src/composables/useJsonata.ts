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

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const PATHS_MAX_DEPTH = 4
const PATHS_MAX_COUNT = 100

/** Flatten a payload into JSONata-ready attribute paths for the picker:
 *  { tempc: 1, sensor: { temp: 2 } } → ['tempc', 'sensor.temp'].
 *  Scalars and arrays yield ['$']; non-identifier keys get backticks. */
export function payloadPaths(raw: string): string[] {
  const parsed = parsePayload(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return ['$']
  }
  const paths: string[] = []
  const walk = (obj: Record<string, unknown>, prefix: string, depth: number) => {
    for (const [key, value] of Object.entries(obj)) {
      if (paths.length >= PATHS_MAX_COUNT) return
      const segment = IDENT_RE.test(key) ? key : `\`${key}\``
      const path = prefix ? `${prefix}.${segment}` : segment
      if (
        typeof value === 'object' && value !== null && !Array.isArray(value) &&
        depth < PATHS_MAX_DEPTH
      ) {
        walk(value as Record<string, unknown>, path, depth + 1)
      } else {
        paths.push(path)
      }
    }
  }
  walk(parsed as Record<string, unknown>, '', 1)
  return paths
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
