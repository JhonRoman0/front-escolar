"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface CampoChipProps {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  children: React.ReactNode
}

export function CampoChip({
  checked,
  onCheckedChange,
  disabled,
  children,
}: CampoChipProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        disabled && "cursor-not-allowed opacity-80",
        checked
          ? "border-brand/30 bg-brand-subtle"
          : "border-transparent bg-background hover:bg-muted/60"
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      <span className={cn("font-medium", checked ? "text-brand dark:text-white" : "text-foreground")}>
        {children}
      </span>
    </label>
  )
}