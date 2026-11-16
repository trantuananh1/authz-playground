import { Check, ChevronsUpDown } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import type { GrantKind } from "@/lib/policy"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<GrantKind, string> = { rbac: "RBAC", rebac: "ReBAC", abac: "ABAC" }

export function KindBadge({ kind, className }: { kind: GrantKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm px-1.5 font-mono text-[10.5px] font-semibold tracking-wide",
        kind === "rbac" && "bg-rbac/15 text-rbac",
        kind === "rebac" && "bg-rebac/15 text-rebac",
        kind === "abac" && "bg-abac/15 text-abac",
        className,
      )}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12.5px]", className)}>{children}</span>
}

/** "anne can read document:doc1" */
export function Sentence({
  user,
  action,
  resource,
  can,
  className,
}: {
  user: string
  action: string
  resource: string
  can?: boolean
  className?: string
}) {
  return (
    <span className={cn("font-mono text-[12.5px]", className)}>
      <span className="font-semibold text-foreground">{user || "?"}</span>{" "}
      <span className="text-muted-foreground">{can === false ? "cannot" : "can"}</span> <span className="text-rbac">{action || "?"}</span>{" "}
      <span className="text-foreground">{resource || "?"}</span>
    </span>
  )
}

export interface ComboOption {
  value: string
  hint?: string
  group?: string
}

/** A text field with suggestions; any typed value is accepted. */
export function Combo({
  value,
  onChange,
  options,
  placeholder,
  id,
  className,
}: {
  value: string
  onChange: (v: string) => void
  options: ComboOption[]
  placeholder?: string
  id?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(0)
  const [typed, setTyped] = useState(false)
  const filtered = useMemo(() => {
    const q = typed ? value.toLowerCase() : ""
    return options.filter((o) => !q || o.value.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)).slice(0, 60)
  }, [options, value, typed])

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setTyped(false)
  }

  return (
    <Popover
      open={open && filtered.length > 0}
      // the input sits outside the popover, so Radix reads focusing it as an outside interaction; keep it open while typing
      onOpenChange={(o) => (o || document.activeElement !== inputRef.current) && setOpen(o)}
    >
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <input
            ref={inputRef}
            id={id}
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            onFocus={() => {
              setOpen(true)
              setTyped(false)
            }}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onChange={(e) => {
              onChange(e.target.value)
              setTyped(true)
              setOpen(true)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setOpen(true)
                setActive((a) => Math.min(a + 1, filtered.length - 1))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === "Enter" && open && filtered[active]) {
                e.preventDefault()
                pick(filtered[active].value)
              } else if (e.key === "Escape") setOpen(false)
            }}
            className="h-8 w-full rounded-md border border-input bg-transparent pr-7 pl-2.5 font-mono text-[12.5px] transition-colors outline-none placeholder:text-muted-foreground/70 hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:bg-input/20"
          />
          <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="max-h-72 w-(--radix-popover-trigger-width) min-w-56 gap-0 overflow-y-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.target === inputRef.current && e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {filtered.map((o, i) => {
          const showGroup = o.group && o.group !== filtered[i - 1]?.group
          return (
            <div key={`${o.group}:${o.value}`}>
              {showGroup && (
                <div className="px-2 pt-2 pb-1 text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">{o.group}</div>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left font-mono text-[12.5px]",
                  i === active && "bg-accent text-accent-foreground",
                )}
              >
                <Check className={cn("size-3.5 shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{o.value}</span>
                {o.hint && <span className="ml-auto truncate pl-2 font-sans text-[11px] text-muted-foreground">{o.hint}</span>}
              </button>
            </div>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
      {children}
    </label>
  )
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <h3 className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</h3>
      {aside && <div className="ml-auto">{aside}</div>}
    </div>
  )
}

/** Suggestions for user, resource and tenant fields, drawn from the policy. */
export function useRefOptions(file: import("@/lib/policy").PolicyFile) {
  return useMemo(() => {
    const users: ComboOption[] = file.data.users.map((u) => ({ value: u.key, hint: u.email }))
    const resources: ComboOption[] = [
      ...file.data.resource_instances.map((i) => ({
        value: `${i.resource}:${i.key}`,
        hint: i.tenant ? `@${i.tenant}` : undefined,
        group: "Instances",
      })),
      ...file.schema.resources.map((r) => ({ value: r.key, hint: "any instance", group: "Resource types" })),
    ]
    const tenants: ComboOption[] = file.schema.tenants.map((t) => ({ value: t.key, hint: t.name }))
    return { users, resources, tenants }
  }, [file])
}

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** ⌘↵ on macOS, Ctrl↵ elsewhere. */
export function ModEnterHint({ className }: { className?: string }) {
  return (
    <kbd className={cn("ml-1 rounded-sm bg-background/25 px-1 font-sans text-[10px] font-medium opacity-80", className)}>
      {IS_MAC ? "⌘" : "Ctrl"}↵
    </kbd>
  )
}

/**
 * Form keydown handler: Cmd/Ctrl+Enter submits from any field. It runs in the
 * capture phase so a suggestion list that owns plain Enter does not swallow it.
 */
export function submitOnModEnter(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return
  e.preventDefault()
  e.stopPropagation()
  e.currentTarget.requestSubmit()
}
