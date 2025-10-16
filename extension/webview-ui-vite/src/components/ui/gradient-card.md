# GradientCard Component

一个带有渐变边框和悬停动画效果的卡片组件。

## 功能特性

- ✨ 渐变边框效果
- 🎨 悬停时的旋转动画
- 🌈 模糊发光效果
- 🔧 完全可自定义
- 📱 响应式设计

## 使用方法

### 基础用法

```tsx
import { GradientCard } from "@/components/ui/gradient-card"

export function MyComponent() {
  return (
    <GradientCard
      heading="Popular this month"
      poweredBy="Powered By"
      brandName="Uiverse"
    />
  )
}
```

### 使用自定义子元素

```tsx
import { GradientCard } from "@/components/ui/gradient-card"

export function MyComponent() {
  return (
    <GradientCard>
      <p className="gradient-card-heading">My Title</p>
      <p>Some description</p>
      <p>Brand Name</p>
    </GradientCard>
  )
}
```

### 添加点击事件

```tsx
import { GradientCard } from "@/components/ui/gradient-card"

export function MyComponent() {
  return (
    <GradientCard
      heading="Click me"
      poweredBy="Interactive"
      brandName="Card"
      onClick={() => console.log("Clicked!")}
    />
  )
}
```

### 自定义尺寸

```tsx
import { GradientCard } from "@/components/ui/gradient-card"

export function MyComponent() {
  return (
    <GradientCard
      className="!w-[250px] !h-[300px]"
      heading="Large Card"
      poweredBy="Custom Size"
      brandName="Example"
    />
  )
}
```

## Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `heading` | `string` | - | 卡片标题 |
| `poweredBy` | `string` | - | "Powered By" 文本 |
| `brandName` | `string` | - | 品牌名称 |
| `children` | `React.ReactNode` | - | 自定义子元素（会覆盖其他props） |
| `className` | `string` | - | 自定义类名 |
| ...其他 | `HTMLAttributes<HTMLDivElement>` | - | 支持所有标准div属性 |

## 样式定制

组件使用以下CSS类，可以在你的样式文件中覆盖：

- `.gradient-card` - 主容器
- `.gradient-card-heading` - 标题样式
- `.gradient-card::before` - 渐变边框
- `.gradient-card::after` - 模糊发光效果

### 默认样式

- **尺寸**: 190px × 254px
- **背景色**: 黑色 (#000)
- **边框渐变**: #e81cff → #40c9ff
- **发光渐变**: #fc00ff → #00dbde
- **动画**: cubic-bezier(0.175, 0.885, 0.32, 1.275)

## 悬停效果

- 边框旋转和缩放变换
- 模糊效果从 20px 增加到 30px
- 平滑的过渡动画

## 示例

查看 `gradient-card-example.tsx` 文件了解更多使用示例。

