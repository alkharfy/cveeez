"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, X, FileText, ImageIcon, Upload } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { DatePicker } from "@/components/ui/date-picker"
import { MultiSelect } from "@/components/ui/multi-select"

const clientSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(150, "Name too long"),
  birth_date: z.date().optional(),
  whatsapp_number: z.string().regex(/^(\+?20|01)\d{9}$/, "Invalid WhatsApp number"),
  phone_number: z.string().regex(/^(\+?20|01)\d{9}$/, "Invalid phone number"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  job_title: z.string().optional(),
  education: z.string().optional(),
  work_experience: z.string().optional(),
  soft_skills: z.string().optional(),
  important_notes: z.string().optional(),
  requested_services: z.array(z.string()).min(1, "Select at least one service"),
  receiver_account: z.string().min(1, "Select receiver account"),
  total_amount: z.number().min(0, "Amount must be positive").optional(),
  deposit_amount: z.number().min(0, "Deposit must be positive").optional(),
  ad_whatsapp_channel: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

export default function NewClientPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientDetailsOpen, setClientDetailsOpen] = useState(true)
  const [servicesPaymentOpen, setServicesPaymentOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)

  const router = useRouter()
  const supabase = createClientSupabaseClient()

  // Fetch services using React Query
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("is_active", true).order("name")

      if (error) throw error
      return data
    },
  })

  const methods = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      total_amount: 0,
      deposit_amount: 0,
      requested_services: [],
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = methods

  // Calculate total when services change
  const watchedServices = watch("requested_services")
  useEffect(() => {
    if (watchedServices && services.length > 0) {
      const total = watchedServices.reduce((sum, serviceId) => {
        const service = services.find((s) => s.id === serviceId)
        return sum + (service?.base_price || 0)
      }, 0)
      setValue("total_amount", total)
    }
  }, [watchedServices, services, setValue])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    const validFiles = files.filter((file) => {
      const isValidType = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/gif",
      ].includes(file.type)
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      return isValidType && isValidSize
    })

    if (uploadedFiles.length + validFiles.length > 5) {
      toast.error("Maximum 5 files allowed")
      return
    }

    setUploadedFiles((prev) => [...prev, ...validFiles])
    event.target.value = "" // Reset input
  }

  const handlePaymentScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const isValidType = file.type.startsWith("image/") || file.type === "application/pdf"
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB

      if (!isValidType) {
        toast.error("Please upload an image or PDF file")
        return
      }

      if (!isValidSize) {
        toast.error("File size must be less than 10MB")
        return
      }

      setPaymentScreenshot(file)
    }
    event.target.value = "" // Reset input
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true)

    try {
      // Create FormData for multipart upload
      const formData = new FormData()

      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((val) => formData.append(`${key}[]`, val))
        } else if (value !== undefined && value !== null) {
          if (key === "birth_date" && value instanceof Date) {
            formData.append(key, value.toISOString().split("T")[0])
          } else {
            formData.append(key, value.toString())
          }
        }
      })

      // Add files
      uploadedFiles.forEach((file) => {
        formData.append("files[]", file)
      })

      if (paymentScreenshot) {
        formData.append("payment_screenshot", paymentScreenshot)
      }

      // Submit to API
      const response = await fetch("/api/clients", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save client")
      }

      const result = await response.json()

      toast.success("Client saved successfully! ✅")
      router.push(`/clients/${result.id}`)
    } catch (error) {
      console.error("Error saving client:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save client")
    } finally {
      setIsSubmitting(false)
    }
  }

  const accountOptions = [
    { value: "1065236963", label: "Bank Account - 1065236963" },
    { value: "1029010778", label: "Bank Account - 1029010778" },
    { value: "instapay", label: "InstaPay" },
    { value: "Payment Request Paysky", label: "Payment Request Paysky" },
    { value: "instapay alkharfy", label: "InstaPay Alkharfy" },
  ]

  const serviceOptions = services.map((service) => ({
    value: service.id,
    label: `${service.name} - $${service.base_price}`,
  }))

  if (servicesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">إضافة عميل جديد</h1>
          <p className="text-gray-600">املأ البيانات المطلوبة لإضافة عميل جديد</p>
        </motion.div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Details Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="rounded-2xl shadow-lg hover:scale-[101%] transition-transform">
                <Collapsible open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 rounded-t-2xl">
                      <CardTitle className="flex items-center justify-between text-primary-600">
                        <span>بيانات العميل</span>
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${clientDetailsOpen ? "rotate-180" : ""}`}
                        />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">الاسم الكامل *</Label>
                          <Input id="full_name" {...register("full_name")} className="rounded-lg" />
                          {errors.full_name && <p className="text-sm text-red-500">{errors.full_name.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="birth_date">تاريخ الميلاد</Label>
                          <DatePicker onSelect={(date) => setValue("birth_date", date)} />
                          {errors.birth_date && <p className="text-sm text-red-500">{errors.birth_date.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="whatsapp_number">رقم الواتساب *</Label>
                          <Input
                            id="whatsapp_number"
                            type="tel"
                            {...register("whatsapp_number")}
                            placeholder="+201234567890"
                            className="rounded-lg"
                          />
                          {errors.whatsapp_number && (
                            <p className="text-sm text-red-500">{errors.whatsapp_number.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone_number">رقم الهاتف *</Label>
                          <Input
                            id="phone_number"
                            type="tel"
                            {...register("phone_number")}
                            placeholder="+201234567890"
                            className="rounded-lg"
                          />
                          {errors.phone_number && <p className="text-sm text-red-500">{errors.phone_number.message}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="email">البريد الإلكتروني *</Label>
                          <Input id="email" type="email" {...register("email")} className="rounded-lg" />
                          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="address">العنوان *</Label>
                          <Textarea id="address" {...register("address")} className="rounded-lg" rows={3} />
                          {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="job_title">المسمى الوظيفي</Label>
                          <Input id="job_title" {...register("job_title")} className="rounded-lg" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="education">التعليم</Label>
                          <Textarea id="education" {...register("education")} className="rounded-lg" rows={3} />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="work_experience">الخبرة العملية</Label>
                          <Textarea
                            id="work_experience"
                            {...register("work_experience")}
                            className="rounded-lg"
                            rows={4}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="soft_skills">المهارات الشخصية</Label>
                          <Textarea id="soft_skills" {...register("soft_skills")} className="rounded-lg" rows={3} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="important_notes">ملاحظات مهمة</Label>
                          <Textarea
                            id="important_notes"
                            {...register("important_notes")}
                            className="rounded-lg"
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* File Upload Section */}
                      <div className="space-y-4">
                        <Label>رفع الملفات (حد أقصى 5 ملفات - PDF/DOC/صور ≤ 10 ميجا)</Label>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                            disabled={uploadedFiles.length >= 5}
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">
                              {uploadedFiles.length >= 5
                                ? "تم الوصول للحد الأقصى من الملفات"
                                : "اضغط لاختيار الملفات أو اسحبها هنا"}
                            </p>
                          </label>
                        </div>

                        {uploadedFiles.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                {file.type.startsWith("image/") ? (
                                  <ImageIcon className="w-5 h-5 text-blue-500" />
                                ) : (
                                  <FileText className="w-5 h-5 text-red-500" />
                                )}
                                <span className="flex-1 text-sm truncate">{file.name}</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </motion.div>

            {/* Services & Payment Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="rounded-2xl shadow-lg hover:scale-[101%] transition-transform">
                <Collapsible open={servicesPaymentOpen} onOpenChange={setServicesPaymentOpen}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 rounded-t-2xl">
                      <CardTitle className="flex items-center justify-between text-primary-600">
                        <span>الخدمات والدفع</span>
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${servicesPaymentOpen ? "rotate-180" : ""}`}
                        />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <Label>الخدمات المطلوبة *</Label>
                          <MultiSelect
                            options={serviceOptions}
                            value={watch("requested_services")}
                            onValueChange={(values) => setValue("requested_services", values)}
                            placeholder="اختر الخدمات المطلوبة"
                          />
                          {errors.requested_services && (
                            <p className="text-sm text-red-500">{errors.requested_services.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receiver_account">حساب الاستقبال *</Label>
                          <Select onValueChange={(value) => setValue("receiver_account", value)}>
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="اختر حساب الاستقبال" />
                            </SelectTrigger>
                            <SelectContent>
                              {accountOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.receiver_account && (
                            <p className="text-sm text-red-500">{errors.receiver_account.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="total_amount">المبلغ الإجمالي</Label>
                          <Input
                            id="total_amount"
                            type="number"
                            {...register("total_amount", { valueAsNumber: true })}
                            className="rounded-lg"
                            readOnly
                          />
                          {errors.total_amount && <p className="text-sm text-red-500">{errors.total_amount.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="deposit_amount">مبلغ العربون</Label>
                          <Input
                            id="deposit_amount"
                            type="number"
                            {...register("deposit_amount", { valueAsNumber: true })}
                            className="rounded-lg"
                          />
                          {errors.deposit_amount && (
                            <p className="text-sm text-red-500">{errors.deposit_amount.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ad_whatsapp_channel">قناة الإعلان (واتساب)</Label>
                          <Input id="ad_whatsapp_channel" {...register("ad_whatsapp_channel")} className="rounded-lg" />
                        </div>

                        <div className="space-y-2">
                          <Label>لقطة شاشة الدفع</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-400 transition-colors">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handlePaymentScreenshotUpload}
                              className="hidden"
                              id="payment-upload"
                            />
                            <label htmlFor="payment-upload" className="cursor-pointer">
                              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">اختر صورة أو PDF</p>
                            </label>
                          </div>

                          {paymentScreenshot && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <ImageIcon className="w-5 h-5 text-blue-500" />
                              <span className="flex-1 text-sm">{paymentScreenshot.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPaymentScreenshot(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-end"
            >
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-primary-300 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? "جاري الحفظ..." : "حفظ العميل"}
              </Button>
            </motion.div>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}
