import React, { forwardRef } from "react"
import DynamicTextArea from "react-textarea-autosize"

type InputTextAreaProps = {
	value: string
	disabled: boolean
	isRequestRunning: boolean
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
	onFocus: () => void
	onBlur: () => void
	onPaste: (e: React.ClipboardEvent) => void
	thumbnailsHeight: number
	setShowPopover: (show: boolean) => void
	height?: number // Optional height property
}

export const CHAT_BOX_INPUT_ID = "chat-box-input" as const

const InputTextArea = forwardRef<HTMLTextAreaElement, InputTextAreaProps>((props, ref) => {
	return (
		<>
			<style>{`
				#${CHAT_BOX_INPUT_ID}:focus {
					outline: 2px solid #66FFDA !important;
					outline-offset: -2px;
				}
			`}</style>
			<DynamicTextArea
				tabIndex={0}
				ref={ref}
				id={CHAT_BOX_INPUT_ID}
				value={props.value}
				disabled={props.disabled}
				onChange={props.onChange}
				onKeyDown={props.onKeyDown}
				onFocus={props.onFocus}
				onBlur={props.onBlur}
				onPaste={props.onPaste}
				placeholder={`Type your task or use @ to mention files or folders or URLs`}
				minRows={4}
				maxRows={32}
				className="custom-scrollbar !overflow-y-auto"
				autoFocus={true}
				style={{
					width: "100%",
					boxSizing: "border-box",
					backgroundColor: "#1F1F1F",
					color: "var(--vscode-input-foreground)",
					borderRadius: "12px",
					fontFamily: "var(--vscode-font-family)",
					fontSize: "var(--vscode-editor-font-size)",
					lineHeight: "var(--vscode-editor-line-height)",
					resize: "none",
					overflowY: "auto",
					overflowX: "hidden",
					border: "none",
					padding: "12px 16px",
					cursor: props.disabled ? "not-allowed" : undefined,
					opacity: props.disabled ? 0.5 : 1,
					flex: 1,
					// Use passed height, if none then use minimum height
					height: props.height ? props.height - 32 : undefined, // Subtract padding
					// Ensure text direction and scrollbar alignment
					direction: "ltr",
					textAlign: "left",
					// Custom scrollbar styles (Firefox fallback)
					scrollbarWidth: "thin",
					scrollbarColor: "var(--vscode-scrollbarSlider-background, rgba(255, 255, 255, 0.3)) transparent",
				}}
			/>
		</>
	)
})

InputTextArea.displayName = "InputTextArea"

export default InputTextArea
