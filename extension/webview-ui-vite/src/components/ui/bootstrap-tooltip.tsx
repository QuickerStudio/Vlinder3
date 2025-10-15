import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const BootstrapTooltipProvider = TooltipPrimitive.Provider

const BootstrapTooltipRoot = TooltipPrimitive.Root

const BootstrapTooltipTrigger = TooltipPrimitive.Trigger

const BootstrapTooltipArrow = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Arrow>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
	<TooltipPrimitive.Arrow
		ref={ref}
		className={cn("fill-black dark:fill-black", className)}
		width={10}
		height={5}
		{...props}
	/>
))
BootstrapTooltipArrow.displayName = "BootstrapTooltipArrow"

const BootstrapTooltipContent = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
	<TooltipPrimitive.Content
		avoidCollisions
		ref={ref}
		sideOffset={sideOffset}
		className={cn(
			"z-50 overflow-hidden rounded-md bg-black px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
			className
		)}
		{...props}
	>
		{children}
		<BootstrapTooltipArrow />
	</TooltipPrimitive.Content>
))
BootstrapTooltipContent.displayName = "BootstrapTooltipContent"

/**
 * BootstrapTooltip - Bootstrap-style Tooltip Component
 * 
 * @description
 * A tooltip component with Bootstrap-inspired styling:
 * - Black background
 * - White text
 * - Black arrow pointer
 * - Shadow effect
 * 
 * Based on Radix UI's Tooltip primitive, similar to MUI's BootstrapTooltip.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <BootstrapTooltip title="Add">
 *   <Button>Bootstrap</Button>
 * </BootstrapTooltip>
 * 
 * // Custom position
 * <BootstrapTooltip title="Tooltip text" side="right">
 *   <Button>Hover me</Button>
 * </BootstrapTooltip>
 * 
 * // Using composition
 * <BootstrapTooltipProvider>
 *   <BootstrapTooltipRoot>
 *     <BootstrapTooltipTrigger asChild>
 *       <Button>Trigger</Button>
 *     </BootstrapTooltipTrigger>
 *     <BootstrapTooltipContent>
 *       Custom content
 *     </BootstrapTooltipContent>
 *   </BootstrapTooltipRoot>
 * </BootstrapTooltipProvider>
 * ```
 */
const BootstrapTooltip: React.FC<{
	title: string
	children: React.ReactElement
	side?: "top" | "right" | "bottom" | "left"
	delayDuration?: number
}> = ({ title, children, side = "top", delayDuration = 200 }) => {
	return (
		<BootstrapTooltipProvider delayDuration={delayDuration}>
			<BootstrapTooltipRoot>
				<BootstrapTooltipTrigger asChild>{children}</BootstrapTooltipTrigger>
				<BootstrapTooltipContent side={side}>
					{title}
				</BootstrapTooltipContent>
			</BootstrapTooltipRoot>
		</BootstrapTooltipProvider>
	)
}

export {
	BootstrapTooltipRoot,
	BootstrapTooltipTrigger,
	BootstrapTooltipContent,
	BootstrapTooltipProvider,
	BootstrapTooltipArrow,
	BootstrapTooltip,
}

export default BootstrapTooltip

