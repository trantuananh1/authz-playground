import { dslErrorToDiagnostic, parseDsl, printDsl, type SourceMap } from "./dsl"
import { jsonErrorToDiagnostic, locateInJson, parseJson, printJson } from "./json"
import type { Diagnostic, PolicyFile, PolicyFormat } from "./types"
import { validate, type Issue } from "./validate"

export * from "./types"
export { Engine, splitRef, type CheckInput, type CheckResult, type Grant, type GrantKind, type Miss } from "./engine"
export { printCondition } from "./conditions"
export { parseDsl, printDsl, parseJson, printJson, validate, type Issue }

export interface Compiled {
  file?: PolicyFile
  diagnostics: Diagnostic[]
  issues: Issue[]
  /** finds the text range of an entity, e.g. `resource:document` or `role:admin` */
  locate: (key: string, jsonNeedle?: string) => { from: number; to: number } | undefined
}

/** Guesses the format of an uploaded or pasted policy. */
export function detectFormat(text: string, filename?: string): PolicyFormat {
  if (filename && /\.json$/i.test(filename)) return "json"
  if (filename && /\.(dsl|txt)$/i.test(filename)) return "dsl"
  return /^\s*[{[]/.test(text) ? "json" : "dsl"
}

export function parsePolicy(text: string, format: PolicyFormat): PolicyFile {
  return format === "json" ? parseJson(text) : parseDsl(text).file
}

export function printPolicy(file: PolicyFile, format: PolicyFormat, opts?: { schema?: boolean; data?: boolean; tests?: boolean }) {
  return format === "json" ? printJson(file, opts) : printDsl(file, opts)
}

/** Parses and validates editor text, mapping every problem to a text range. */
export function compile(text: string, format: PolicyFormat): Compiled {
  let file: PolicyFile
  let sourceMap: SourceMap = {}
  try {
    if (format === "json") file = parseJson(text)
    else ({ file, sourceMap } = parseDsl(text))
  } catch (e) {
    return { diagnostics: [format === "json" ? jsonErrorToDiagnostic(e) : dslErrorToDiagnostic(e)], issues: [], locate: () => undefined }
  }
  const issues = validate(file)
  const diagnostics = issues.map((i): Diagnostic => {
    const span =
      format === "dsl"
        ? (i.dslKey && (sourceMap[i.dslKey] ?? sourceMap[i.dslKey.split("/")[0]])) || undefined
        : i.jsonNeedle
          ? locateInJson(text, i.jsonNeedle)
          : undefined
    return { message: i.message, severity: i.severity, from: span?.from ?? 0, to: span?.to ?? 0 }
  })
  const locate = (key: string, jsonNeedle?: string) =>
    format === "dsl" ? sourceMap[key] : locateInJson(text, jsonNeedle ?? key.slice(key.lastIndexOf(":") + 1))
  return { file, diagnostics, issues, locate }
}
