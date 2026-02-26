export interface ParsedCommand {
	id: string
	command: string
	platform: string
	type: "block" | "risk"
}

export interface ParsedPolicy {
	blockCommands: ParsedCommand[]
	riskCommands: ParsedCommand[]
}

export function parsePolicy(policyJson: string): ParsedPolicy {
	const result: ParsedPolicy = {
		blockCommands: [],
		riskCommands: [],
	}

	if (!policyJson?.trim()) {
		return result
	}

	try {
		const policy = JSON.parse(policyJson)

		// Parse common block commands
		if (policy.common?.block) {
			policy.common.block.forEach((command: string, index: number) => {
				result.blockCommands.push({
					id: `common-block-${index}`,
					command,
					platform: "common",
					type: "block",
				})
			})
		}

		// Parse common risk keywords
		if (policy.common?.riskKeywords) {
			policy.common.riskKeywords.forEach((command: string, index: number) => {
				result.riskCommands.push({
					id: `common-risk-${index}`,
					command,
					platform: "common",
					type: "risk",
				})
			})
		}

		// Parse platform-specific commands
		if (policy.platforms) {
			Object.entries(policy.platforms).forEach(([platform, platformPolicy]: [string, any]) => {
				if (platformPolicy.block) {
					platformPolicy.block.forEach((command: string, index: number) => {
						result.blockCommands.push({
							id: `${platform}-block-${index}`,
							command,
							platform,
							type: "block",
						})
					})
				}

				if (platformPolicy.riskKeywords) {
					platformPolicy.riskKeywords.forEach((command: string, index: number) => {
						result.riskCommands.push({
							id: `${platform}-risk-${index}`,
							command,
							platform,
							type: "risk",
						})
					})
				}
			})
		}
	} catch (error) {
		// Invalid JSON, return empty lists
	}

	return result
}

