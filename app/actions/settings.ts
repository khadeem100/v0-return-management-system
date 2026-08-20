"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const bannerSettingsSchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
  color_scheme: z.enum(["info", "success", "warning", "danger", "white"]),
  display_type: z.enum(["banner", "popup"]),
  image_url: z.string().optional(),
  is_active: z.boolean(),
})

export async function getBannerSettings() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("notification_banner").select("*").single()

  if (error && error.code !== "PGRST116") { // Ignore "query returned no rows"
    console.error("Error fetching banner settings:", error)
    return { error: "Failed to fetch settings." }
  }
  return { settings: data }
}

export async function updateBannerSettings(prevState: any, formData: FormData) {
  const rawData = {
    message: formData.get("message"),
    color_scheme: formData.get("color_scheme") || "info",
    display_type: formData.get("display_type") || "banner",
    image_url: formData.get("image_url") || undefined,
    is_active: formData.get("is_active") === "true",
  }

  const validation = bannerSettingsSchema.safeParse(rawData)
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("notification_banner")
    .upsert({ id: 1, ...validation.data, updated_at: new Date().toISOString() })

  if (error) {
    console.error("Error updating banner settings:", error)
    return { success: false, error: { _form: ["Database error."] } }
  }

  // Revalidate all paths to show/hide the banner immediately
  revalidatePath("/", "layout")
  revalidatePath("/admin/settings")
  return { success: true, error: null }
}
