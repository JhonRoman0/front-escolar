"use client"

import { Fragment } from "react"

interface StepperProps {
  steps: string[]
  paso: number
}

export function Stepper({ steps, paso }: StepperProps) {
  return (
    <div
      role="list"
      aria-label="Progreso de la matrícula"
      className="@container w-full"
    >
      <div className="flex w-full flex-nowrap items-center justify-center gap-x-0.5 @xs:gap-x-1 @sm:gap-x-1.5 @xl:gap-x-1.5">
        {steps.map((label, i) => (
          <Fragment key={label}>
            <div
              role="listitem"
              aria-current={i + 1 === paso ? "step" : undefined}
              className="flex shrink-0 flex-col items-center gap-0.5 @xs:flex-row @xs:items-center @xs:gap-1 @sm:gap-1.5 @xl:gap-1.5"
            >
              <div
                aria-hidden="true"
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors @sm:size-7 ${
                  i + 1 <= paso ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-center text-xs leading-tight @sm:leading-normal @xl:text-sm ${
                  i + 1 === paso ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                aria-hidden="true"
                className="mx-px h-px w-1 shrink-0 bg-border @xs:mx-0.5 @xs:w-2 @sm:mx-1 @sm:w-4 @xl:w-6"
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
