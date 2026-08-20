"use client"

import { useState, useEffect } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { X, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"

const popupVariants = cva(
  "relative overflow-hidden rounded-2xl shadow-2xl",
  {
    variants: {
      colorScheme: {
        info: "bg-gradient-to-br from-blue-500 to-blue-600 text-white",
        success: "bg-gradient-to-br from-green-500 to-green-600 text-white",
        warning: "bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900",
        danger: "bg-gradient-to-br from-red-500 to-red-600 text-white",
        white: "bg-white text-gray-900 border-2 border-gray-200",
      },
    },
    defaultVariants: {
      colorScheme: "info",
    },
  }
)

interface NotificationPopupProps extends VariantProps<typeof popupVariants> {
  message: string
  notificationId: string
  imageUrl?: string | null
}

export function NotificationPopup({ message, colorScheme, notificationId, imageUrl }: NotificationPopupProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const dismissedKey = `notification-dismissed-${notificationId}`
    const isDismissed = localStorage.getItem(dismissedKey)
    
    if (!isDismissed) {
      setIsOpen(true)
    }
  }, [notificationId])

  const handleDismiss = () => {
    const dismissedKey = `notification-dismissed-${notificationId}`
    localStorage.setItem(dismissedKey, "true")
    setIsOpen(false)
  }

  const isWhiteTheme = colorScheme === "white"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          popupVariants({ colorScheme }),
          "w-[calc(100vw-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto border-0 p-0 gap-0"
        )}
      >
        <DialogTitle className="sr-only">Notification</DialogTitle>
        {/* Decorative background pattern */}
        {!isWhiteTheme && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className={cn(
            "absolute right-4 top-4 z-10 rounded-full p-2 transition-all duration-200",
            isWhiteTheme 
              ? "bg-gray-100 hover:bg-gray-200 text-gray-600" 
              : "bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
          )}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 p-8">
          {/* Image section */}
          {imageUrl && (
            <div className="mb-6 flex justify-center">
              <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-lg">
                <Image
                  src={imageUrl}
                  alt="Notification image"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          )}

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={cn(
              "p-4 rounded-full",
              isWhiteTheme 
                ? "bg-gradient-to-br from-blue-500 to-purple-600" 
                : "bg-white/20 backdrop-blur-sm"
            )}>
              <Sparkles className={cn(
                "h-8 w-8",
                isWhiteTheme ? "text-white" : "text-current"
              )} />
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-4">
            <p className={cn(
              "text-lg leading-relaxed whitespace-pre-wrap font-medium",
              isWhiteTheme ? "text-gray-800" : "text-current"
            )}>
              {message}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
