"use client"

/**
 * 🎨 Code is art, geometry is poetry - 3.5 hours of perfection crafted together!
 * The beauty of rotate(-90deg) lies in understanding that coordinates dance with transformation.
 * - Claude 4.5
 */

import React, { memo } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

import { ModelSelector } from "./model-picker"
import { ThinkingConfigComponent } from "./thinking-config"
import { rpcClient } from "@/lib/rpc-client"
import ProviderManager from "./provider-manager"
import { useAtom, useAtomValue } from "jotai"
import { preferencesViewAtom } from "./atoms"
import { MenuToggle } from "@/components/ui/menu-toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * PreferencesTab
 * A "Select with Autocomplete" using Popover + Command, now with contextWindow + maxTokens.
 */
const PreferencesTabNew: React.FC = () => {
	// const { model: selectedModelId, handleModelChange } = useSettingsState()
	const forcedView = useAtomValue(preferencesViewAtom)
	
	const { data: { modelId: selectedModelId, providerId } = { modelId: null, providerId: null }, refetch } =
		rpcClient.currentModel.useQuery(
			{},
			{
				refetchInterval: 5000,
				refetchIntervalInBackground: true,
			}
		)
	const { mutate: handleModelChange } = rpcClient.selectModel.useMutation({
		onSuccess: () => {
			refetch()
		},
	})
	const [viewMode, setViewMode] = useAtom(preferencesViewAtom)
	const { data, status } = rpcClient.listModels.useQuery(
		{},
		{
			refetchInterval: 5000,
			refetchOnWindowFocus: true,
		}
	)

	if (!data) return null
	return (
		<>
			<style>
				{`
					@keyframes gradient-border-transform {
						from {
							transform: translateX(-3px);
						}
						to {
							transform: translateX(-5px) rotate(-90deg) scaleX(1.452) scaleY(0.661);
						}
					}
					.gradient-border-layer {
						transition: all 600ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
						transform: translateX(-3px);
					}
					.gradient-wrapper-container:hover .gradient-border-layer {
						transform: translateX(-5px) rotate(-90deg) scaleX(1.452) scaleY(0.661);
					}
					.glow-layer {
						transition: all 600ms;
					}
					.gradient-wrapper-container:hover .glow-layer {
						filter: blur(30px) !important;
					}
				`}
			</style>
			<div className="w-full flex justify-center items-center">
				{/* Outer Gradient Wrapper - 防止渐变被裁剪 */}
				<div 
					className="relative cursor-pointer gradient-wrapper-container mx-auto"
					style={{
						position: 'relative',
						width: '400px', // 4:6 宽度
						height: '600px', // 4:6 高度
						overflow: 'visible'
					}}
				>
				{/* Gradient border layer - 保持旋转前样式，调整旋转后的scale和位置 */}
				<div 
					className="absolute pointer-events-none gradient-border-layer"
					style={{
						content: '',
						position: 'absolute',
						inset: 0,
						left: '-5px',
						margin: 'auto',
						width: '420px',
						height: '620px',
						borderRadius: '10px',
						background: 'linear-gradient(-45deg, #e81cff 0%, #40c9ff 100%)',
						zIndex: 0,
						pointerEvents: 'none'
					}}
				/>
					
				{/* Blurred glow layer */}
				<div 
					className="absolute glow-layer"
					style={{
						content: '',
						zIndex: -1,
						position: 'absolute',
						inset: 0,
						background: 'linear-gradient(-45deg, #fc00ff 0%, #00dbde 100%)',
						transform: 'translate3d(0, 0, 0) scale(0.95)',
						filter: 'blur(20px)'
					}}
				/>

				{/* Black card surface to hold content */}
				<div
					className="relative"
					style={{
						backgroundColor: '#000',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'flex-end',
						padding: '12px',
						gap: '12px',
						borderRadius: '8px',
						cursor: 'pointer',
						width: '100%',
						height: '100%',
						overflow: 'hidden'
					}}
				>
					{/* Main Architecture Model - 保持原有属性，内容可滚动，隐藏滚动条 */}
					<div 
						className="relative h-full overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
						style={{ zIndex: 1 }}
					>
						<Card className="max-w-md w-full mx-auto bg-transparent border-0 shadow-none">
							<CardHeader>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1" />
									<TooltipProvider>
										<Tooltip delayDuration={200}>
											<TooltipTrigger asChild>
												<div>
													<MenuToggle
														checked={viewMode === "provider-manager"}
														onCheckedChange={(checked) => setViewMode(checked ? "provider-manager" : "select-model")}
														className="scale-75"
													/>
												</div>
											</TooltipTrigger>
											<TooltipContent side="left">
												<p>
													{viewMode === "select-model"
														? "Want to use a custom provider?"
														: "Want to select models from the list?"}
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</CardHeader>

							<CardContent className="space-y-4">
								{/* Popover-based select with autocomplete */}
								{viewMode === "provider-manager" ? (
									<ProviderManager />
								) : (
									<>
										<ModelSelector
											models={data.models ?? []}
											modelId={selectedModelId ?? null}
											providerId={providerId ?? null}
											onChangeModel={handleModelChange}
											showDetails={true}
										/>
										<ThinkingConfigComponent modelId={selectedModelId ?? undefined} />
									</>
								)}
							</CardContent>

							<CardFooter className="text-xs font-semibold" style={{ color: '#e81cff' }}>
								<span>Agent-specific models can be configured in the Agents tab.</span>
							</CardFooter>
						</Card>
					</div>
				</div>
			</div>
			</div>
		</>
	)
}

export default memo(PreferencesTabNew)
