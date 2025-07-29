// Re-export everything for convenience
export { createServerSupabaseClient } from "./server"
export { createClientSupabaseClient } from "./client"
export type { Database } from "./types"

// Legacy exports for backward compatibility
export const createClient = () => {
  const { createClientSupabaseClient } = require("./client")
  return createClientSupabaseClient()
}

export const createServerClient = () => {
  const { createServerSupabaseClient } = require("./server")
  return createServerSupabaseClient()
}
