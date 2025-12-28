"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast bg-white text-gray-900 border border-gray-200 shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm text-gray-600",
          success: "!bg-green-50 !border-green-200 !text-green-800",
          error: "!bg-red-50 !border-red-200 !text-red-800",
          warning: "!bg-yellow-50 !border-yellow-200 !text-yellow-800",
          info: "!bg-blue-50 !border-blue-200 !text-blue-800",
        },
      }}
      position="top-right"
      richColors
      {...props}
    />
  )
}

export { Toaster }
