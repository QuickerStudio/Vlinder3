// extension/webview-ui-vite/vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: [
			{ find: "@", replacement: path.resolve(__dirname, "src") },
			// Moved directories now live under AgentRuntime/
			{ find: /^extension\/(api|db|integrations|parse-source-code|providers|router|shared|utils)(.*)$/, replacement: path.resolve(__dirname, "../src/AgentRuntime/$1$2") },
			// Fallback: everything else under extension/ maps to ../src/
			{ find: /^extension\/(.*)$/, replacement: path.resolve(__dirname, "../src/$1") },
		],
	},
	build: {
		outDir: "build",
		sourcemap: false,
		rollupOptions: {
			// Two distinct entries => two distinct JS+CSS outputs
			input: {
				// => build/index.js + build/index.css (if main.tsx imports CSS)
				index: path.resolve(__dirname, "src/main.tsx"),
				// => build/prompt-editor.js + build/prompt-editor.css (if prompt-editor.tsx imports CSS)
				"prompt-editor": path.resolve(__dirname, "src/prompt-editor-app.tsx"),
			},
			external: ["vscode-webview"], // If you need to exclude that
			output: {
				entryFileNames: "assets/[name].js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: "assets/[name].[ext]",
				// If you truly want *no* code-splitting, uncomment:
				manualChunks: undefined,
			},
		},
	},
})
