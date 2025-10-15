import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Progress - Circular Progress Component (Generic UI Component)
 * 
 * 📦 Pure UI component - no business logic
 * 🔄 Reusable for any circular progress scenarios
 * 🎨 Does not include business-specific logic
 * 
 * @description
 * A generic circular progress ring component that can be used anywhere in the application.
 * It only handles visual presentation of progress (0-100%) without any domain-specific logic.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Progress value={75} />
 * 
 * // Custom size and styling
 * <Progress value={50} size={60} strokeWidth={6} />
 * 
 * // Without percentage text
 * <Progress value={30} showPercentage={false} />
 * ```
 */
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, size = 30, strokeWidth = 4, showPercentage = true, style, ...props }, ref) => {
    const normalizedValue = Math.min(100, Math.max(0, value || 0))
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (normalizedValue / 100) * circumference

    return (
      <div
        ref={ref}
        className={cn("circular-progress-container", className)}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        <svg
          className="circular-progress-svg"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            className="circular-progress-bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            className="circular-progress-indicator"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.3s ease'
            }}
          />
        </svg>
        {/* Percentage text */}
        {showPercentage && (
          <div className="circular-progress-text">
            <span className="circular-progress-value">{Math.round(normalizedValue)}%</span>
          </div>
        )}
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
