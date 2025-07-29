"use client"

import * as React from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UploadButtonProps {
  onUpload: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
  children?: React.ReactNode
}

export function UploadButton({ onUpload, accept, multiple = false, maxFiles = 1, children }: UploadButtonProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      onUpload(files.slice(0, maxFiles))
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        className="w-full rounded-lg border-dashed border-2 h-20 hover:bg-gray-50 bg-transparent"
      >
        {children || (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-600">{multiple ? "اختر الملفات" : "اختر ملف"}</span>
          </div>
        )}
      </Button>
    </>
  )
}
