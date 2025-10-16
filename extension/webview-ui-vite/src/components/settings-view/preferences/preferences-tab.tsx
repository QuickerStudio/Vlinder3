"use client"

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
	const cardRef = React.useRef<HTMLDivElement>(null)
	
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

	React.useEffect(() => {
		const calculateGradientScale = () => {
			const card = cardRef.current
			if (!card) return

			// 🎨 可调参数：旋转后渐变背景超出卡片的尺寸
			const targetExtraWidth = 10   // 宽度超出值（px）
			const targetExtraHeight = 10  // 高度超出值（px）
			
			const cardHeight = card.offsetHeight
			const cardWidth = card.offsetWidth
			
			// 渐变背景伪元素使用 inset: -2px，所以实际尺寸为：
			const gradientWidth = cardWidth + 4  // 左右各 2px
			const gradientHeight = cardHeight + 4  // 上下各 2px
			
			// 约束条件（不等式）：旋转 -90deg 后
			// 新宽度 = gradientHeight × scaleX >= cardWidth + targetExtraWidth
			// 新高度 = gradientWidth × scaleY >= cardHeight + targetExtraHeight
			
			// 求解不等式，添加小余量 0.02 防止浮点数精度问题
			const scaleX = (cardWidth + targetExtraWidth) / gradientHeight + 0.02
			const scaleY = (cardHeight + targetExtraHeight) / gradientWidth + 0.02
			
			card.style.setProperty('--gradient-scale-x', scaleX.toFixed(3))
			card.style.setProperty('--gradient-scale-y', scaleY.toFixed(3))
		}

		// 使用 setTimeout 确保在 DOM 完全渲染后计算
		const timeoutId = setTimeout(calculateGradientScale, 0)
		
		// 监听窗口大小变化
		const resizeObserver = new ResizeObserver(calculateGradientScale)
		if (cardRef.current) {
			resizeObserver.observe(cardRef.current)
		}

		return () => {
			clearTimeout(timeoutId)
			resizeObserver.disconnect()
		}
	}, [viewMode, data])

	if (!data) return null
	return (
		<Card ref={cardRef} className="max-w-md w-full mx-auto gradient-border-card">
			<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<CardTitle className="text-base sm:text-lg">Main Architecture Model</CardTitle>
						<CardDescription className="text-sm">Choose your default code-completion model</CardDescription>
					</div>
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

			<CardFooter className="text-xs text-muted-foreground">
				<span>Agent-specific models can be configured in the Agents tab.</span>
			</CardFooter>
		</Card>
	)
}

export default memo(PreferencesTabNew)
