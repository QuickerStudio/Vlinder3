# Chat Tools UI Components

This directory contains React UI components for displaying agent tool execution in the chat interface.

## Overview

Each tool used by the AI agent has a corresponding UI component that displays its status, inputs, and outputs in a user-friendly way. These components follow a consistent design pattern for a cohesive user experience.

## Component Structure

### Core Components
- **ToolBlock** - Base wrapper component used by all tools
- **ToolRenderer** - Main router that renders the appropriate tool component

### Tool-Specific Components

#### Analysis & Search Tools
1. **pattern-search-tool.tsx** - Pattern Search Tool
   - Comprehensive code pattern analysis
   - Pattern distribution visualization
   - Usage context insights
   - Detailed matches with context

2. **grep-search-tool.tsx** - Grep Search Tool (Enhanced)
   - Enhanced ripgrep search results
   - File-grouped matches
   - Search statistics
   - Regex/literal mode indicators

3. **web-search-tool.tsx** - Web Search Tool
   - Web search results display
   - Source citations
   - Summarized content

4. **search-symbols.ts** (in chat-tools.tsx) - Symbol Search
   - Symbol definitions
   - Usage locations
   - Context display

#### File Operations
5. **file-operations-tool.tsx** - File Operations Suite
   Contains 6 sub-components:
   - **RenameToolBlock** - File/directory renaming
   - **RemoveToolBlock** - File/directory deletion
   - **ReplaceStringToolBlock** - Single string replacement
   - **MultiReplaceStringToolBlock** - Multiple replacements
   - **InsertEditToolBlock** - Line-based content insertion
   - **FastEditorToolBlock** - Quick file create/update/delete

6. **file-editor-tool.tsx** - Advanced File Editor
   - Code diffs
   - Multi-version support
   - Rollback functionality

#### Development Tools
7. **read-progress-tool.tsx** - Terminal Progress Monitor
   - Real-time terminal monitoring
   - Process state tracking
   - Smart activity summaries
   - Filtered output display

8. **think-tool.tsx** - Think Tool
   - AI reasoning display
   - Thought process visualization
   - Conclusion and next action

9. **agent-tools.tsx** - Agent Management
   - Spawn agent UI
   - Exit agent UI
   - Multi-agent coordination

#### Other Tools (in chat-tools.tsx)
10. ExecuteCommandBlock - Command execution
11. ListFilesBlock - Directory listing
12. ReadFileBlock - File reading
13. DevServerToolBlock - Dev server management
14. TimerToolBlock - Timer/countdown
15. AttemptCompletionBlock - Task completion
16. UrlScreenshotBlock - Screenshot capture
17. MoveToolBlock - File/directory moving
18. SubmitReviewBlock - Code review submission

## Design Patterns

### Consistent UI Structure
All components follow this pattern:
```tsx
<div className="border-l-4 p-3 bg-card rounded-sm">
  {/* Header */}
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center">
      <Icon className="w-5 h-5 mr-2" />
      <h3 className="text-sm font-semibold">Tool Name</h3>
    </div>
    {statusIcon}
  </div>

  {/* Content */}
  <div className="text-sm space-y-2">
    {/* Tool-specific content */}
  </div>
</div>
```

### Approval States
All tools support these states:
- `pending` - Waiting for user approval
- `loading` - Operation in progress
- `approved` - Successfully completed
- `rejected` - User declined
- `error` - Operation failed

### Color Scheme
- **Blue** (`border-info`) - Loading/active operations
- **Green** (`border-success`) - Successful operations
- **Red** (`border-destructive`) - Errors/dangerous operations
- **Gray** (`border-muted`) - Default/neutral state

### Common Features

#### Collapsible Sections
Use for hiding/showing detailed content:
```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm">
      <span>View Details</span>
      {isOpen ? <ChevronUp /> : <ChevronDown />}
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* Detailed content */}
  </CollapsibleContent>
</Collapsible>
```

#### Scroll Areas
Use for long content:
```tsx
<ScrollArea className="h-[200px] w-full rounded-md border">
  <div className="p-3">
    {/* Long content */}
  </div>
  <ScrollBar orientation="vertical" />
</ScrollArea>
```

#### Badges
Use for metadata and status:
```tsx
<Badge variant="secondary" className="text-xs">
  <Icon className="w-3 h-3 mr-1" />
  Status Text
</Badge>
```

## Component Props

### Common Props (via ToolAddons)
All tool components receive these props:
```typescript
interface ToolAddons {
  approvalState?: ToolStatus;
  ts: number;
  isSubMsg?: boolean;
  userFeedback?: string;
}
```

### Tool-Specific Props
Each component extends its tool type from `new-tools.ts`:
```typescript
interface PatternSearchToolProps extends PatternSearchTool, ToolAddons {
  // PatternSearchTool properties:
  searchPattern: string;
  files?: string[];
  caseSensitive?: boolean;
  // ... etc
}
```

## Adding New Tool Components

### Step 1: Define Type
Add tool type to `extension/src/shared/new-tools.ts`:
```typescript
export type MyNewTool = {
  tool: "my_new_tool"
  // ... tool properties
}

// Add to ChatTool union
export type ChatTool = (
  // ... existing tools
  | MyNewTool
) & { ts: number; approvalState?: ToolStatus; ... }
```

### Step 2: Create Component
Create new file in this directory:
```typescript
// my-new-tool.tsx
import React from 'react';
import type { MyNewTool } from 'extension/shared/new-tools';
import type { ToolStatus } from 'extension/shared/new-tools';

interface MyNewToolProps extends MyNewTool {
  approvalState?: ToolStatus;
  ts: number;
  userFeedback?: string;
  isSubMsg?: boolean;
}

export const MyNewToolBlock: React.FC<MyNewToolProps> = ({
  // destructure props
  approvalState,
  ts,
  ...rest
}) => {
  return (
    <div className={cn(
      'border-l-4 p-3 bg-card text-card-foreground rounded-sm',
      getVariant(approvalState)
    )}>
      {/* Component content */}
    </div>
  );
};
```

### Step 3: Register Component
Add to `chat-tools.tsx`:
```typescript
// Import
import { MyNewToolBlock } from './tools/my-new-tool';

// Add to imports from new-tools
import { MyNewTool } from 'extension/shared/new-tools';

// Add to ToolRenderer switch
case "my_new_tool":
  return <MyNewToolBlock {...tool} />
```

### Step 4: Test
1. Test all approval states (pending, loading, approved, error)
2. Test with/without optional properties
3. Test in light and dark themes
4. Check for TypeScript errors
5. Check for linting errors

## Best Practices

### Do's ✅
- Follow existing component patterns
- Use existing UI primitives (Button, Badge, ScrollArea, etc.)
- Support all approval states
- Make long content scrollable
- Use collapsibles for optional details
- Add proper TypeScript types
- Test in both themes
- Ensure keyboard accessibility
- Handle missing/invalid data gracefully

### Don'ts ❌
- Don't create inline styles
- Don't hardcode colors (use CSS variables)
- Don't ignore approval states
- Don't forget loading spinners
- Don't make components too large (split if needed)
- Don't mix tool logic with UI logic
- Don't use console.log in production
- Don't forget to handle errors

## Styling Guide

### CSS Classes
Use Tailwind utility classes:
```tsx
// Spacing
className="p-3 space-y-2"

// Typography
className="text-sm font-semibold"

// Colors (use semantic variables)
className="text-success"     // Green
className="text-destructive" // Red
className="text-info"        // Blue
className="text-muted-foreground" // Gray

// Borders
className="border-l-4 border-success"

// Background
className="bg-muted"         // Muted background
className="bg-secondary/20"  // Semi-transparent
```

### Icons
Use icons from `lucide-react`:
```tsx
import { FileText, Search, Terminal } from 'lucide-react';

<Icon className="w-5 h-5 mr-2 text-primary" />
```

### Responsive Design
```tsx
// Auto-wrap badges
className="flex gap-2 flex-wrap"

// Scrollable content
className="overflow-x-auto"

// Maximum widths
className="max-w-full"
```

## Performance Tips

1. **Lazy Rendering**: Use collapsibles to defer rendering expensive content
2. **Memoization**: Use `React.memo()` for expensive components
3. **Virtual Scrolling**: For very long lists (>100 items)
4. **Debouncing**: For real-time updates
5. **Code Splitting**: Keep tool components in separate files

## Accessibility

### Keyboard Navigation
- All interactive elements (buttons, collapsibles) are keyboard accessible
- Use proper button elements, not divs
- Ensure logical tab order

### Screen Readers
- Use semantic HTML (button, not div with onClick)
- Provide aria-labels for icon-only buttons
- Use proper heading hierarchy

### Visual
- Never rely on color alone (always use icon + color)
- Ensure sufficient contrast
- Support high contrast mode
- Clear focus indicators

## Testing Checklist

Before committing a new tool component:
- [ ] TypeScript compiles without errors
- [ ] No ESLint warnings
- [ ] Works in light theme
- [ ] Works in dark theme
- [ ] All approval states render correctly
- [ ] Handles missing data gracefully
- [ ] Scrollable content has scroll indicators
- [ ] Collapsibles work properly
- [ ] Keyboard navigation works
- [ ] Responsive on different screen sizes
- [ ] No console errors or warnings

## Common Issues & Solutions

### Issue: Component not rendering
**Solution**: Check ToolRenderer registration in chat-tools.tsx

### Issue: Types not matching
**Solution**: Ensure tool type in new-tools.ts matches component props

### Issue: Styles not applying
**Solution**: Check Tailwind class names, ensure no typos

### Issue: Content overflowing
**Solution**: Add ScrollArea or overflow-x-auto

### Issue: Dark mode looks wrong
**Solution**: Use CSS variables, not hardcoded colors

### Issue: Performance lag
**Solution**: Use collapsibles, memoization, or virtual scrolling

## Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Lucide Icons](https://lucide.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)

## Maintainers

When modifying tool components:
1. Update types in new-tools.ts if schema changes
2. Update this README if adding new patterns
3. Maintain backward compatibility
4. Test thoroughly before committing
5. Update visual guide if UI changes significantly

---

For visual examples of each component, see `TOOL_UI_VISUAL_GUIDE.md` in the project root.
For implementation details, see `TOOL_UI_IMPLEMENTATION_SUMMARY.md`.

