import * as vscode from "vscode"
import { fetchVlinderUser as fetchVlinderUserAPI } from "../../api/providers/vlinder"
import { ExtensionProvider } from "../extension-provider"
import { ApiConfiguration } from "../../api"
import { getCurrentModelInfo, getProvider } from "../../router/routes/provider-router"

export class ApiManager {
	private static instance: ApiManager | null = null
	private context: ExtensionProvider

	private constructor(context: ExtensionProvider) {
		this.context = context
	}

	public static getInstance(context?: ExtensionProvider): ApiManager {
		if (!ApiManager.instance) {
			if (!context) {
				throw new Error("ExtensionProvider context must be provided when creating the ApiManager instance")
			}
			ApiManager.instance = new ApiManager(context)
		}
		return ApiManager.instance
	}

	async getCurrentModelInfo() {
		return (await getCurrentModelInfo()).model
	}

	async saveVlinderApiKey(apiKey: string) {
		await this.context.getSecretStateManager().updateSecretState("vlinderApiKey", apiKey)
		console.log("Saved Vlinder API key")
		const user = await this.fetchVlinderUser(apiKey)
		await this.context.getGlobalStateManager().updateGlobalState("user", user)
		await this.context.getWebviewManager().postBaseStateToWebview()
		console.log("Posted state to webview after saving Vlinder API key")
		await this.context.getWebviewManager().postMessageToWebview({ type: "action", action: "vlinderAuthenticated" })
		console.log("Posted message to action: vlinderAuthenticated")
	}

	async signOutVlinder() {
		await this.context.getSecretStateManager().deleteSecretState("vlinderApiKey")
		await this.context.getGlobalStateManager().updateGlobalState("user", undefined)
	}

	async fetchVlinderCredits() {
		const vlinderApiKey = await this.context.getSecretStateManager().getSecretState("vlinderApiKey")
		if (vlinderApiKey) {
			const user = await this.fetchVlinderUser(vlinderApiKey)
			if (user) {
				await this.context.getGlobalStateManager().updateGlobalState("user", user)
			}
		}
	}

	private async fetchVlinderUser(apiKey: string) {
		return await fetchVlinderUserAPI({ apiKey })
	}
}
