import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

// Server-side admin client with service role key
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

// Helper function to handle database transactions
export async function withTransaction<T>(callback: (client: typeof supabaseAdmin) => Promise<T>): Promise<T> {
  try {
    // Begin transaction
    const { error: beginError } = await supabaseAdmin.rpc("begin_transaction")
    if (beginError) throw beginError

    // Execute callback
    const result = await callback(supabaseAdmin)

    // Commit transaction
    const { error: commitError } = await supabaseAdmin.rpc("commit_transaction")
    if (commitError) throw commitError

    return result
  } catch (error) {
    // Rollback on error
    await supabaseAdmin.rpc("rollback_transaction")
    throw error
  }
}
