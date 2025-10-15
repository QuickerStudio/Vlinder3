# Tool UI Visual Guide

## Quick Reference for All Tool UIs

### 🔍 Pattern Search Tool
```
┌─────────────────────────────────────────────────────┐
│ 🔎 Pattern Search                               ✓   │
├─────────────────────────────────────────────────────┤
│ Pattern: "class\s+\w+"                              │
│ [Regex] [*.ts] [Max: 100]                          │
│                                                      │
│ 📊 127 matches  📄 23 files  📈 5.5 avg/file       │
│                                                      │
│ [View Pattern Analysis ▼]                          │
│ [View Detailed Matches ▼]                          │
└─────────────────────────────────────────────────────┘
```

**Expanded Analysis View:**
```
┌─────────────────────────────────────────────────────┐
│ PATTERN DISTRIBUTION BY FILE TYPE:                  │
│ .ts        [################      ] 45 matches (35%)│
│ .tsx       [############          ] 32 matches (25%)│
│ .js        [########              ] 20 matches (16%)│
│                                                      │
│ USAGE CONTEXT PATTERNS:                            │
│ - Class/Interface definition: 42 occurrences       │
│ - Export statement: 28 occurrences                 │
│ - Import statement: 15 occurrences                 │
└─────────────────────────────────────────────────────┘
```

---

### 📟 Read Progress Tool
```
┌─────────────────────────────────────────────────────┐
│ 📟 Read Progress                                    │
├─────────────────────────────────────────────────────┤
│ 🖥️ Terminal-1  ID: 42  PID: 1234                  │
│ [Running (Active)] [75%]                           │
│                                                      │
│ $ npm run dev                                       │
│                                                      │
│ [Activity Summary ▼]                               │
│   Activity: Actively producing output              │
│   Findings: Detected 0 error(s), 0 warning(s)     │
│   State: running_active                            │
│                                                      │
│ [View Terminal Output ▼]                           │
└─────────────────────────────────────────────────────┘
```

**Terminal States:**
- 🟢 **Running (Active)** - Process actively outputting
- 🟡 **Running (Idle)** - Process running but no output
- ✅ **Completed** - Process finished successfully
- 🔴 **Error** - Process encountered errors

---

### 🔎 Grep Search Tool (Enhanced)
```
┌─────────────────────────────────────────────────────┐
│ 🔍 Grep Search                                  ✓   │
├─────────────────────────────────────────────────────┤
│ Query: "TodoItem"                                   │
│ [Regex] [*.tsx] [Max: 50]                          │
│                                                      │
│ 📊 42 matches  📄 8 files                          │
│                                                      │
│ [View Search Results (8 files) ▼]                 │
└─────────────────────────────────────────────────────┘
```

**Expanded Results View:**
```
┌─────────────────────────────────────────────────────┐
│ 📄 src/components/TodoList.tsx (5 matches)         │
│   Line 12:                                          │
│     const [todos, setTodos] = useState<TodoItem[]>  │
│                                                      │
│   Line 24:                                          │
│     const addTodo = (item: TodoItem) => {          │
│ ─────────────────────────────────────────────────   │
│ 📄 src/types/Todo.ts (3 matches)                   │
│   Line 5:                                           │
│     export interface TodoItem {                     │
└─────────────────────────────────────────────────────┘
```

---

### 📝 File Operations Tools

#### Rename Tool
```
┌─────────────────────────────────────────────────────┐
│ 📝 Rename File                                  ✓   │
├─────────────────────────────────────────────────────┤
│ From: old-component.tsx                             │
│              ↓                                       │
│ To:   NewComponent.tsx                              │
│                                                      │
│ [Overwrite enabled]                                │
│                                                      │
│ ✅ File renamed successfully to NewComponent.tsx   │
└─────────────────────────────────────────────────────┘
```

#### Remove Tool
```
┌─────────────────────────────────────────────────────┐
│ 🗑️  Remove Directory                            ✓   │
├─────────────────────────────────────────────────────┤
│ ⚠️  Removing: src/old-components/                  │
│                                                      │
│ [🔴 Recursive deletion]                            │
│                                                      │
│ ✅ Directory removed successfully                  │
└─────────────────────────────────────────────────────┘
```

#### Replace String Tool
```
┌─────────────────────────────────────────────────────┐
│ ✏️  Replace String                              ✓   │
├─────────────────────────────────────────────────────┤
│ File: src/config.ts                                 │
│                                                      │
│ [View Replacement Details ▼]                       │
└─────────────────────────────────────────────────────┘
```

**Expanded Details:**
```
┌─────────────────────────────────────────────────────┐
│ - Old:                                              │
│   const API_URL = 'http://localhost:3000'          │
│              ↓                                       │
│ + New:                                              │
│   const API_URL = 'https://api.production.com'     │
└─────────────────────────────────────────────────────┘
```

#### Multi-Replace String Tool
```
┌─────────────────────────────────────────────────────┐
│ 🔄 Multi-Replace String                         ✓   │
├─────────────────────────────────────────────────────┤
│ File: src/constants.ts                              │
│ [3 replacements]                                    │
│                                                      │
│ [View All Replacements ▼]                          │
│                                                      │
│ ✅ Successfully performed 3 replacements           │
└─────────────────────────────────────────────────────┘
```

**Expanded Replacements List:**
```
┌─────────────────────────────────────────────────────┐
│ Replacement #1                                      │
│ - Old: API_VERSION = 'v1'                          │
│ + New: API_VERSION = 'v2'                          │
│ ─────────────────────────────────────────────────   │
│ Replacement #2                                      │
│ - Old: MAX_RETRIES = 3                             │
│ + New: MAX_RETRIES = 5                             │
│ ─────────────────────────────────────────────────   │
│ Replacement #3                                      │
│ - Old: TIMEOUT = 5000                              │
│ + New: TIMEOUT = 10000                             │
└─────────────────────────────────────────────────────┘
```

#### Insert Edit Tool
```
┌─────────────────────────────────────────────────────┐
│ 📄 Insert Edit                                  ✓   │
├─────────────────────────────────────────────────────┤
│ File: src/utils/helpers.ts                          │
│ Insert at line: 42                                  │
│                                                      │
│ [View Content to Insert ▼]                         │
│                                                      │
│ ✅ Content inserted successfully at line 42        │
└─────────────────────────────────────────────────────┘
```

**Expanded Content View:**
```
┌─────────────────────────────────────────────────────┐
│ export function formatDate(date: Date): string {   │
│   return date.toISOString().split('T')[0];         │
│ }                                                    │
│                                                      │
│ export function capitalize(str: string): string {  │
│   return str.charAt(0).toUpperCase() + str.slice(1)│
│ }                                                    │
└─────────────────────────────────────────────────────┘
```

#### Fast Editor Tool
```
┌─────────────────────────────────────────────────────┐
│ 📄 Create File                                  ✓   │
├─────────────────────────────────────────────────────┤
│ File: src/components/NewFeature.tsx                 │
│ [CREATE]                                            │
│                                                      │
│ [View Content ▼]                                    │
│                                                      │
│ ✅ File created successfully                       │
└─────────────────────────────────────────────────────┘
```

**Mode Variants:**
- 🟢 **CREATE** - Creating new file (green theme)
- 🔵 **UPDATE** - Updating existing file (blue theme)
- 🔴 **DELETE** - Deleting file (red theme)

---

## Status Indicators

### Approval States
- **⏳ Pending** - Waiting for user approval
- **🔄 Loading** - Operation in progress (with spinner)
- **✅ Approved** - Operation completed successfully
- **❌ Rejected** - Operation was rejected by user
- **⚠️  Error** - Operation failed with error

### Color Coding
- 🔵 **Blue** - Information, active operations
- 🟢 **Green** - Success, completed operations
- 🔴 **Red** - Errors, dangerous operations
- 🟡 **Yellow** - Warnings, idle states
- ⚪ **Gray** - Neutral, default states

---

## Interactive Features

### Collapsible Sections
All tools support collapsible sections for detailed information:
```
[Section Title ▼]  ← Collapsed (click to expand)
[Section Title ▲]  ← Expanded (click to collapse)
```

### Scroll Areas
Long content automatically gets scrollable containers:
```
┌─────────────────┐
│ Content line 1  │ ↑
│ Content line 2  │ │
│ Content line 3  │ ║ Scrollbar
│ ...             │ │
│ Content line 50 │ ↓
└─────────────────┘
```

### Badges
Information displayed in pill-shaped badges:
```
[Regex]  [*.tsx]  [Max: 100]  [Create]  [Overwrite]
```

---

## Usage Flow Examples

### Example 1: Pattern Search
```
User → "Search for all class definitions in TypeScript files"
  ↓
AI   → Uses pattern_search tool
  ↓
UI   → Shows Pattern Search card [Loading]
  ↓
UI   → Updates to show results [Approved]
       - Statistics: 45 matches in 12 files
       - [View Analysis] button
       - [View Matches] button
  ↓
User → Clicks [View Analysis]
  ↓
UI   → Expands analysis section
       - File type distribution chart
       - Usage context breakdown
       - Insights and recommendations
```

### Example 2: File Rename
```
User → "Rename old-component.tsx to NewComponent.tsx"
  ↓
AI   → Uses rename tool
  ↓
UI   → Shows Rename File card [Pending]
       - From: old-component.tsx
       - To: NewComponent.tsx
       - Approve/Reject buttons
  ↓
User → Clicks Approve
  ↓
UI   → Updates to [Loading] with spinner
  ↓
UI   → Updates to [Approved] with success message
       ✅ File renamed successfully
```

### Example 3: Terminal Monitoring
```
User → "Start dev server and monitor progress"
  ↓
AI   → Starts server, uses read_progress tool
  ↓
UI   → Shows Read Progress card [Loading]
       - Terminal: dev-server
       - Status: Running (Active)
       - Command: npm run dev
  ↓
UI   → Updates continuously with:
       - Live activity status
       - Output snippets
       - Error/warning counts
  ↓
Server Ready → UI shows [Completed]
              ✅ Process completed successfully
```

---

## Responsive Behavior

### Small Screens
- Badges wrap to multiple lines
- Scroll areas adjust height
- Font sizes remain readable

### Large Screens
- More content visible without scrolling
- Side-by-side diff views
- Expanded analysis by default

---

## Accessibility Features

1. **Semantic HTML**: Proper heading hierarchy, buttons, etc.
2. **Icon + Text**: Never rely on color alone
3. **Keyboard Navigation**: All interactive elements keyboard accessible
4. **Screen Readers**: Proper ARIA labels
5. **High Contrast**: Works in high contrast mode
6. **Focus Indicators**: Clear focus states for keyboard users

---

## Performance Considerations

1. **Lazy Rendering**: Collapsible content not rendered until expanded
2. **Virtual Scrolling**: For very long lists
3. **Debounced Updates**: For real-time progress updates
4. **Memoization**: Expensive computations cached
5. **Smart Parsing**: Only parse visible content

---

## Theme Support

All components automatically adapt to:
- 🌞 **Light Mode**
- 🌙 **Dark Mode**
- 🎨 **Custom Themes**

Colors use CSS variables that adapt to theme:
- `--primary`, `--secondary`, `--accent`
- `--success`, `--info`, `--warning`, `--destructive`
- `--muted`, `--foreground`, `--background`

---

## Integration Points

### Backend → UI
Tools send data via `updateAsk()`:
```typescript
await updateAsk('tool', {
    tool: {
        tool: 'pattern_search',
        searchPattern: 'class\\s+\\w+',
        content: 'PATTERN ANALYSIS REPORT...',
        approvalState: 'approved',
        ts: timestamp,
    }
}, timestamp);
```

### UI → Display
React component renders based on tool type:
```typescript
case "pattern_search":
    return <PatternSearchToolBlock {...tool} />
```

---

## Error Handling

All tools gracefully handle:
1. **Missing Data**: Show placeholders or skip sections
2. **Invalid Content**: Parse safely with fallbacks
3. **Long Content**: Truncate or scroll
4. **Network Issues**: Show loading states indefinitely
5. **User Cancellation**: Clean up and show rejected state

---

## Best Practices

### For Tool Developers
1. Always include `approvalState` in tool data
2. Provide meaningful `content` for display
3. Use structured data when possible (XML/JSON)
4. Include timestamps for debugging
5. Handle all possible states

### For UI Developers
1. Follow existing component patterns
2. Use existing UI primitives (Button, Badge, etc.)
3. Support all approval states
4. Make content scrollable
5. Use collapsibles for long content
6. Add proper TypeScript types
7. Test in both light and dark themes
8. Ensure keyboard accessibility

---

## Maintenance Guide

### Adding New Tools
1. Add type to `new-tools.ts`
2. Create component in `tools/` directory
3. Register in `ToolRenderer` switch statement
4. Test all approval states
5. Check linting and TypeScript errors

### Modifying Existing Tools
1. Update type definition if schema changes
2. Update component props
3. Maintain backward compatibility
4. Test with real data
5. Update documentation

### Debugging
- Check browser console for errors
- Verify tool data structure
- Test approval state transitions
- Check scrolling behavior
- Test collapsible sections

---

This guide provides a comprehensive overview of all tool UIs created. Each component follows the same patterns for consistency, maintainability, and excellent user experience.

