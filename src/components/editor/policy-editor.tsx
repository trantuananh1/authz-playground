import { json } from "@codemirror/lang-json"
import { lintGutter, setDiagnostics, type Diagnostic as CmDiagnostic } from "@codemirror/lint"
import { EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import { useEffect, useMemo, useRef } from "react"
import { useStore } from "@/store"
import { editorTheme, highlight, permitDsl, policyCompletions } from "./language"

export function PolicyEditor() {
  const text = useStore((s) => s.text)
  const format = useStore((s) => s.format)
  const diagnostics = useStore((s) => s.compiled.diagnostics)
  const focus = useStore((s) => s.focus)
  const setText = useStore((s) => s.setText)
  const viewRef = useRef<EditorView | null>(null)

  const extensions = useMemo(
    () => [
      format === "json" ? json() : permitDsl,
      highlight,
      editorTheme,
      lintGutter(),
      policyCompletions(
        () => useStore.getState().file,
        () => useStore.getState().format === "dsl",
      ),
      EditorView.lineWrapping,
    ],
    [format],
  )

  // push diagnostics computed by the store into the editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const len = view.state.doc.length
    const cm: CmDiagnostic[] = diagnostics.map((d) => {
      const from = Math.min(d.from, len)
      return { from, to: Math.min(Math.max(d.to, from), len), severity: d.severity, message: d.message, source: "vauthz" }
    })
    view.dispatch(setDiagnostics(view.state, cm))
  }, [diagnostics, text])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !focus) return
    const len = view.state.doc.length
    const from = Math.min(focus.from, len)
    view.dispatch({
      selection: EditorSelection.range(from, Math.min(focus.to, len)),
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    })
    view.focus()
  }, [focus])

  return (
    <CodeMirror
      value={text}
      onChange={setText}
      extensions={extensions}
      theme="none"
      height="100%"
      className="h-full"
      aria-label="Policy editor"
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
      basicSetup={{
        autocompletion: false,
        highlightActiveLine: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        tabSize: 2,
      }}
    />
  )
}
