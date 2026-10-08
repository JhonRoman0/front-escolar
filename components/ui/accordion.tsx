"use client"

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"

import { cn } from "@/lib/utils"

function Accordion({ ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col gap-3", props.className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("w-full", className)}
      {...props}
    />
  )
}

function AccordionTrigger({ className, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      // El grupo existe para que el consumidor pueda rotar un ícono con
      // `group-data-[panel-open]:*` sin tener que volver a inyectarlo.
      className={cn(
        "group/accordion-trigger flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:hover:brightness-110",
        className
      )}
      {...props}
    />
  )
}

function AccordionPanel({ className, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn("w-full", className)}
      {...props}
    />
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel }