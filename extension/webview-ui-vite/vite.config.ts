// extension/webview-ui-vite/vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		alias: [
			{ find: "@", replacement: path.resolve(__dirname, "src") },
			{ find: /^extension\/(api|db|integrations|parse-source-code|providers|router|shared|utils)(.*)$/, replacement: path.resolve(__dirname, "../src/AgentRuntime/$1$2") },
			{ find: /^extension\/(.*)$/, replacement: path.resolve(__dirname, "../src/$1") },
		],
	},
	resolve: {
		alias: [
			{ find: "@", replacement: path.resolve(__dirname, "src") },
			{ find: /^extension\/(api|db|integrations|parse-source-code|providers|router|shared|utils)(.*)$/, replacement: path.resolve(__dirname, "../src/AgentRuntime/$1$2") },
			{ find: /^extension\/(.*)$/, replacement: path.resolve(__dirname, "../src/$1") },
		],
	},
	build: {
		outDir: "build",
		sourcemap: false,
		rollupOptions: {
			input: {
				index: path.resolve(__dirname, "src/main.tsx"),
				"prompt-editor": path.resolve(__dirname, "src/prompt-editor-app.tsx"),
			},
			external: ["vscode-webview"],
			output: {
				entryFileNames: "assets/[name].js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: "assets/[name].[ext]",
				manualChunks: undefined,
			},
		},
	},
})
