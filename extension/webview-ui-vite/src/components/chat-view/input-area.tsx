import React, { KeyboardEvent, startTransition, useCallback, useEffect, useState, useRef } from "react"
import Thumbnails from "../thumbnails/thumbnails"
import { Button } from "../ui/button"
import InputV1 from "./input-v1"
import { AtSign, ImagePlus, SendHorizonal } from "lucide-react"
import { AbortButton } from "./abort-button"
import { vscode } from "@/utils/vscode"
import { ModelDisplay } from "./model-display"

interface InputAreaProps {
	inputRef: React.RefObject<HTMLTextAreaElement>
	inputValue: string
	setInputValue: (value: string) => void
	textAreaDisabled: boolean
	handleSendMessage: () => void
	handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
	handlePaste: (e: React.ClipboardEvent) => void
	placeholderText: string
	selectedImages: string[]
	setSelectedImages: (images: string[]) => void
	shouldDisableImages: boolean
	selectImages: () => void
	thumbnailsHeight: number
	handleThumbnailsHeightChange: (height: number) => void
	isRequestRunning: boolean
	isInTask: boolean
}

const useHandleAbort = (isRequestRunning: boolean) => {
	const [isAborting, setIsAborting] = useState(false)
	const handleAbort = useCallback(() => {
		if (isAborting) return
		setIsAborting(true)

		vscode.postMessage({ type: "cancelCurrentRequest" })
	}, [isAborting])

	useEffect(() => {
		if (!isRequestRunning) {
			setIsAborting(false)
		}
	}, [isRequestRunning])

	return [handleAbort, isAborting] as const
}

const InputArea: React.FC<InputAreaProps> = ({
	inputValue,
	setInputValue,
	inputRef,
	textAreaDisabled,
	handleSendMessage,
	handleKeyDown,
	handlePaste,
	selectedImages,
	setSelectedImages,
	shouldDisableImages,
	selectImages,
	thumbnailsHeight,
	handleThumbnailsHeightChange,
	isRequestRunning,
}) => {
	const [_, setIsTextAreaFocused] = useState(false)
	const [handleAbort, isAborting] = useHandleAbort(isRequestRunning)

	// Drag handle state and logic
	const dragHandleRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [initialHeight, setInitialHeight] = useState(0)
	const [initialMouseY, setInitialMouseY] = useState(0)
	const [textareaHeight, setTextareaHeight] = useState(120) // Control textarea height

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault()
			setIsDragging(true)
			setInitialMouseY(e.clientY)
			setInitialHeight(textareaHeight)
		},
		[textareaHeight]
	)

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging) return

			const deltaY = initialMouseY - e.clientY // Reverse direction: drag up to increase height
			const newHeight = Math.max(120, initialHeight + deltaY) // Minimum height changed to 120px
			setTextareaHeight(newHeight)
		},
		[isDragging, initialMouseY, initialHeight]
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
		<>
			<div style={{ position: "relative" }}>
				{/* Drag handle - located on the right, 20px from right window margin */}
				<div
					ref={dragHandleRef}
					onMouseDown={handleMouseDown}
					className="cursor-ns-resize transition-colors duration-200"
					style={{
						position: "absolute",
						right: "20px",
						top: "-8px",
						width: "40px",
						height: "4px",
						backgroundColor: "rgba(128, 128, 128, 0.3)",
						borderRadius: "2px",
						zIndex: 10,
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = "#66FFDA"
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = "rgba(128, 128, 128, 0.3)"
					}}
					title="Drag to resize input area"
				/>
				<div
					ref={containerRef}
					className="flex flex-col justify-end"
					style={{
						padding: "8px 8px",
						position: "relative",
						backgroundColor: "var(--vscode-input-background, #1f1f1fff)",
						borderRadius: "16px",
						border: "1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.1))",
					}}
				>
					<div className="relative">
						<InputV1
							isRequestRunning={isRequestRunning}
							thumbnailsHeight={thumbnailsHeight}
							ref={inputRef}
							value={inputValue}
							disabled={textAreaDisabled}
							onChange={(e) => setInputValue(e.target.value)}
							onInsertAt={() => {
								const newText = inputValue + "@"
								setInputValue(newText)
								setTimeout(() => {
									if (inputRef.current) {
										inputRef.current.focus()
										inputRef.current.setSelectionRange(newText.length, newText.length)
									}
								}, 0)
							}}
							onKeyDown={handleKeyDown}
							onFocus={() => setIsTextAreaFocused(true)}
							onBlur={() => setIsTextAreaFocused(false)}
							onPaste={handlePaste}
							height={textareaHeight}
						/>
					<Thumbnails
						images={selectedImages}
						setImages={setSelectedImages}
						onHeightChange={handleThumbnailsHeightChange}
						style={{
							position: "absolute",
							paddingTop: 4,
							bottom: 8,
							left: 8,
							// right: 67,
						}}
					/>
					<div
						style={{
							position: "absolute",
							right: 4,
							top: "50%",
							transform: "translateY(-50%)",
						}}
						className="flex items-center gap-2">
						{isRequestRunning ? (
							<AbortButton isAborting={isAborting} onAbort={handleAbort} />
						) : (
							<Button
								tabIndex={0}
								disabled={textAreaDisabled}
								variant="ghost"
								className="!p-1 h-6 w-6"
								size="icon"
								aria-label="Send Message"
								onClick={handleSendMessage}>
								<SendHorizonal size={16} />
							</Button>
						)}
					</div>
				</div>

				<div className="flex justify-between items-center px-1 pt-1">
					<ModelDisplay />
					<div className="flex items-center gap-2">
						{/* <Button
							tabIndex={0}
							variant="ghost"
							className="!p-1 h-6 w-6"
							size="icon"
							aria-label="Insert @"
							onClick={() => {
								const newText = inputValue + "@"
								setInputValue(newText)
							}}>
							<AtSign size={16} />
						</Button> */}
						<Button
							tabIndex={0}
							disabled={shouldDisableImages}
							variant="ghost"
							className="!p-1 h-6 w-6"
							size="icon"
							aria-label="Attach Images"
							onClick={selectImages}>
							<ImagePlus size={16} />
						</Button>
					</div>
				</div>
			</div>
			</div>
		</>
	)
}

export default InputArea
