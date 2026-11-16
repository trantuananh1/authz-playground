import type { PolicyFormat } from "@/lib/policy/types"

interface SharedPayload {
  f: PolicyFormat
  t: string
  n?: string
}

let hashPayload: SharedPayload | null = null

export function sharedFromHash(): SharedPayload | null {
  return hashPayload
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

export async function shareUrl({ text, format, fileName }: { text: string; format: PolicyFormat; fileName: string }): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify({ f: format, t: text, n: fileName } satisfies SharedPayload))
  const packed = await pipe(raw, new CompressionStream("deflate-raw"))
  const url = new URL(location.href)
  url.search = ""
  url.hash = `p=${b64url(packed)}`
  return url.toString()
}

/** Must run before the store module loads, so a shared link wins over saved state. */
export async function readSharedHash() {
  const m = /^#p=(.+)$/.exec(location.hash)
  if (!m) return
  try {
    const bytes = await pipe(fromB64url(m[1]), new DecompressionStream("deflate-raw"))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as SharedPayload
    if (payload && typeof payload.t === "string" && (payload.f === "dsl" || payload.f === "json")) hashPayload = payload
  } catch {
    /* a broken link falls back to the default store */
  }
}
