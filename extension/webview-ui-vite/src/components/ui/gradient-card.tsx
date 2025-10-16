import * as React from "react"
import { cn } from "@/lib/utils"

export interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
	heading?: string
	poweredBy?: string
	brandName?: string
	children?: React.ReactNode
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
	({ className, heading, poweredBy, brandName, children, ...props }, ref) => {
		const innerRef = React.useRef<HTMLDivElement>(null)
		const cardRef = (ref as React.RefObject<HTMLDivElement>) || innerRef

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
	}, [cardRef])

		return (
			<div ref={cardRef} className={cn("gradient-card", className)} {...props}>
				{children ? (
					children
				) : (
					<>
						{heading && <p className="gradient-card-heading">{heading}</p>}
						{poweredBy && <p>{poweredBy}</p>}
						{brandName && <p>{brandName}</p>}
					</>
				)}
			</div>
		)
	}
)

GradientCard.displayName = "GradientCard"

export { GradientCard }

