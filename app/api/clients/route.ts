import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withTransaction } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// Validation schema for client form data
const clientFormSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(150, "Name too long"),
  birth_date: z.string().optional(),
  whatsapp_number: z.string().regex(/^(\+?20|01)\d{9}$/, "Invalid WhatsApp number"),
  phone_number: z.string().regex(/^(\+?20|01)\d{9}$/, "Invalid phone number"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  job_title: z.string().optional(),
  education: z.string().optional(),
  work_experience: z.string().optional(),
  soft_skills: z.string().optional(),
  important_notes: z.string().optional(),
  ad_whatsapp_channel: z.string().optional(),
  receiver_account: z.string().optional(),
  total_amount: z.number().min(0, "Amount must be positive").optional(),
  deposit_amount: z.number().min(0, "Deposit must be positive").optional(),
  requested_services: z.array(z.string()).min(1, "Select at least one service"),
})

type ClientFormData = z.infer<typeof clientFormSchema>

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role (only moderators and admins can create clients)
    const { data: userProfile } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (!userProfile || !["moderator", "admin"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await request.formData()

    // Extract form fields
    const formFields: any = {}
    const files: File[] = []
    let paymentScreenshot: File | null = null

    for (const [key, value] of formData.entries()) {
      if (key === "files[]" && value instanceof File) {
        files.push(value)
      } else if (key === "payment_screenshot" && value instanceof File) {
        paymentScreenshot = value
      } else if (key.endsWith("[]")) {
        // Handle array fields
        const fieldName = key.replace("[]", "")
        if (!formFields[fieldName]) formFields[fieldName] = []
        formFields[fieldName].push(value)
      } else if (key === "total_amount" || key === "deposit_amount") {
        // Convert numeric fields
        formFields[key] = value ? Number.parseFloat(value as string) : 0
      } else {
        formFields[key] = value
      }
    }

    // Validate form data
    const validatedData = clientFormSchema.parse(formFields)

    // Validate file constraints
    if (files.length > 5) {
      return NextResponse.json({ error: "Maximum 5 files allowed" }, { status: 400 })
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB
        return NextResponse.json({ error: `File ${file.name} exceeds 10MB limit` }, { status: 400 })
      }
    }

    // Execute database transaction
    const result = await withTransaction(async (adminClient) => {
      // 1. Insert client
      const { data: client, error: clientError } = await adminClient
        .from("clients")
        .insert({
          full_name: validatedData.full_name,
          birth_date: validatedData.birth_date || null,
          whatsapp_number: validatedData.whatsapp_number,
          phone_number: validatedData.phone_number,
          email: validatedData.email,
          address: validatedData.address,
          job_title: validatedData.job_title || null,
          education: validatedData.education || null,
          work_experience: validatedData.work_experience || null,
          soft_skills: validatedData.soft_skills || null,
          important_notes: validatedData.important_notes || null,
          ad_whatsapp_channel: validatedData.ad_whatsapp_channel || null,
          inserted_by: user.id,
        })
        .select("id")
        .single()

      if (clientError) throw new Error(`Failed to create client: ${clientError.message}`)

      const clientId = client.id

      // 2. Insert client services
      if (validatedData.requested_services.length > 0) {
        const serviceInserts = validatedData.requested_services.map((serviceId) => ({
          client_id: clientId,
          service_id: serviceId,
        }))

        const { error: servicesError } = await adminClient.from("client_services").insert(serviceInserts)

        if (servicesError) throw new Error(`Failed to link services: ${servicesError.message}`)
      }

      // 3. Upload and store files
      if (files.length > 0) {
        for (const file of files) {
          const fileName = `${clientId}/${Date.now()}-${file.name}`
          const fileBuffer = await file.arrayBuffer()

          const { error: uploadError } = await adminClient.storage.from("client-files").upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false,
          })

          if (uploadError) throw new Error(`Failed to upload file ${file.name}: ${uploadError.message}`)

          // Get public URL
          const {
            data: { publicUrl },
          } = adminClient.storage.from("client-files").getPublicUrl(fileName)

          // Insert file record
          const { error: fileRecordError } = await adminClient.from("client_files").insert({
            client_id: clientId,
            label: file.name,
            file_url: publicUrl,
            mime_type: file.type,
            file_size: file.size,
          })

          if (fileRecordError) throw new Error(`Failed to record file ${file.name}: ${fileRecordError.message}`)
        }
      }

      // 4. Handle payment if provided
      if (validatedData.total_amount && validatedData.total_amount > 0) {
        let paymentScreenshotUrl: string | null = null

        if (paymentScreenshot) {
          const fileName = `payments/${clientId}/${Date.now()}-${paymentScreenshot.name}`
          const fileBuffer = await paymentScreenshot.arrayBuffer()

          const { error: uploadError } = await adminClient.storage.from("client-files").upload(fileName, fileBuffer, {
            contentType: paymentScreenshot.type,
            upsert: false,
          })

          if (uploadError) throw new Error(`Failed to upload payment screenshot: ${uploadError.message}`)

          const {
            data: { publicUrl },
          } = adminClient.storage.from("client-files").getPublicUrl(fileName)

          paymentScreenshotUrl = publicUrl
        }

        const { error: paymentError } = await adminClient.from("payments").insert({
          client_id: clientId,
          receiver_account: validatedData.receiver_account || "",
          total_amount: validatedData.total_amount,
          deposit_amount: validatedData.deposit_amount || 0,
          payment_screenshot: paymentScreenshotUrl,
        })

        if (paymentError) throw new Error(`Failed to record payment: ${paymentError.message}`)
      }

      return { id: clientId }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating client:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
