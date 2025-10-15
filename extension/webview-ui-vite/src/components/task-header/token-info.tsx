import { ArrowRightCircle, DatabaseBackup, FileInput, FileOutput, FilePen, Gauge, PlusCircle } from "lucide-react"
import React from "react"
import { Progress } from "../ui/progress"
import { useExtensionState } from "@/context/extension-state-context"

interface TokenInfoProps {
	tokensIn: number
	tokensOut: number
	doesModelSupportPromptCache: boolean
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
	currentContextTokens?: number
	currentContextWindow?: number
}

const TokenInfo: React.FC<TokenInfoProps> = ({
	tokensIn,
	tokensOut,
	doesModelSupportPromptCache,
	cacheWrites,
	cacheReads,
	totalCost,
	currentContextTokens,
	currentContextWindow,
}) => {
	currentContextTokens = currentContextTokens ?? 0
	const contextPercentage = currentContextWindow ? Math.round((currentContextTokens / currentContextWindow) * 100) : 0

	return (
		<div className="flex gap-5 p-1 sm:p-1.5 rounded-lg bg-background/95">
			{/* Left: Circular progress */}
			{(currentContextWindow ?? 0) > 0 && (
				<div className="flex items-center">
					<Progress value={contextPercentage} />
				</div>
			)}

			{/* Right: Two rows of information */}
			<div className="flex flex-col gap-1 justify-center flex-1 min-w-0">
				{/* First row: Memory */}
				{(currentContextWindow ?? 0) > 0 && (
					<div className="flex items-center gap-1 text-[11px] sm:text-xs">
						<Gauge className="w-3 h-3 text-muted-foreground shrink-0" />
						<span className="text-muted-foreground whitespace-nowrap">Memory:</span>
						<span className="truncate">
							{currentContextTokens ?? 0}/{currentContextWindow ?? 0}
						</span>
					</div>
				)}

				{/* Second row: In/Out, Cache, Cost */}
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3 sm:gap-y-1.5 text-[11px] sm:text-xs">
					<span className="flex items-center gap-1.5 min-w-0">
						<span className="text-muted-foreground whitespace-nowrap">In/Out:</span>
						<span className="flex items-center gap-1 min-w-0">
							<FileInput className="w-3 h-3 text-muted-foreground shrink-0" />
							<span className="truncate">{tokensIn?.toLocaleString() ?? 0}</span>
						</span>
						<span className="flex items-center gap-1 min-w-0">
							<FilePen className="w-3 h-3 text-muted-foreground shrink-0" />
							<span className="truncate">{tokensOut?.toLocaleString() ?? 0}</span>
						</span>
					</span>

					{(doesModelSupportPromptCache || cacheReads !== undefined || cacheWrites !== undefined) && (
						<span className="flex items-center gap-1.5 min-w-0">
							<span className="text-muted-foreground whitespace-nowrap">Cache:</span>
							<span className="flex items-center gap-1 min-w-0">
								<PlusCircle className="w-3 h-3 text-muted-foreground shrink-0" />
								<span className="truncate">{cacheWrites?.toLocaleString()}</span>
							</span>
							<span className="flex items-center gap-1 min-w-0">
								<DatabaseBackup className="w-3 h-3 text-muted-foreground shrink-0" />
								<span className="truncate">{cacheReads?.toLocaleString()}</span>
							</span>
						</span>
					)}

					<span className="flex items-center gap-1 min-w-0">
						<span className="text-muted-foreground whitespace-nowrap">Cost:</span>
						<span className="truncate">${totalCost?.toFixed(4) ?? 0}</span>
					</span>
				</div>
			</div>
		</div>
	)
}

export default TokenInfo
