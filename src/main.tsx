import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { readSharedHash } from "./lib/share"

// a shared link must be decoded before the store initialises
await readSharedHash()
const { App } = await import("./App")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
