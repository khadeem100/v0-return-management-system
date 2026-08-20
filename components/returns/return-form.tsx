"use client"

import { useState, useMemo } from "react"
import { useForm, useFieldArray, UseFormSetValue, UseFormRegister, FieldErrors, useWatch, Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { submitReturnAction } from "@/app/actions/returns"
import { CheckCircle, AlertCircle, Plus, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ImageUpload } from "@/components/returns/image-upload"
import { Textarea } from "../ui/textarea"

interface Variation {
  id: string
  sku?: string | null
  attributes: Record<string, string>
}
interface Product {
  id: string
  name: string
  sku: string
  variations: Variation[]
}

const returnItemSchema = z.object({
  productVariationId: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  reason: z.enum(["DEFECTIVE", "WRONG_ITEM", "CHANGED_MIND", "NOT_AS_DESCRIBED", "OTHER"]),
  condition: z.string().optional(),
  selectedProduct: z.string().min(1, "Please select a product."),
  selectedAttributes: z.record(z.string()).optional(),
})

const baseReturnSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  description: z.string().min(10, "Please provide at least 10 characters."),
  preferredResolution: z.enum(["REFUND", "EXCHANGE", "STORE_CREDIT"]),
  images: z.array(z.string()).optional(),
})

const returnSchemaForType = baseReturnSchema.extend({
  items: z.array(returnItemSchema).min(1),
})

type ReturnFormData = z.infer<typeof returnSchemaForType>

interface ReturnFormProps {
  availableProducts: Product[]
}

interface ActionReturnItem {
  productId: string
  productVariationId?: string
  productName: string
  sku: string
  quantity: number
  reason: string
  condition?: string
}

interface ReturnItemCardProps {
  index: number
  availableProducts: Product[]
  control: Control<ReturnFormData>
  setValue: UseFormSetValue<ReturnFormData>
  register: UseFormRegister<ReturnFormData>
  errors: FieldErrors<ReturnFormData>
  remove: (index: number) => void
  canRemove: boolean
}

function ReturnItemCard({ index, availableProducts, control, setValue, register, errors, remove, canRemove }: ReturnItemCardProps) {
  const selectedProductId = useWatch({ control, name: `items.${index}.selectedProduct` })
  const selectedAttributes = useWatch({ control, name: `items.${index}.selectedAttributes` }) || {}

  const selectedProduct = useMemo(
    () => availableProducts.find((p: Product) => p.id === selectedProductId),
    [selectedProductId, availableProducts]
  )

  const hasVariations = useMemo(() => Boolean(selectedProduct?.variations.length), [selectedProduct])

  const productAttributes = useMemo(() => {
    if (!selectedProduct || !hasVariations) return []
    const attributes = new Set<string>()
    selectedProduct.variations.forEach(v => {
      Object.keys(v.attributes ?? {}).forEach(attr => attributes.add(attr))
    })
    return Array.from(attributes)
  }, [selectedProduct, hasVariations])

  const getAvailableOptions = (attributeName: string, currentSelections: Record<string, string>) => {
    if (!selectedProduct) return []

    const filteredVariations = selectedProduct.variations.filter(variation => {
      return Object.entries(currentSelections).every(([key, value]) => {
        return !value || variation.attributes[key] === value
      })
    })

    const options = new Set<string>()
    filteredVariations.forEach(variation => {
      if (variation.attributes[attributeName]) {
        options.add(variation.attributes[attributeName])
      }
    })
    return Array.from(options)
  }

  const handleAttributeChange = (attributeName: string, value: string) => {
    const newSelections = { ...selectedAttributes, [attributeName]: value }

    const attrIndex = productAttributes.indexOf(attributeName)
    for (let i = attrIndex + 1; i < productAttributes.length; i++) {
      const subsequentAttr = productAttributes[i]
      delete newSelections[subsequentAttr]
    }

    setValue(`items.${index}.selectedAttributes`, newSelections)

    const finalVariation = selectedProduct?.variations.find(v => {
      return productAttributes.every(attr => v.attributes[attr] === newSelections[attr])
    })

    if (finalVariation) {
      setValue(`items.${index}.productVariationId`, finalVariation.id)
    } else {
      setValue(`items.${index}.productVariationId`, "")
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Item {index + 1}</h4>
          {canRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <Label>Product *</Label>
            <Select
            value={selectedProductId || ""}
            onValueChange={(value) => {
              const product = availableProducts.find((candidate) => candidate.id === value)
              const attributes = product?.variations.flatMap((variation) => Object.keys(variation.attributes ?? {})) ?? []
              const uniqueAttributes = new Set(attributes)

              setValue(`items.${index}.selectedProduct`, value, { shouldValidate: true })
              setValue(`items.${index}.selectedAttributes`, {})
              setValue(
                `items.${index}.productVariationId`,
                uniqueAttributes.size === 0 && product?.variations.length === 1 ? product.variations[0].id : "",
                { shouldValidate: true },
              )
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
            <SelectContent>
              {availableProducts.map((p: Product) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasVariations && (
          <>
            {productAttributes.map((attrName, attrIndex) => {
              const currentSelectionsForThisDropdown: Record<string, string> = {}
              for (let i = 0; i < attrIndex; i++) {
                const prevAttrName = productAttributes[i]
                if (selectedAttributes[prevAttrName]) {
                  currentSelectionsForThisDropdown[prevAttrName] = selectedAttributes[prevAttrName]
                }
              }
              const options = getAvailableOptions(attrName, currentSelectionsForThisDropdown)
              const isEnabled = attrIndex === 0 ? !!selectedProduct : !!selectedAttributes[productAttributes[attrIndex - 1]]

              return (
                <div key={attrName} className="space-y-2">
                  <Label>{attrName} *</Label>
                  <Select
                    onValueChange={(value) => handleAttributeChange(attrName, value)}
                    value={selectedAttributes[attrName] || ""}
                    disabled={!isEnabled}
                  >
                    <SelectTrigger><SelectValue placeholder={`Select ${attrName}`} /></SelectTrigger>
                    <SelectContent>
                      {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
            {errors.items?.[index]?.productVariationId && <p className="text-sm text-destructive">{errors.items[index]?.productVariationId?.message}</p>}
          </>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Quantity *</Label>
            <Input type="number" min="1" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
            {errors.items?.[index]?.quantity && <p className="text-sm text-destructive">{errors.items[index]?.quantity?.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Reason for Return *</Label>
            <Select onValueChange={(value) => setValue(`items.${index}.reason`, value as any)}>
              <SelectTrigger><SelectValue placeholder="Select Reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFECTIVE">Defective/Damaged</SelectItem>
                <SelectItem value="WRONG_ITEM">Wrong Item Received</SelectItem>
                <SelectItem value="CHANGED_MIND">Changed Mind</SelectItem>
                <SelectItem value="NOT_AS_DESCRIBED">Not as Described</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function ReturnForm({ availableProducts }: ReturnFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])

  const returnSchema = useMemo(() => {
    const itemSchemaWithRefine = returnItemSchema.superRefine((data, ctx) => {
      const product = availableProducts.find(p => p.id === data.selectedProduct)
      const hasSelectableVariationAttributes = product?.variations.some((variation) =>
        Object.keys(variation.attributes ?? {}).length > 0,
      )

      if (hasSelectableVariationAttributes && !data.productVariationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["productVariationId"],
          message: "Please select a complete product variation.",
        })
      }
    })

    return baseReturnSchema.extend({
      items: z.array(itemSchemaWithRefine).min(1, "At least one item is required."),
    })
  }, [availableProducts])

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      items: [{ productVariationId: "", quantity: 1, reason: "DEFECTIVE", selectedProduct: "" }],
      images: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  const onSubmit = async (data: ReturnFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const itemsWithDetails: ActionReturnItem[] = data.items
        .map((item): ActionReturnItem | null => {
          const product = availableProducts.find(p => p.id === item.selectedProduct)
          if (!product) return null

          const variation = item.productVariationId
            ? product.variations.find(v => v.id === item.productVariationId)
            : null

          return {
            productId: product.id,
            productVariationId: variation?.id,
            productName: product.name,
            sku: variation?.sku || product.sku,
            quantity: item.quantity,
            reason: item.reason,
            condition: item.condition,
          }
        })
        .filter((item): item is ActionReturnItem => !!item)

      if (itemsWithDetails.length !== data.items.length) {
        setError("Could not find details for all selected items. Please try again.")
        setIsLoading(false)
        return
      }

      const result = await submitReturnAction({ ...data, items: itemsWithDetails, images })
      if (result.error) {
        setError(result.error)
      } else if (result.returnNumber) {
        setSuccess(`Return submitted! Your tracking number is: ${result.returnNumber}`)
      }
    } catch (err) {
      setError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">{success}</AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4" id="tour-contact-info">
        <h3 className="text-lg font-semibold">Contact Information</h3>
        <div className="space-y-2">
          <Label htmlFor="customerName">Full Name *</Label>
          <Input id="customerName" {...register("customerName")} />
          {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email Address *</Label>
          <Input id="customerEmail" type="email" {...register("customerEmail")} />
          {errors.customerEmail && <p className="text-sm text-destructive">{errors.customerEmail.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone Number (optional)</Label>
          <Input id="customerPhone" type="tel" {...register("customerPhone")} />
        </div>
      </div>

      <div className="space-y-4" id="tour-return-details">
        <h3 className="text-lg font-semibold">Return Details</h3>
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea id="description" rows={4} {...register("description")} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Preferred Resolution *</Label>
          <Select onValueChange={(value) => setValue("preferredResolution", value as any)}>
            <SelectTrigger><SelectValue placeholder="Select your preference" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REFUND">Refund</SelectItem>
              <SelectItem value="EXCHANGE">Exchange</SelectItem>
              <SelectItem value="STORE_CREDIT">Store Credit</SelectItem>
            </SelectContent>
          </Select>
          {errors.preferredResolution && <p className="text-sm text-destructive">{errors.preferredResolution.message}</p>}
        </div>
      </div>

      <div className="space-y-4" id="tour-items-section">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Items to Return</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ productVariationId: "", quantity: 1, reason: "DEFECTIVE", selectedProduct: "" })}>
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
        {fields.map((field, index) => (
          <ReturnItemCard
            key={field.id}
            index={index}
            availableProducts={availableProducts}
            control={control}
            setValue={setValue}
            register={register}
            errors={errors}
            remove={remove}
            canRemove={fields.length > 1}
          />
        ))}
        {errors.items && <p className="text-sm text-destructive">{errors.items.message}</p>}
      </div>

      <div className="space-y-4" id="tour-image-upload">
        <h3 className="text-lg font-semibold">Product Images (Optional)</h3>
        <ImageUpload
          images={images}
          onUpload={(url) => setImages(prev => [...prev, url])}
          onRemove={(url) => setImages(prev => prev.filter(i => i !== url))}
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isLoading} id="tour-submit-button">
        {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
        Submit Return Request
      </Button>
    </form>
  )
}
