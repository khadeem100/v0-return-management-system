"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { updateBannerSettings } from "@/app/actions/settings"
import { uploadReturnImage } from "@/app/actions/upload"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { AlertCircle, Upload, X, Image as ImageIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import Image from "next/image"

interface BannerSettingsFormProps {
  initialSettings: {
    message: string
    color_scheme: string
    display_type: string
    image_url?: string | null
    is_active: boolean
  } | null
}

export function BannerSettingsForm({ initialSettings }: BannerSettingsFormProps) {
  const { toast } = useToast()
  const [state, formAction] = useActionState(updateBannerSettings, { success: false, error: null })
  const [imageUrl, setImageUrl] = useState<string | null>(initialSettings?.image_url || null)
  const [isUploading, setIsUploading] = useState(false)
  const [displayType, setDisplayType] = useState(initialSettings?.display_type || "banner")
  const [colorScheme, setColorScheme] = useState(initialSettings?.color_scheme || "info")
  const [isActive, setIsActive] = useState(initialSettings?.is_active || false)

  const handleDisplayTypeChange = (value: string) => {
    setDisplayType(value)
    if (value === "banner" && colorScheme === "white") {
      setColorScheme("info")
    }
  }

  // Cast the error state to allow accessing arbitrary keys like _form
  const errors = state.error as Record<string, string[] | undefined> | null

  useEffect(() => {
    if (state.success) {
      toast({ title: "Success", description: "Notification settings updated." })
    }
  }, [state, toast])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const result = await uploadReturnImage(formData)
      if (result.url) {
        setImageUrl(result.url)
        toast({ title: "Success", description: "Image uploaded successfully." })
      } else if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image.", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl(null)
  }

  return (
    <form action={formAction} className="space-y-6">
      {errors?._form && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors._form[0]}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="message">Notification Message</Label>
        <Textarea
          id="message"
          name="message"
          defaultValue={initialSettings?.message || ""}
          rows={3}
          required
        />
        {errors?.message && <p className="text-sm text-destructive mt-1">{errors.message[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_type">Display Type</Label>
        <input type="hidden" name="display_type" value={displayType} />
        <Select
          value={displayType}
          onValueChange={handleDisplayTypeChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banner">Banner (Top of page)</SelectItem>
            <SelectItem value="popup">Popup (Center modal)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Banner displays at the top of every page. Popup appears as a modal dialog.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="color_scheme">Color Scheme</Label>
        <input type="hidden" name="color_scheme" value={colorScheme} />
        <Select value={colorScheme} onValueChange={setColorScheme}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info (Blue)</SelectItem>
            <SelectItem value="success">Success (Green)</SelectItem>
            <SelectItem value="warning">Warning (Yellow)</SelectItem>
            <SelectItem value="danger">Danger (Red)</SelectItem>
            {displayType === "popup" && (
              <SelectItem value="white">White (Clean)</SelectItem>
            )}
          </SelectContent>
        </Select>
        {displayType === "popup" && (
          <p className="text-sm text-muted-foreground">
            White theme is only available for popup notifications.
          </p>
        )}
      </div>

      {displayType === "popup" && (
        <div className="space-y-2">
          <Label>Popup Image (Optional)</Label>
          {imageUrl ? (
            <div className="relative">
              <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-border">
                <Image
                  src={imageUrl}
                  alt="Notification image"
                  fill
                  className="object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  {isUploading ? (
                    <Spinner className="h-8 w-8" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? "Uploading..." : "Click to upload an image"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WebP up to 5MB
                  </p>
                </div>
              </label>
            </div>
          )}
          <Input type="hidden" name="image_url" value={imageUrl || ""} />
        </div>
      )}
      <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <Label htmlFor="is_active">Display Notification</Label>
          <p className="text-sm text-muted-foreground">
            Turn this on to show the notification to all visitors.
          </p>
        </div>
        <input type="hidden" name="is_active" value={String(isActive)} />
        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>
      <SubmitButton isUploading={isUploading} />
    </form>
  )
}

function SubmitButton({ isUploading }: { isUploading: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending || isUploading}>
      {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
      Save Settings
    </Button>
  )
}
