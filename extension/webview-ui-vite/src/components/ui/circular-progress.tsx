import React, { useState } from "react"
import { Progress } from "./progress"
import { useExtensionState } from "@/context/extension-state-context"

interface CircularProgressProps {
	style?: React.CSSProperties
	className?: string
	defaultColor?: string
	hoverColor?: string
	isHovered?: boolean
}

/**
 * Circular progress component that displays context memory usage percentage
 * 
 * @description
 * This component shows a circular progress indicator representing the current context window usage.
 * It uses the same data processing logic as token-info.tsx to calculate the percentage.
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
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({ 
	style, 
	className,
	defaultColor = "rgba(128, 128, 128, 0.3)",
	hoverColor = "#66FFDA",
	isHovered: externalIsHovered,
}) => {
	// Get context tokens from extension state (same as task-header.tsx)
	let { currentContextTokens, currentContextWindow } = useExtensionState()

	// Same logic as token-info.tsx
	currentContextTokens = currentContextTokens ?? 0
	const contextPercentage = currentContextWindow
		? Math.round((currentContextTokens / currentContextWindow) * 100)
		: 0

	// Hover state (same as drag-handle.tsx) - use external state if provided
	const [internalIsHovered, setInternalIsHovered] = useState(false)
	const isHovered = externalIsHovered !== undefined ? externalIsHovered : internalIsHovered

	// Only show when context window is available
	if ((currentContextWindow ?? 0) <= 0) {
		return null
	}

	return (
		<div 
			style={{
				...style,
				opacity: isHovered ? 1 : 0.3,
				transition: 'opacity 200ms',
			}} 
			className={className}
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
		>
			<Progress 
				value={contextPercentage}
				style={{
					// Apply color based on hover state (same as drag-handle.tsx)
					filter: isHovered ? 'brightness(1.5) hue-rotate(-20deg)' : 'none',
				}}
			/>
		</div>
	)
}

