// schema/terminal.ts
import { z } from "zod"

/**
 * @tool terminal
 * @description Execute a CLI command on the system. Use this when you need to perform system operations or run specific commands to accomplish any step in the user's task. You must tailor your command to the user's system and provide a clear explanation of what the command does. Prefer to execute complex CLI commands over creating executable scripts, as they are more flexible and easier to run. Commands will be executed in the current working directory.
 * @schema
 * {
 *   command: string; // The CLI command to execute.
 * }
 * @example
 * ```xml
 * <tool name="terminal">
 *   <command>ls -la</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="terminal">
 *   <command>mkdir new_folder && cd new_folder</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="terminal">
 *   <command>echo 'Hello World' > hello.txt</command>
 * </tool>
 * ```
 */
const schema = z.object({
	command: z
		.string()
		.describe(
			"The CLI command to execute. This should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions."
		),
})

const examples = [
	`<tool name="terminal">
  <command>ls -la</command>
</tool>`,

	`<tool name="terminal">
  <command>mkdir new_folder && cd new_folder</command>
</tool>`,

	`<tool name="terminal">
  <command>echo 'Hello World' > hello.txt</command>
</tool>`,
]

export const terminalTool = {
	schema: {
		name: "terminal",
		schema,
	},
	examples,
}

export type TerminalToolParams = {
	name: "terminal"
	input: z.infer<typeof schema>
}
