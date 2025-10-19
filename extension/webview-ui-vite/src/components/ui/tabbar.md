# Tabbar Component

An animated tabbar component with an interactive file-add button featuring 3D flip animations.

## Features

- 5 icon buttons (Dashboard, Camera, File Add, Files, User)
- Interactive file-add button with animated 3D card flip
- Three file type options: Word, PowerPoint, Excel
- Smooth animations and hover effects
- TypeScript support
- Customizable callback for file selection

## Installation

The component is already integrated. No additional installation needed.

## Usage

### Basic Usage

```tsx
import { Tabbar, TabbarSvgSymbols } from "@/components/ui/tabbar"

function App() {
  return (
    <div>
      {/* Include SVG symbols once in your app root */}
      <TabbarSvgSymbols />
      
      {/* Use the Tabbar */}
      <Tabbar />
    </div>
  )
}
```

### With File Selection Callback

```tsx
import { Tabbar, TabbarSvgSymbols } from "@/components/ui/tabbar"

function MyComponent() {
  const handleFileSelect = (fileType: 'word' | 'powerpoint' | 'excel') => {
    console.log('Selected:', fileType)
    // Add your logic here
    // - Open file dialog
    // - Create new document
    // - etc.
  }

  return (
    <>
      <TabbarSvgSymbols />
      <Tabbar onFileTypeSelect={handleFileSelect} />
    </>
  )
}
```

### With Custom Styling

```tsx
import { Tabbar, TabbarSvgSymbols } from "@/components/ui/tabbar"

function MyComponent() {
  return (
    <>
      <TabbarSvgSymbols />
      <Tabbar 
        className="my-custom-class"
        onFileTypeSelect={(type) => console.log(type)}
      />
    </>
  )
}
```

## Component Structure

The tabbar consists of 5 buttons:

1. **Dashboard Icon** - Left navigation button
2. **Camera Icon** - Media/photo functionality
3. **File Add Button** (Center) - Opens file type selector
   - **Word** (W) - Blue themed
   - **PowerPoint** (P) - Orange themed
   - **Excel** (E) - Green themed
4. **Files Icon** - File management
5. **User Icon** - User profile/settings

## Props

### Tabbar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onFileTypeSelect` | `(fileType: 'word' \| 'powerpoint' \| 'excel') => void` | `undefined` | Callback fired when a file type is selected |
| `className` | `string` | `undefined` | Additional CSS classes |
| ...props | `HTMLAttributes<HTMLUListElement>` | - | Standard ul element props |

## Styling

All styles are defined in `index.css`. The component uses:

- CSS custom properties for dynamic animations
- 3D transforms for flip effects
- Smooth transitions
- Hover states for better UX

### Color Scheme

- **Primary**: `#5628EE` (Purple)
- **Secondary**: `#8C6FF0` (Light Purple)
- **Word**: `#46A7FE` (Blue)
- **PowerPoint**: `#F57F65` (Orange)
- **Excel**: `#2ACF62` (Green)

## Animation Details

### File Add Button

- **Hover**: 3D rotation effect (-30deg on X-axis)
- **Click**: Scale animation (0.84x)
- **Open**: Rotates plus icon by 45deg
- **File Cards**: 3D flip animation with smooth transitions

### File Type Cards

When the file-add button is clicked:
1. Cards flip from face-down to face-up
2. Cards fan out in three directions:
   - Word: Upper left (-36px X, -32px Y)
   - PowerPoint: Top center (0px X, -44px Y)
   - Excel: Upper right (+36px X, -32px Y)
3. Hover on cards moves them slightly upward

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (webkit prefixes included)

## Accessibility

The component includes:
- Semantic HTML structure
- Keyboard navigation support (inherited from HTML)
- Proper ARIA attributes can be added via props
- Click handlers with proper event propagation

## Examples

Check out `tabbar-demo.tsx` for a complete working example.

## Customization

### Changing Colors

Edit the CSS custom properties in `index.css`:

```css
.fileAdd {
  background: #5628EE; /* Change primary color */
}

.fileAdd div {
  background: #8C6FF0; /* Change secondary color */
}
```

### Changing Icon Size

```css
.tabbar > li > svg {
  width: 14px; /* Adjust size */
  height: 14px;
}
```

### Animation Timing

```css
.fileAdd ul li {
  transition: transform 0.45s ease; /* Adjust duration */
}
```

## Tips

1. **SVG Symbols**: Make sure to include `<TabbarSvgSymbols />` once in your app root
2. **Click Outside**: Consider adding click-outside detection to close the file selector
3. **Mobile**: The component is responsive but may need adjustments for small screens
4. **Icons**: All SVG icons are embedded; no external dependencies needed

## Troubleshooting

### Icons not showing
- Ensure `<TabbarSvgSymbols />` is included in your app
- Check if CSS is properly imported

### Animations not working
- Verify browser supports CSS transforms
- Check for CSS conflicts with `transform` properties

### File selection not triggering
- Ensure `onFileTypeSelect` callback is properly bound
- Check console for errors

## License

This component is part of the Vlinder project.

