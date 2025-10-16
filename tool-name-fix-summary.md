# Tool Name Fix Summary

## Problem
The extension was showing errors: `Error: Unknown tool: replace_string_in_file`

The AI model was attempting to use tools with incorrect names, causing the tool executor to reject them as unknown.

## Root Cause
There was a **tool name mismatch** across multiple layers of the system:
- AI model prompts were telling it to use: `replace_string_in_file`, `multi_replace_string_in_file`, `insert_edit_into_file`
- But the tool executor expected: `replace_string`, `multi_replace_string`, `insert_edit`

This mismatch occurred in both:
1. **Prompt definitions** (`extension/src/agent/v1/prompts/tools/*.ts`) - what the AI is told to use
2. **Schema definitions** (`extension/src/agent/v1/tools/schema/*.ts`) - what the system expects

## Solution
Updated all tool name references across both prompt and schema layers to use the correct shorter names.

## Files Modified

### Prompt Files (What AI is Told)

#### 1. `extension/src/agent/v1/prompts/tools/replace-string.ts`
- **Line 4**: Changed `name: 'replace_string_in_file'` → `name: 'replace_string'`
- **Lines 42-113**: Updated all examples to use `<replace_string>` tag instead of `<tool name="replace_string_in_file">`

#### 2. `extension/src/agent/v1/prompts/tools/multi-replace-string.ts`
- **Line 4**: Changed `name: 'multi_replace_string_in_file'` → `name: 'multi_replace_string'`
- **Lines 30-62**: Updated all examples to use `<multi_replace_string>` tag
- **Line 81**: Updated documentation reference from `replace_string_in_file` → `replace_string`

#### 3. `extension/src/agent/v1/prompts/tools/insert-edit.ts`
- **Line 4**: Changed `name: 'insert_edit_into_file'` → `name: 'insert_edit'`
- **Lines 47-78**: Updated all examples to use `<insert_edit>` tag
- **Lines 103-105**: Updated documentation references from `replace_string_in_file`/`multi_replace_string_in_file` → `replace_string`/`multi_replace_string`

### Schema Files (What System Expects)

#### 4. `extension/src/agent/v1/tools/schema/replace-string.ts`
- **Line 4**: Updated JSDoc `@tool replace_string_in_file` → `@tool replace_string`
- **Line 16**: Updated doc reference `multi_replace_string_in_file` → `multi_replace_string`
- **Line 78**: Changed `name: 'replace_string_in_file'` → `name: 'replace_string'`
- **Line 85**: Changed type `name: 'replace_string_in_file'` → `name: 'replace_string'`
- **Lines 40-73**: Updated all examples to use `<replace_string>` tag

#### 5. `extension/src/agent/v1/tools/schema/multi-replace-string.ts`
- **Line 183**: Updated JSDoc `@tool multi_replace_string_in_file` → `@tool multi_replace_string`
- **Line 184**: Updated doc reference `replace_string_in_file` → `replace_string`
- **Line 327**: Changed `name: 'multi_replace_string_in_file'` → `name: 'multi_replace_string'`
- **Line 334**: Changed type `name: 'multi_replace_string_in_file'` → `name: 'multi_replace_string'`
- **Lines 276-322**: Updated all examples to use `<multi_replace_string>` tag

#### 6. `extension/src/agent/v1/tools/schema/insert-edit.ts`
- **Line 4**: Updated JSDoc `insert_edit_into_file` → `insert_edit`
- **Line 72**: Changed `name: 'insert_edit_into_file'` → `name: 'insert_edit'`
- **Line 79**: Changed type `name: 'insert_edit_into_file'` → `name: 'insert_edit'`
- **Lines 33-67**: Updated all examples to use `<insert_edit>` tag

## Impact

### Before Fix
```
Error: Unknown tool: replace_string_in_file
Error: Unknown tool: multi_replace_string_in_file  
Error: Unknown tool: insert_edit_into_file
```

The AI would try to use these tools but the tool executor would reject them, causing failures.

### After Fix
✅ Tools now work correctly:
- AI is told to use: `replace_string`, `multi_replace_string`, `insert_edit`
- Tool executor expects: `replace_string`, `multi_replace_string`, `insert_edit`
- Names match perfectly at all layers

## Tool Name Consistency

### Correct Tool Names
| Tool | Correct Name | XML Tag |
|------|--------------|---------|
| Replace String | `replace_string` | `<replace_string>` |
| Multi Replace String | `multi_replace_string` | `<multi_replace_string>` |
| Insert Edit | `insert_edit` | `<insert_edit>` |

### Examples

#### Replace String
```xml
<replace_string>
  <explanation>Fix typo in function name</explanation>
  <filePath>src/utils.ts</filePath>
  <oldString>function calcualteTotal() {</oldString>
  <newString>function calculateTotal() {</newString>
</replace_string>
```

#### Multi Replace String
```xml
<multi_replace_string>
  <explanation>Rename getUserData to fetchUserData across the codebase</explanation>
  <replacements>
    <replacement>
      <filePath>src/api/users.ts</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
    <replacement>
      <filePath>src/components/UserProfile.tsx</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
  </replacements>
</multi_replace_string>
```

#### Insert Edit
```xml
<insert_edit>
  <explanation>Add missing import for useEffect hook</explanation>
  <filePath>src/components/Dashboard.tsx</filePath>
  <startLine>2</startLine>
  <code>import { useEffect } from 'react'</code>
</insert_edit>
```

## Related Fix
This complements the earlier UI fix where we updated the UI components to use the correct `camelCase` property names (`filePath`, `oldString`, `newString`) that match what the backend sends.

## Type System Validation
The TypeScript type system now correctly validates tool names through the `ToolName` type, which is derived from `ToolParams["name"]`. The updated tool parameter types ensure compile-time checking of tool names.

## Verification Steps
1. ✅ All prompt files use correct tool names
2. ✅ All schema files use correct tool names
3. ✅ All examples use correct XML tags
4. ✅ No linter errors
5. ✅ TypeScript types match actual implementation
6. ✅ Tool executor can now recognize and execute these tools

## Testing
After these changes, the AI model should be able to successfully:
1. Use `replace_string` to make single-file string replacements
2. Use `multi_replace_string` to make multi-file string replacements
3. Use `insert_edit` to insert or replace code at specific line numbers

All three tools should now execute without "Unknown tool" errors.

