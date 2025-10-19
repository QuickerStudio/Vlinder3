import React from "react"
import { Button } from "@/components/ui/button"
import { useExtensionState } from "../../context/extension-state-context"
import { vscode } from "@/utils/vscode"
import { formatPrice } from "./utils"
import { getVlinderAddCreditsUrl, getVlinderOfferUrl, getVlinderSignInUrl } from "extension/shared/vlinder"
import { GiftIcon } from "lucide-react"

const UserInfoSection: React.FC = () => {
	const extensionState = useExtensionState()
	const [isClicked, setIsClicked] = React.useState(false)

	if (extensionState.user === undefined) {
		return (
			<div className="flex flex-col gap-2 self-center">
				<Button
					className="signin-button mt-[5px] -ml-[20px]"
					onClick={() => {
						setIsClicked(true)
						vscode.postTrackingEvent("AuthStart")
					}}
					asChild>
					<a href={getVlinderSignInUrl(extensionState.uriScheme, extensionState.extensionName)}>
						Sign in to Vlinder
					</a>
				</Button>
				{isClicked && (
					<Button
						className="btn-shine"
						onClick={() => {
							vscode.postMessage({ type: "setApiKeyDialog" })
						}}
						variant={"link"}>
						Have Api Key click here
					</Button>
				)}
			</div>
		)
	}

	return (
		<>
			<div className="flex max-[280px]:items-start max-[280px]:flex-col max-[280px]:space-y-2 flex-row justify-between items-center">
				<div>
					<p className="text-xs font-medium">Signed in as</p>
					<p className="text-sm font-bold">{extensionState.user?.email}</p>
					<Button
						variant="link"
						size="sm"
						className="text-sm !text-muted-foreground"
						onClick={() => vscode.postMessage({ type: "didClickVlinderSignOut" })}>
						sign out
					</Button>
				</div>
				<div className="max-[280px]:mt-2">
					<p className="text-xs font-medium">Vlinder Credits remaining</p>
					<p className="text-lg font-bold">{formatPrice(extensionState.user?.credits || 0)}</p>
				</div>
			</div>
			<div className="flex gap-2 flex-wrap">
				<Button
					onClick={() => {
						vscode.postTrackingEvent("ExtensionCreditAddOpen")
						vscode.postTrackingEvent("ExtensionCreditAddSelect", "purchase")
					}}
					asChild>
					<a href={getVlinderAddCreditsUrl(extensionState.uriScheme)}>Add Credits</a>
				</Button>
				<Button
					onClick={() => {
						vscode.postTrackingEvent("OfferwallView")
						vscode.postTrackingEvent("ExtensionCreditAddSelect", "offerwall")
					}}
					variant={"outline"}
					asChild>
					<a href={getVlinderOfferUrl(extensionState.uriScheme)}>
						<GiftIcon className="size-4 mr-1" />
						$10 Free Credits
					</a>
				</Button>
			</div>
		</>
	)
}

export default UserInfoSection
