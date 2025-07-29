export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: "admin" | "moderator" | "designer"
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: "admin" | "moderator" | "designer"
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: "admin" | "moderator" | "designer"
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          full_name: string
          birth_date: string
          whatsapp_number: string
          phone_number: string
          email: string
          address: string
          job_title: string | null
          education: string | null
          work_experience: string | null
          soft_skills: string | null
          important_notes: string | null
          ad_whatsapp_channel: string | null
          inserted_by: string
          assigned_moderator: string | null
          assigned_designer: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          birth_date: string
          whatsapp_number: string
          phone_number: string
          email: string
          address: string
          job_title?: string | null
          education?: string | null
          work_experience?: string | null
          soft_skills?: string | null
          important_notes?: string | null
          ad_whatsapp_channel?: string | null
          inserted_by: string
          assigned_moderator?: string | null
          assigned_designer?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          birth_date?: string
          whatsapp_number?: string
          phone_number?: string
          email?: string
          address?: string
          job_title?: string | null
          education?: string | null
          work_experience?: string | null
          soft_skills?: string | null
          important_notes?: string | null
          ad_whatsapp_channel?: string | null
          inserted_by?: string
          assigned_moderator?: string | null
          assigned_designer?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_files: {
        Row: {
          id: string
          client_id: string
          label: string
          file_url: string
          mime_type: string
          file_size: number
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          label: string
          file_url: string
          mime_type: string
          file_size: number
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          label?: string
          file_url?: string
          mime_type?: string
          file_size?: number
          created_at?: string
        }
      }
      client_services: {
        Row: {
          id: string
          client_id: string
          service_id: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          base_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          base_price: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          base_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          client_id: string
          receiver_account: string
          total_amount: number
          deposit_amount: number
          payment_screenshot: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          receiver_account: string
          total_amount: number
          deposit_amount: number
          payment_screenshot?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          receiver_account?: string
          total_amount?: number
          deposit_amount?: number
          payment_screenshot?: string | null
          created_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          provider: string
          account_number: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          provider: string
          account_number: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          account_number?: string
          is_active?: boolean
          created_at?: string
        }
      }
    }
  }
}
