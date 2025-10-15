import React from "react"
import { Progress } from "./progress"
import { useExtensionState } from "@/context/extension-state-context"

interface CircularProgressProps {
	style?: React.CSSProperties
	className?: string
}

/**
 * Circular progress component that displays context memory usage percentage
 * Uses the same logic as token-info.tsx
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({ style, className }) => {
	// Get context tokens from extension state (same as task-header.tsx)
	let { currentContextTokens, currentContextWindow } = useExtensionState()

	// Same logic as token-info.tsx
	currentContextTokens = currentContextTokens ?? 0
	const contextPercentage = currentContextWindow
		? Math.round((currentContextTokens / currentContextWindow) * 100)
		: 0

	// Only show when context window is available
	if ((currentContextWindow ?? 0) <= 0) {
		return null
	}

	return (
		<div style={style} className={className}>
			<Progress value={contextPercentage} />
		</div>
	)
}

