import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function Home() {
  // Check if environment variables are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600 mb-4">Please set up your Supabase environment variables:</p>
          <ul className="text-left text-sm text-gray-500 space-y-1">
            <li>• NEXT_PUBLIC_SUPABASE_URL</li>
            <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          </ul>
          <p className="text-xs text-gray-400 mt-4">Check your .env.local file or environment settings.</p>
        </div>
      </div>
    )
  }

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect("/login")
    }

    // Get user role and redirect accordingly
    const { data: profile } = await supabase.from("users").select("role").eq("id", session.user.id).single()

    const role = profile?.role || "designer"

    switch (role) {
      case "moderator":
        redirect("/clients/new")
      case "designer":
        redirect("/tasks")
      case "admin":
        redirect("/admin")
      default:
        redirect("/tasks")
    }
  } catch (error) {
    console.error("Error checking authentication:", error)
    redirect("/login")
  }
}
