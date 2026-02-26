import { vscode } from "@/utils/vscode"
import { useAtom } from "jotai"
import React, { KeyboardEvent, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { useEvent } from "react-use"
import { ExtensionMessage } from "extension/shared/messages/extension-message"
import { Resource } from "extension/shared/messages/client-message"
import AttachedResources from "./attached-resources"
import FileDialog from "./file-dialog"
import InputTextArea from "./input-text-area"
import MentionPopover, { popoverOptions } from "./mention-popover"
import ScrapeDialog from "./scrape-dialog"
import { FileNode } from "./file-tree"
import { attachmentsAtom } from "./atoms"
import PartnerPanel from "./partner-panel"

type InputOpts = {
	value: string
	disabled: boolean
	isRequestRunning: boolean
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
	onFocus: () => void
	onBlur: () => void
	onPaste: (e: React.ClipboardEvent) => void
	thumbnailsHeight: number
	onInsertAt?: () => void
	height?: number
	showPartnerPanel?: boolean
	textareaRef?: React.RefObject<HTMLTextAreaElement>
}

export type InputV1Ref = {
	textarea: HTMLTextAreaElement | null
	insertAt: () => void
}

const InputV2 = forwardRef<InputV1Ref, InputOpts>((props, forwardedRef) => {
	const handleInsertAt = () => {
		const newText = props.value + "@"
		props.onChange({
			target: { value: newText },
			persist: () => {},
		} as React.ChangeEvent<HTMLTextAreaElement>)
		setTextareaValue(newText)
		setShowPopover(true)
		setFocusedIndex(0)
		setCursorPosition(newText.length)
	}
	const [showPopover, setShowPopover] = useState(false)
	const [textareaValue, setTextareaValue] = useState(props.value ?? "")
	const [cursorPosition, setCursorPosition] = useState(0)
	const [focusedIndex, setFocusedIndex] = useState(-1)
	const localTextareaRef = useRef<HTMLTextAreaElement>(null)
	// Sync external textareaRef with localTextareaRef
	const setRefs = (el: HTMLTextAreaElement | null) => {
		;(localTextareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
		if (props.textareaRef) {
			;(props.textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
		}
	}
	const [openDialog, setOpenDialog] = useState<string | null>(null)
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
	const [scrapeUrl, setScrapeUrl] = useState("")
	const [scrapeDescription, setScrapeDescription] = useState("")
	const [fileTree, setFileTree] = useState<FileNode[]>([])
	const [attachedResources, setAttachedResources] = useAtom(attachmentsAtom)
	useImperativeHandle(forwardedRef, () => ({
		textarea: localTextareaRef.current,
		insertAt: handleInsertAt,
	}))

	useEffect(() => {
		vscode.postMessage({ type: "fileTree" })
	}, [])

	const handleMessage = useCallback((e: MessageEvent) => {
		const message: ExtensionMessage = e.data
		if (message.type === "fileTree") {
			setFileTree(message.tree)
		}
	}, [])

	useEvent("message", handleMessage)

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		props.onChange(e)
		const newValue = e.target.value
		const previousValue = textareaValue
		setTextareaValue(newValue)

		// check if this was a paste event skipping the "@" check
		if (newValue.length > previousValue.length + 1) {
			return
		}

		const newAtPositions = getAllAtPositions(newValue)
		const prevAtPositions = getAllAtPositions(previousValue)

		if (newAtPositions.length > prevAtPositions.length) {
			// A new "@" was added
			const newAtPosition = newAtPositions.find((pos) => !prevAtPositions.includes(pos))
			if (newAtPosition !== undefined) {
				setShowPopover(true)
				setFocusedIndex(0)
				setCursorPosition(newAtPosition + 1)
			}
		} else if (newAtPositions.length < prevAtPositions.length) {
			// An "@" was removed
			if (newAtPositions.length === 0) {
				setShowPopover(false)
			} else {
				// Optional: focus on the last remaining "@"
				setCursorPosition(newAtPositions[newAtPositions.length - 1] + 1)
			}
		}
	}

	// Helper function to get all "@" positions
	const getAllAtPositions = (text: string): number[] => {
		const positions: number[] = []
		let position = text.indexOf("@")
		while (position !== -1) {
			positions.push(position)
			position = text.indexOf("@", position + 1)
		}
		return positions
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (!showPopover) {
			props.onKeyDown(e)
		}
		if (showPopover) {
			switch (e.key) {
				case "ArrowDown":
				case "Tab":
					e.preventDefault()
					setFocusedIndex((prevIndex) => (prevIndex + 1) % popoverOptions.length)
					break
				case "ArrowUp":
					e.preventDefault()
					setFocusedIndex((prevIndex) => (prevIndex - 1 + popoverOptions.length) % popoverOptions.length)
					break
				case "Enter":
					if (focusedIndex !== -1) {
						e.preventDefault()
						handleOpenDialog(popoverOptions[focusedIndex].name)
					}
					break
				case "Escape":
					e.preventDefault()
					setShowPopover(false)
					break
			}
		}
	}

	const handleSubmitSelection = () => {
		const newResources: Resource[] = Array.from(selectedItems).map((item) => ({
			id: item,
			type: item.includes(".") ? "file" : "folder",
			name: item.split("/").pop() || item,
		}))
		setAttachedResources((prev) => [...prev, ...newResources])
		handleCloseDialog()
	}

	const handleScrapeSubmit = () => {
		if (scrapeUrl) {
			const newResource: Resource = {
				id: Date.now().toString(),
				type: "url",
				description: scrapeDescription,
				name: scrapeUrl,
			}
			console.debug(newResource)
			setAttachedResources((prev) => [...prev, newResource])
			handleCloseDialog()
		}
	}

	const handleOpenDialog = (dialogName: string) => {
		setShowPopover(false)
		if (dialogName === "debug") {
			vscode.postMessage({ type: "debug" })
			handleCloseDialog()
			return
		}
		setOpenDialog(dialogName)
		if (openDialog === "fileFolder") {
			vscode.postMessage({ type: "fileTree" })
		}
	}

	const handleCloseDialog = () => {
		// remove @ from the text
		const newText = textareaValue.slice(0, cursorPosition - 1) + textareaValue.slice(cursorPosition)
		setTextareaValue(newText)
		props.onChange({ target: { value: newText } } as React.ChangeEvent<HTMLTextAreaElement>)
		setShowPopover(false)
		setOpenDialog(null)
		setSelectedItems(new Set())
		setScrapeUrl("")
		setScrapeDescription("")
		localTextareaRef.current?.focus()
	}

	const handleRemoveResource = (id: string) => {
		setAttachedResources((prev) => prev.filter((resource) => resource.id !== id))
	}

	const panelHeight = props.height ? props.height - 32 : 88

	return (
		<>
			<div className="relative w-full">
				<MentionPopover
					showPopover={showPopover}
					setShowPopover={setShowPopover}
					focusedIndex={focusedIndex}
					setFocusedIndex={setFocusedIndex}
					handleOpenDialog={handleOpenDialog}
					// @ts-expect-error - event types are not the same but it's ok
					handleKeyDown={handleKeyDown}
				/>
				<AttachedResources
					onRemoveAll={() => setAttachedResources([])}
					resources={attachedResources}
					onRemove={handleRemoveResource}
				/>
				<div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
					{props.showPartnerPanel && (
						<div
							style={{
								border: "1px dashed var(--vscode-input-border, rgba(255,255,255,0.2))",
								borderRadius: 8,
								flex: "0 0 70%",
								height: panelHeight,
								overflow: "hidden",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<PartnerPanel className="w-full h-full" />
						</div>
					)}
					<div style={{ flex: props.showPartnerPanel ? "0 0 30%" : 1 }}>
						<InputTextArea
							{...props}
							ref={setRefs}
							value={props.value}
							onChange={handleTextareaChange}
							onKeyDown={handleKeyDown}
							setShowPopover={setShowPopover}
							height={props.height}
						/>
					</div>
				</div>
			</div>

			<FileDialog
				open={openDialog === "fileFolder"}
				onClose={handleCloseDialog}
				fileTree={fileTree}
				selectedItems={selectedItems}
				setSelectedItems={setSelectedItems}
				onSubmit={handleSubmitSelection}
			/>

			<ScrapeDialog
				open={openDialog === "scrape"}
				onClose={handleCloseDialog}
				scrapeUrl={scrapeUrl}
				setScrapeUrl={setScrapeUrl}
				scrapeDescription={scrapeDescription}
				setScrapeDescription={setScrapeDescription}
				onSubmit={handleScrapeSubmit}
			/>
		</>
	)
})

InputV2.displayName = "InputV2"

export default InputV2
