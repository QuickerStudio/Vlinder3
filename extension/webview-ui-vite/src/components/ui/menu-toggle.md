# MenuToggle Component

一个自定义的菜单切换按钮组件，可以在汉堡菜单图标和X图标之间平滑切换。

## 功能特性

- ✨ 平滑的动画过渡效果
- 🎨 可自定义样式
- ♿ 支持受控和非受控模式
- 🔧 完全类型安全的TypeScript实现

## 使用方法

### 基础用法

```tsx
import { MenuToggle } from "@/components/ui/menu-toggle"

export function MyComponent() {
  return <MenuToggle />
}
```

### 受控组件

```tsx
import { useState } from "react"
import { MenuToggle } from "@/components/ui/menu-toggle"

export function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <MenuToggle
      checked={isOpen}
      onCheckedChange={setIsOpen}
    />
  )
}
```

### 自定义样式

```tsx
import { MenuToggle } from "@/components/ui/menu-toggle"

export function MyComponent() {
  return (
    <MenuToggle
      className="my-custom-class"
      barClassName="!bg-red-500"
    />
  )
}
```

## Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `checked` | `boolean` | `false` | 控制组件的选中状态 |
| `onCheckedChange` | `(checked: boolean) => void` | - | 状态改变时的回调函数 |
| `className` | `string` | - | 应用到label元素的自定义类名 |
| `barClassName` | `string` | - | 应用到每个bar的自定义类名 |
| `id` | `string` | `"menu-toggle-checkbox"` | checkbox的ID |
| ...其他 | `InputHTMLAttributes<HTMLInputElement>` | - | 支持所有标准input属性 |

## 样式定制

组件使用以下CSS类，可以在你的样式文件中覆盖：

- `.menu-toggle-checkbox` - 隐藏的checkbox
- `.menu-toggle` - 主容器
- `.menu-toggle-bar` - 每个bar的样式

默认bar颜色为 `rgb(76, 189, 151)`，可以通过 `barClassName` prop来覆盖。

## 示例

查看 `menu-toggle-example.tsx` 文件了解更多使用示例。


