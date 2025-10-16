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
		return (
			<div ref={ref} className={cn("gradient-card", className)} {...props}>
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

