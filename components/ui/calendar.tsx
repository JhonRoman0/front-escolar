"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { es } from "react-day-picker/locale/es"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Envoltura de react-day-picker v10.
 *
 * La v10 ya entrega su propia hoja de estilos (importada en globals.css) y
 * configura color y medidas mediante variables `--rdp-*`. Por eso aquí no se
 * reescriben los classNames de cada elemento: se respeta la estructura que
 * trae la librería y solo se ajusta el contenedor y los iconos de navegación.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      className={cn("rdp-root bg-background p-3", className)}
      classNames={classNames}
      components={{
        Chevron: ({ className: chevronClass, orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("size-4", chevronClass)} {...chevronProps} />
          ) : (
            <ChevronRightIcon className={cn("size-4", chevronClass)} {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }