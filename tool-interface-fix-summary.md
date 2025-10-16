# Tool Interface Fix Summary

## Problem
Three tool interfaces were not displaying correctly in the UI:
1. `replace_string_in_file` (replace_string)
2. `multi_replace_string_in_file` (multi_replace_string) 
3. `insert_edit_into_file` (insert_edit)

## Root Cause
There was a **property name mismatch** between the backend tool runners and the UI components:
- Backend tool runners send data using **camelCase** property names (e.g., `filePath`, `oldString`, `newString`)
- UI components were expecting **snake_case** property names (e.g., `path`, `old_string`, `new_string`)

This mismatch caused the UI components to receive `undefined` values for all properties, resulting in blank or broken displays.

## Solution
Updated the three UI components in `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx` to use the correct **camelCase** property names that match what the backend sends, following the pattern established by the working `FastEditorToolBlock` component.

## Changes Made

### 1. ReplaceStringToolBlock (Lines 1657-1737)
**Before:**
```typescript
({ path, old_string, new_string, approvalState, ts, userFeedback, isSubMsg })
```

**After:**
```typescript
({ filePath, oldString, newString, explanation, occurrences, approvalState, ts, userFeedback, isSubMsg })
```

**Improvements:**
- Fixed property names to match backend output
- Added `explanation` display with info badge
- Added `occurrences` count badge
- Improved status icon with loading spinner
- Better visual consistency with FastEditorToolBlock

### 2. MultiReplaceStringToolBlock (Lines 1739-1876)
**Before:**
```typescript
({ path, replacements, approvalState, ts, userFeedback, isSubMsg })
```

**After:**
```typescript
({ replacements, explanation, successes, failures, errors, summary, approvalState, ts, userFeedback, isSubMsg })
```

**Improvements:**
- Removed incorrect `path` property (not sent by backend)
- Added support for `explanation`, `successes`, `failures`, `errors`, `summary`
- Implemented file grouping logic to organize replacements by file
- Added success/failure badges
- Improved status icon with loading spinner
- Enhanced error display with detailed error list
- Better visual hierarchy showing file paths and individual replacements

### 3. InsertEditToolBlock (Lines 1878-1983)
**Before:**
```typescript
({ path, insert_line, content, approvalState, ts, userFeedback, isSubMsg })
```

**After:**
```typescript
({ filePath, startLine, endLine, code, explanation, operationType, lineRange, approvalState, ts, userFeedback, isSubMsg })
```

**Improvements:**
- Fixed property names to match backend output
- Added support for both insert and replace operations
- Added `explanation` display
- Added `operationType` and `lineRange` badges
- Improved status icon with loading spinner
- Dynamic title based on operation type (Insert Edit vs Replace Edit)
- Better status messages that indicate the specific operation performed

## Reference Implementation
All changes follow the pattern established by `FastEditorToolBlock` in:
- `extension/webview-ui-vite/src/components/chat-row/tools/fast-editor-tool.tsx`

This component demonstrates the correct approach:
- Using camelCase property names from backend
- Consistent status icon patterns
- Loading states with spinners
- Proper explanation display
- Clear visual hierarchy

## Backend Files Referenced
1. `extension/src/agent/v1/tools/runners/replace-string.tool.ts`
   - Sends: `filePath`, `oldString`, `newString`, `explanation`, `occurrences`
   
2. `extension/src/agent/v1/tools/runners/multi-replace-string.tool.ts`
   - Sends: `replacements[]` (with `filePath`, `oldString`, `newString` per item), `explanation`, `successes`, `failures`, `errors`, `summary`
   
3. `extension/src/agent/v1/tools/runners/insert-edit.tool.ts`
   - Sends: `filePath`, `startLine`, `endLine`, `code`, `explanation`, `operationType`, `lineRange`

## Type Definitions
The type definitions in `extension/src/shared/new-tools.ts` include both property name variants for backward compatibility:
```typescript
export type ReplaceStringTool = {
  tool: "replace_string"
  path?: string          // Legacy
  filePath?: string      // Current
  old_string?: string    // Legacy
  oldString?: string     // Current
  new_string?: string    // Legacy
  newString?: string     // Current
  // ...
}
```

The UI components now use the **current** camelCase variants that match the backend implementation.

## Testing Recommendations
1. Test `replace_string` tool with a simple string replacement
2. Test `multi_replace_string` tool with multiple files and multiple replacements per file
3. Test `insert_edit` tool with both insert and replace operations
4. Verify all approval states display correctly: pending, loading, approved, rejected, error
5. Verify explanations and additional metadata display correctly
6. Test error states and user feedback display

## Files Modified
- `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

## Linter Status
✅ No linter errors detected after changes.

