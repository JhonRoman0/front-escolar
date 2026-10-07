"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props<string>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props<string>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio flex w-full cursor-pointer items-start gap-3 rounded-[8px] border border-input bg-transparent p-3 text-left transition-colors outline-none hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 group-has-disabled/field:opacity-50 data-[checked]:border-brand-info data-[checked]:bg-accent/60",
        className
      )}
      {...props}
    >
      <span
        data-slot="radio-group-indicator"
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-transparent transition-colors group-data-[checked]/radio:border-brand-info"
      >
        <RadioPrimitive.Indicator className="size-2 rounded-full bg-brand-info" />
      </span>
      <span data-slot="radio-group-text" className="flex min-w-0 flex-col gap-0.5 leading-snug">
        {children}
      </span>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
