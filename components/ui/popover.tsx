"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

function PopoverTrigger({
  className,
  ...props
}: PopoverPrimitive.Trigger.Props) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      className={cn(className)}
      {...props}
    />
  )
}

// El z-50 coincide con el de dialog y select. El calendario se abre desde
// dentro del Dialog de anio escolar, asi que comparte esa misma pila.
function PopoverContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 4,
  alignOffset = 0,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset" | "alignOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            // max-w-[var(--available-width)]: el calendario es más ancho que su input
            // y no se puede bloquear al ancho del trigger sin recortar las 7 columnas.
            // Lo que sí se acota es el espacio disponible, para que no se salga de la
            // ventana ni de los bordes del modal.
            "z-50 w-auto max-w-[var(--available-width)] origin-(--transform-origin) rounded-lg border bg-popover p-4 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none transition-[transform,scale,opacity] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverClose({
  className,
  ...props
}: PopoverPrimitive.Close.Props) {
  return (
    <PopoverPrimitive.Close
      data-slot="popover-close"
      className={cn(className)}
      {...props}
    />
  )
}

export { Popover, PopoverClose, PopoverContent, PopoverTrigger }