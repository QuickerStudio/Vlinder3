import React, { useState } from "react"
import { ChevronDown, ChevronUp, Edit2, Unlock, Trash2, Plus } from "lucide-react"
import { ParsedCommand } from "../../hooks/use-terminal-policy-parser"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TerminalPolicyTagListProps {
	title: string
	commands: ParsedCommand[]
	onCommandEdit: (id: string, newCommand: string) => void
	onCommandUnblock: (id: string) => void
	onCommandDelete: (id: string) => void
	onCommandAdd: (command: string) => void
}

export const TerminalPolicyTagList: React.FC<TerminalPolicyTagListProps> = ({
	title,
	commands,
	onCommandEdit,
	onCommandUnblock,
	onCommandDelete,
	onCommandAdd,
}) => {
	const [isExpanded, setIsExpanded] = useState(true)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editValue, setEditValue] = useState("")
	const [isAdding, setIsAdding] = useState(false)
	const [addValue, setAddValue] = useState("")

	const handleEditStart = (command: ParsedCommand) => {
		setEditingId(command.id)
		setEditValue(command.command)
	}

	const handleEditSave = (id: string) => {
		if (editValue.trim()) {
			onCommandEdit(id, editValue.trim())
		}
		setEditingId(null)
		setEditValue("")
	}

	const handleEditCancel = () => {
		setEditingId(null)
		setEditValue("")
	}

	const handleAddStart = () => {
		setIsAdding(true)
		setAddValue("")
	}

	const handleAddSave = () => {
		if (addValue.trim()) {
			onCommandAdd(addValue.trim())
		}
		setIsAdding(false)
		setAddValue("")
	}

	const handleAddCancel = () => {
		setIsAdding(false)
		setAddValue("")
	}

	return (
		<div className="space-y-2">
			{/* Header */}
			<div className="flex items-center gap-2">
				<span className="text-xs font-medium text-muted-foreground">{title}</span>
				<div className="flex-1 h-px bg-border" />
				<Button
					variant="ghost"
					size="sm"
					className="h-5 w-5 p-0"
					onClick={handleAddStart}
					title="Add new command"
				>
					<Plus className="h-3 w-3" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="h-5 w-5 p-0"
					onClick={() => setIsExpanded(!isExpanded)}
				>
					{isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
				</Button>
			</div>

		{/* Tags */}
		{isExpanded && (
			<div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto scrollbar-hide">
				{/* Add new command input */}
				{isAdding && (
					<div className="flex items-center h-5 bg-primary/10 rounded border border-primary overflow-hidden w-full">
						<Input
							value={addValue}
							onChange={(e) => setAddValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleAddSave()
								} else if (e.key === "Escape") {
									handleAddCancel()
								}
							}}
							placeholder="Enter command..."
							className="h-5 text-xs border-0 bg-transparent px-2 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
							autoFocus
						/>
						<div className="flex items-center border-l border-primary flex-shrink-0">
							<button
								onClick={handleAddSave}
								className="h-5 px-1.5 hover:bg-accent text-xs"
								title="Save"
							>
								✓
							</button>
							<button
								onClick={handleAddCancel}
								className="h-5 px-1.5 hover:bg-accent text-xs border-l border-primary"
								title="Cancel"
							>
								✕
							</button>
						</div>
					</div>
				)}
				{commands.map((cmd) => (
					<div
						key={cmd.id}
						className="flex items-center h-5 bg-secondary/50 rounded border border-border overflow-hidden w-full"
					>
						{editingId === cmd.id ? (
							<>
								<Input
									value={editValue}
									onChange={(e) => setEditValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handleEditSave(cmd.id)
										} else if (e.key === "Escape") {
											handleEditCancel()
										}
									}}
									className="h-5 text-xs border-0 bg-transparent px-2 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
									autoFocus
								/>
								<div className="flex items-center border-l border-border flex-shrink-0">
									<button
										onClick={() => handleEditSave(cmd.id)}
										className="h-5 px-1.5 hover:bg-accent text-xs"
										title="Save"
									>
										✓
									</button>
									<button
										onClick={handleEditCancel}
										className="h-5 px-1.5 hover:bg-accent text-xs border-l border-border"
										title="Cancel"
									>
										✕
									</button>
								</div>
							</>
						) : (
							<>
								<span className="text-xs px-2 font-mono flex-1 truncate">{cmd.command}</span>
								<div className="flex items-center border-l border-border flex-shrink-0">
									<button
										onClick={() => handleEditStart(cmd)}
										className="h-5 px-1.5 hover:bg-accent"
										title="Edit"
									>
										<Edit2 className="h-3 w-3" />
									</button>
									<button
										onClick={() => onCommandUnblock(cmd.id)}
										className="h-5 px-1.5 hover:bg-accent border-l border-border"
										title="Unblock"
									>
										<Unlock className="h-3 w-3" />
									</button>
									<button
										onClick={() => onCommandDelete(cmd.id)}
										className="h-5 px-1.5 hover:bg-destructive hover:text-destructive-foreground border-l border-border"
										title="Delete"
									>
										<Trash2 className="h-3 w-3" />
									</button>
								</div>
							</>
						)}
					</div>
				))}
			</div>
		)}
		</div>
	)
}

