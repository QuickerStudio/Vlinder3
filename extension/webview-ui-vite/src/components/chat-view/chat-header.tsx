// components/ChatHeader.tsx
import React, { memo } from "react"
import { ClaudeMessage, V1ClaudeMessage } from "extension/shared/messages/extension-message"
import TaskHeader from "../task-header/task-header"

interface ChatHeaderProps {
	task?: ClaudeMessage
	onClose: () => void
	isHidden: boolean
	vlinderCredits: number
	vscodeUriScheme: string
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
	task,
	onClose,
	isHidden,
	vlinderCredits,
	vscodeUriScheme,
}) => {
	if (!task) return null

	return (
		<TaskHeader
			firstMsg={task}
			onClose={onClose}
			isHidden={isHidden}
			vlinderCredits={vlinderCredits}
			vscodeUriScheme={vscodeUriScheme}
		/>
	)
}
