import React, { useCallback, useEffect, useRef, useState } from "react"

interface DragHandleProps {
	onHeightChange: (height: number) => void
	initialHeight?: number
	minHeight?: number
	position?: {
		right?: string
		left?: string
		top?: string
	}
	width?: string
	height?: string
	hoverColor?: string
	defaultColor?: string
	title?: string
	className?: string
	onHoverChange?: (isHovered: boolean) => void
	isHovered?: boolean
}

export const DragHandle: React.FC<DragHandleProps> = ({
	onHeightChange,
	initialHeight = 120,
	minHeight = 120,
	position = { right: "20px", top: "-8px" },
	width = "40px",
	height = "4px",
	hoverColor = "#66FFDA",
	defaultColor = "rgba(128, 128, 128, 0.3)",
	title = "Drag to resize input area",
	className = "",
	onHoverChange,
	isHovered: externalIsHovered,
}) => {
	const [internalIsHovered, setInternalIsHovered] = useState(false)
	const isHovered = externalIsHovered !== undefined ? externalIsHovered : internalIsHovered
	const dragHandleRef = useRef<HTMLDivElement>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [currentHeight, setCurrentHeight] = useState(initialHeight)
	const [initialMouseY, setInitialMouseY] = useState(0)
	const [dragStartHeight, setDragStartHeight] = useState(0)

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault()
			setIsDragging(true)
			setInitialMouseY(e.clientY)
			setDragStartHeight(currentHeight)
		},
		[currentHeight]
	)

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging) return

			const deltaY = initialMouseY - e.clientY // Reverse direction: drag up to increase height
			const newHeight = Math.max(minHeight, dragStartHeight + deltaY)
			setCurrentHeight(newHeight)
			onHeightChange(newHeight)
		},
		[isDragging, initialMouseY, dragStartHeight, minHeight, onHeightChange]
	)

	const handleMouseUp = useCallback(() => {
		setIsDragging(false)
	}, [])

	useEffect(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove)
			document.addEventListener("mouseup", handleMouseUp)
			return () => {
				document.removeEventListener("mousemove", handleMouseMove)
				document.removeEventListener("mouseup", handleMouseUp)
			}
		}
	}, [isDragging, handleMouseMove, handleMouseUp])

	return (
		<div
			ref={dragHandleRef}
			onMouseDown={handleMouseDown}
			className={`cursor-ns-resize transition-colors duration-200 ${className}`}
			style={{
				position: "absolute",
				...position,
				width,
				height,
				backgroundColor: isHovered ? hoverColor : defaultColor,
				borderRadius: "2px",
				zIndex: 10,
			}}
			onMouseEnter={(e) => {
				if (onHoverChange) {
					onHoverChange(true)
				} else {
					setInternalIsHovered(true)
				}
			}}
			onMouseLeave={(e) => {
				if (onHoverChange) {
					onHoverChange(false)
				} else {
					setInternalIsHovered(false)
				}
			}}
			title={title}
		/>
	)
}

