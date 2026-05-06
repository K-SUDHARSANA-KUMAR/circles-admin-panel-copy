"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"
import { Label } from "./label"

interface CustomSwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  label?: string
}

function Switch({
  className,
  label = "",
  ...props
}: CustomSwitchProps) {
  return (
    <div className="flex items-center space-x-2.5">
      <SwitchPrimitive.Root
        data-slot="switch"
        className={cn(
          "relative inline-flex h-[24px] w-[48px] items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-freshleaf/20 data-[state=checked]:bg-freshleaf data-[state=unchecked]:bg-gray-300",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "pointer-events-none absolute left-[2px] top-[2px] h-[20px] w-[20px] rounded-full bg-white transition-transform duration-200 data-[state=checked]:translate-x-[24px] data-[state=unchecked]:translate-x-0"
          )}
        />
      </SwitchPrimitive.Root>
      <Label>{label}</Label>
    </div>
  )
}

export { Switch }
