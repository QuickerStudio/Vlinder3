import * as React from "react"
import { cn } from "@/lib/utils"

export interface MenuToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
	checked?: boolean
	onCheckedChange?: (checked: boolean) => void
	barClassName?: string
}

const MenuToggle = React.forwardRef<HTMLInputElement, MenuToggleProps>(
	({ className, checked, onCheckedChange, barClassName, ...props }, ref) => {
		const [isChecked, setIsChecked] = React.useState(checked ?? false)

		React.useEffect(() => {
			if (checked !== undefined) {
				setIsChecked(checked)
			}
		}, [checked])

		const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
			const newChecked = event.target.checked
			setIsChecked(newChecked)
			onCheckedChange?.(newChecked)
			props.onChange?.(event)
		}

		const id = props.id || "menu-toggle-checkbox"

		return (
			<>
				<input
					type="checkbox"
					id={id}
					className="menu-toggle-checkbox"
					ref={ref}
					checked={isChecked}
					onChange={handleChange}
					{...props}
				/>
				<label htmlFor={id} className={cn("menu-toggle", className)}>
					<div className={cn("menu-toggle-bar", barClassName)} id="bar1"></div>
					<div className={cn("menu-toggle-bar", barClassName)} id="bar2"></div>
					<div className={cn("menu-toggle-bar", barClassName)} id="bar3"></div>
				</label>
			</>
		)
	}
)

MenuToggle.displayName = "MenuToggle"

export { MenuToggle }

