import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  /**
   * Label for the checked state (shown inside the thumb)
   * @default "On"
   */
  checkedLabel?: string
  /**
   * Label for the unchecked state (shown inside the thumb)
   * @default "Off"
   */
  uncheckedLabel?: string
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, checkedLabel = "On", uncheckedLabel = "Off", checked, ...props }, ref) => {
  const [internalChecked, setInternalChecked] = React.useState(checked ?? props.defaultChecked ?? false)
  
  React.useEffect(() => {
    if (checked !== undefined) {
      setInternalChecked(checked)
    }
  }, [checked])

  const handleCheckedChange = (newChecked: boolean) => {
    setInternalChecked(newChecked)
    props.onCheckedChange?.(newChecked)
  }

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
      checked={checked}
      onCheckedChange={handleCheckedChange}
      ref={ref}
    >
      <SwitchPrimitives.Thumb className="pointer-events-none">
        {internalChecked ? checkedLabel : uncheckedLabel}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
