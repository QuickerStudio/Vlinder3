import React, { useState } from "react"
import { Progress } from "./progress"
import { useExtensionState } from "@/context/extension-state-context"
import { cn } from "@/lib/utils"
import { ArrowTooltip, ArrowTooltipTrigger, ArrowTooltipContent, ArrowTooltipProvider } from "./arrow-tooltips"

interface CircularProgressProps {
	style?: React.CSSProperties
	className?: string
	defaultColor?: string
	hoverColor?: string
	isHovered?: boolean
}

/**
 * CircularProgress - Memory Usage Indicator (Domain-Specific Component)
 * 
 * 🎯 Specifically designed for displaying memory usage
 * ⚠️ Includes warning logic (70% threshold)
 * 🎨 Includes specific visual effects (breathing pulse, color changes)
 * 
 * @description
 * This component displays context memory usage as a circular progress indicator with built-in
 * warning states. When memory usage exceeds 70%, it automatically switches to warning mode
 * with a pink color (#FF63CB) and breathing animation to alert the user.
 * 
 * @features
 * - **0%~70%**: Cyan color (primary theme), normal opacity
 * - **70%~100%**: Pink color (#FF63CB), breathing pulse animation, 75% opacity
 * - **Hover State**: Synced with DragHandle hover state for unified UX
 * - **Auto-hide**: Doesn't render when context window is not available
 * 
 * @usage
 * - Used in input-area.tsx: Floats above the drag handle
 * - Used in token-info.tsx: As part of the token information card (left side)
 * 
 * @component-relationship
 * - Uses {@link Progress} component (progress.tsx) for the circular ring visualization
 * - Uses {@link useExtensionState} hook to fetch currentContextTokens and currentContextWindow
 * - Related to {@link DragHandle} component in input-area.tsx (displayed above it)
 * 
 * @see extension/webview-ui-vite/src/components/chat-view/input-area.tsx - Displayed above drag handle
 * @see extension/webview-ui-vite/src/components/task-header/token-info.tsx - Same logic reference
 * 
 * @example
 * ```tsx
 * // Basic usage (auto-fetches data from extension state)
 * <CircularProgress />
 * 
 * // With external hover state (synced with drag handle)
 * <CircularProgress isHovered={isDragHandleHovered} />
 * ```
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({ 
	style, 
	className,
	defaultColor = "rgba(128, 128, 128, 0.3)",
	hoverColor = "#66FFDA",
	isHovered: externalIsHovered,
}) => {
	// Get context tokens from extension state (same as task-header.tsx)
	let { currentContextTokens, currentContextWindow, currentTask } = useExtensionState()

	// Same logic as token-info.tsx
	currentContextTokens = currentContextTokens ?? 0
	const contextPercentage = currentContextWindow
		? Math.round((currentContextTokens / currentContextWindow) * 100)
		: 0

	// Hover state (same as drag-handle.tsx) - use external state if provided
	const [internalIsHovered, setInternalIsHovered] = useState(false)
	const isHovered = externalIsHovered !== undefined ? externalIsHovered : internalIsHovered

	// Tooltip state - show when mouse is pressed down
	const [isTooltipOpen, setIsTooltipOpen] = useState(false)

	// Format tooltip content (same as token-info.tsx)
	const totalCost = currentTask?.totalCost ?? 0
	const tooltipContent = `Memory: ${currentContextTokens?.toLocaleString() ?? 0}/${currentContextWindow?.toLocaleString() ?? 0} | Cost: $${totalCost.toFixed(4)}`

	// Only show when context window is available
	if ((currentContextWindow ?? 0) <= 0) {
		return null
	}

	// Check if in warning zone (70%~100%)
	const isWarningZone = contextPercentage >= 70

	return (
		<ArrowTooltipProvider delayDuration={0} disableHoverableContent>
			<ArrowTooltip 
				open={isTooltipOpen} 
				onOpenChange={(open) => {
					// Only allow manual control via mouse down/up
					// Prevent auto-open on hover
				}}
			>
				<ArrowTooltipTrigger asChild>
				<div 
					className={cn(className, isWarningZone && "circular-progress-warning")}
					style={{
						...style,
						opacity: isWarningZone ? 0.75 : (isHovered ? 1 : 0.3),
						transition: 'opacity 200ms',
						cursor: 'pointer',
					}}
					onMouseEnter={() => {
						if (externalIsHovered === undefined) {
							setInternalIsHovered(true)
						}
					}}
					onMouseLeave={() => {
						if (externalIsHovered === undefined) {
							setInternalIsHovered(false)
						}
					}}
					onMouseDown={(e) => {
						e.preventDefault()
						setIsTooltipOpen(true)
					}}
					onMouseUp={() => {
						setIsTooltipOpen(false)
					}}
				>
					<Progress 
						value={contextPercentage}
						style={{
							// Apply color based on hover state (same as drag-handle.tsx)
							filter: isWarningZone ? 'none' : (isHovered ? 'brightness(1.5) hue-rotate(-20deg)' : 'none'),
						}}
					/>
				</div>
				</ArrowTooltipTrigger>
				<ArrowTooltipContent side="right" sideOffset={10}>
					{tooltipContent}
				</ArrowTooltipContent>
			</ArrowTooltip>
		</ArrowTooltipProvider>
	)
}

