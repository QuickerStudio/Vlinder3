import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const ArrowTooltipProvider = TooltipPrimitive.Provider

const ArrowTooltip = TooltipPrimitive.Root

const ArrowTooltipTrigger = TooltipPrimitive.Trigger

const ArrowTooltipArrow = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Arrow>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
	<TooltipPrimitive.Arrow
		ref={ref}
		className={cn("fill-cyan-500/80", className)}
		{...props}
	/>
))
ArrowTooltipArrow.displayName = TooltipPrimitive.Arrow.displayName

const ArrowTooltipContent = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
		showArrow?: boolean
	}
>(({ className, sideOffset = 4, showArrow = true, children, ...props }, ref) => (
	<TooltipPrimitive.Content
		avoidCollisions
		ref={ref}
		sideOffset={sideOffset}
		className={cn(
			"z-50 overflow-hidden",
			"rounded-full",
			"bg-cyan-500/60",
			"px-3 py-1.5",
			"text-xs text-white",
			"animate-in fade-in-0 zoom-in-95",
			"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
			"data-[side=bottom]:slide-in-from-top-2",
			"data-[side=left]:slide-in-from-right-2",
			"data-[side=right]:slide-in-from-left-2",
			"data-[side=top]:slide-in-from-bottom-2",
			className
		)}
		{...props}
	>
		{children}
		{showArrow && <ArrowTooltipArrow />}
	</TooltipPrimitive.Content>
))
ArrowTooltipContent.displayName = TooltipPrimitive.Content.displayName

/**
 * ArrowTooltips - Tooltip with Arrow Component
 * 
 * @description
 * A wrapper component that provides a tooltip with an arrow pointer.
 * Based on Radix UI's Tooltip primitive, similar to the basic Tooltip component
 * but includes an arrow by default.
 * 
 * @example
 * ```tsx
 * // Basic usage with arrow
 * <ArrowTooltipProvider>
 *   <ArrowTooltip>
 *     <ArrowTooltipTrigger asChild>
 *       <Button>Hover me</Button>
 *     </ArrowTooltipTrigger>
 *     <ArrowTooltipContent>
 *       Add tooltip text here
 *     </ArrowTooltipContent>
 *   </ArrowTooltip>
 * </ArrowTooltipProvider>
 * 
 * // Without arrow
 * <ArrowTooltipContent showArrow={false}>
 *   Tooltip without arrow
 * </ArrowTooltipContent>
 * 
 * // Custom arrow color
 * <ArrowTooltipContent>
 *   Tooltip text
 * </ArrowTooltipContent>
 * ```
 */
const ArrowTooltips: React.FC<{
	title: string
	children: React.ReactElement
	side?: "top" | "right" | "bottom" | "left"
	showArrow?: boolean
	delayDuration?: number
}> = ({ title, children, side = "top", showArrow = true, delayDuration = 200 }) => {
	return (
		<ArrowTooltipProvider delayDuration={delayDuration}>
			<ArrowTooltip>
				<ArrowTooltipTrigger asChild>{children}</ArrowTooltipTrigger>
				<ArrowTooltipContent side={side} showArrow={showArrow}>
					{title}
				</ArrowTooltipContent>
			</ArrowTooltip>
		</ArrowTooltipProvider>
	)
}

export {
	ArrowTooltip,
	ArrowTooltipTrigger,
	ArrowTooltipContent,
	ArrowTooltipProvider,
	ArrowTooltipArrow,
	ArrowTooltips,
}

export default ArrowTooltips

