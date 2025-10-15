import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, size = 30, strokeWidth = 4, showPercentage = true, ...props }, ref) => {
    const normalizedValue = Math.min(100, Math.max(0, value || 0))
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (normalizedValue / 100) * circumference

    return (
      <div
        ref={ref}
        className={cn("circular-progress-container", className)}
        style={{ width: size, height: size }}
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
