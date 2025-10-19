import * as React from "react"
import { Tabbar, TabbarSvgSymbols } from "./tabbar"

/**
 * Example usage of the Tabbar component
 * 
 * This component demonstrates how to use the Tabbar with file-add functionality.
 * Make sure to include the TabbarSvgSymbols component somewhere in your app root
 * so that the SVG symbols are available for use.
 */
export function TabbarDemo() {
	const handleFileTypeSelect = (fileType: 'word' | 'powerpoint' | 'excel') => {
		console.log('Selected file type:', fileType)
		// Add your custom logic here
		// For example: open a file dialog, create a new document, etc.
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-[#171C28]">
			{/* Include SVG symbols once in your app */}
			<TabbarSvgSymbols />
			
			{/* Tabbar component */}
			<Tabbar onFileTypeSelect={handleFileTypeSelect} />
		</div>
	)
}

/**
 * Usage instructions:
 * 
 * 1. Import the component:
 *    import { Tabbar, TabbarSvgSymbols } from "@/components/ui/tabbar"
 * 
 * 2. Add TabbarSvgSymbols to your app root (e.g., App.tsx or layout):
 *    <TabbarSvgSymbols />
 * 
 * 3. Use the Tabbar component with optional callback:
 *    <Tabbar onFileTypeSelect={(type) => console.log(type)} />
 * 
 * 4. The component features:
 *    - Dashboard icon button
 *    - Camera icon button
 *    - File add button (center) with 3D flip animation
 *      - Word document option (W)
 *      - PowerPoint option (P)
 *      - Excel option (E)
 *    - Files icon button
 *    - User icon button
 * 
 * 5. Styling:
 *    - All styles are included in index.css
 *    - Uses CSS custom properties for animations
 *    - Fully responsive and interactive
 */

