import { getVlinderSignInUrl } from "extension/shared/vlinder"
import { vscode } from "./vscode"

export const loginVlinder = (props: { uriScheme: string; extensionName: string; isPostTrial?: boolean }) => {
	vscode.postTrackingEvent("AuthStart")

	let url = getVlinderSignInUrl(props.uriScheme, props.extensionName)
	if (props.isPostTrial) {
		url += "&postTrial=1"
	}
	vscode.postMessage({
		type: "openExternalLink",
		url,
	})
}
