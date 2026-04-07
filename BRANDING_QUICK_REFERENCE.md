# PULSCO Branding - Quick Reference

Rapid developer reference for PULSCO design system.

---

## Installation

```bash
pnpm add lucide-react clsx classnames @pulsco/ui-components
```

---

## Imports

```tsx
// Components
import { Button, Card, Badge, Input, Navigation, Breadcrumbs } from '@pulsco/ui-components';

// Icons
import { Menu, Bell, Settings, Plus, Trash2 } from 'lucide-react';

// CSS (in app root or _app.tsx)
import '../../styles/design-tokens.css';
import '../../styles/tailwind.css';
```

---

## Color Palette

### Primary
```
Orbit Blue:      orbit-blue-600    (#0A1428)
Pulse Cyan:      pulse-cyan-500    (#00D9FF)
Stellar Purple:  stellar-purple-500 (#9D00FF)
```

### Backgrounds
```
Nebula Dark:     nebula-900        (#0F1929)
Cosmic Slate:    nebula-800        (#1A2744)
Grid Silver:     nebula-500        (#3A4A6A)
Tech White:      tech-white        (#F0F4F8)
```

### Semantic
```
Success:    success   (#10B981)
Warning:    warning   (#F59E0B)
Critical:   critical  (#EF4444)
Info:       info      (#3B82F6)
```

---

## Components

### Button
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="tertiary">Tertiary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button isLoading>Loading...</Button>
<Button disabled>Disabled</Button>
<Button isFullWidth>Full Width</Button>
```

### Card
```tsx
<Card>Basic Card</Card>
<Card elevated>Elevated Card</Card>
<Card interactive>Interactive Card</Card>
<Card elevated interactive>Both</Card>
```

### Badge
```tsx
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="critical">Critical</Badge>
<Badge variant="info">Info</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
```

### Input
```tsx
<Input placeholder="Text" />
<Input label="Email" type="email" />
<Input error="Required" />
<Input helpText="Help text" />
<Input icon={<Mail />} />
```

### Navigation
```tsx
<Navigation title="Dashboard">
  <Bell />
  <Settings />
</Navigation>
```

### Breadcrumbs
```tsx
<Breadcrumbs
  items={[
    { label: 'Home' },
    { label: 'Settings' },
    { label: 'Profile', current: true },
  ]}
/>
```

---

## Spacing (8px Grid)

```
xs: 4px   (0.5x)
sm: 8px   (1x)
md: 16px  (2x)
lg: 24px  (3x)
xl: 32px  (4x)
2xl: 48px (6x)
3xl: 64px (8x)
```

## Grid Classes

```tsx
<div className="p-md m-lg">Padded with margin</div>
<div className="gap-lg flex">Flex with gap</div>
<div className="mt-2xl mb-lg">Top/bottom margin</div>
```

---

## Typography

### Sizes
```
h1: 48px (36px mobile)
h2: 36px (28px mobile)
h3: 28px (22px mobile)
h4: 22px
body-lg: 16px
body: 14px
caption: 12px
```

### Font Families
```tsx
<div className="font-sans">Sans (UI)</div>
<code className="font-mono">Code font</code>
```

### Weights
```
italic: 300
normal: 400
medium: 500
semibold: 600
bold: 700
```

---

## Icons (Lucide)

### Navigation
```tsx
import { Menu, X, ChevronRight, ChevronDown } from 'lucide-react';
```

### Data
```tsx
import { BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';
```

### Settings
```tsx
import { Settings, Sliders, Cog, Tool } from 'lucide-react';
```

### Communication
```tsx
import { MessageSquare, Send, Bell, Mail } from 'lucide-react';
```

### Status
```tsx
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
```

### Actions
```tsx
import { Plus, Edit, Trash2, Copy, Download } from 'lucide-react';
```

**Size**: 16, 20, 24, 32  
**Color**: `className="text-pulse-cyan-500"`

---

## Styling

### Tailwind Classes
```tsx
// Colors
<div className="bg-orbit-blue-600 text-tech-white">
  Blue text on dark background
</div>

// Spacing
<div className="p-lg m-md">Padding and margin</div>

// Border & Radius
<div className="border border-nebula-500 rounded-lg">Card</div>

// Shadows
<div className="shadow-md hover:shadow-lg">Shadow</div>

// Transitions
<div className="transition-colors duration-300">Smooth transition</div>
```

### CSS Variables
```css
.my-component {
  background-color: var(--color-pulse-cyan-accent);
  padding: var(--spacing-lg);
  font-family: var(--font-family-sans);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
```

---

## Common Patterns

### Header + Content
```tsx
<>
  <Navigation title="Dashboard">
    <Bell />
  </Navigation>
  <main className="p-lg">
    <h1>Welcome</h1>
  </main>
</>
```

### Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>
```

### Form
```tsx
<form className="space-y-lg">
  <Input label="Name" />
  <Input label="Email" type="email" />
  <Button variant="primary" isFullWidth>Submit</Button>
</form>
```

### Action Bar
```tsx
<div className="flex gap-md justify-between">
  <Button variant="ghost">Cancel</Button>
  <div className="flex gap-md">
    <Button variant="secondary">Save</Button>
    <Button variant="primary">Publish</Button>
  </div>
</div>
```

---

## Dark/Light Mode

### Default: Dark Mode
No action needed - dark mode is default.

### Enable Light Mode
```tsx
// In HTML root
<html className={isDarkMode ? '' : 'light-mode'}>
```

---

## Responsive Design

### Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Responsive Classes
```tsx
<div className="p-sm md:p-md lg:p-lg">
  Small padding on mobile, medium on tablet, large on desktop
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  1 column mobile, 2 tablet, 3 desktop
</div>
```

---

## Accessibility

```tsx
// Keyboard navigation - automatic
<Button>Accessible button</Button>

// Focus visible - automatic
// Link - automatic blue focus outline

// Screen reader
<button aria-label="Delete item">
  <Trash2 />
</button>

// Semantic HTML - use components!
<Navigation>Use Navigation instead of div</Navigation>
<Card>Use Card instead of div</Card>
```

---

## Performance Tips

- Use CSS classes instead of inline styles
- Leverage Tailwind utilities
- Component size: 2-4KB each
- Total system: ~45KB gzipped

---

## Customization

### Override Styles
```tsx
<Button className="shadow-xl rounded-full">
  Custom button
</Button>
```

### Extend Theme
```js
// In tailwind.config.js
theme: {
  extend: {
    colors: {
      'custom': '#YOUR_COLOR',
    },
  },
}
```

---

## TypeScript

All components have full TypeScript support:

```tsx
import type { ButtonProps, CardProps } from '@pulsco/ui-components';

const MyButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />;
};
```

---

## Resources

- [Full Implementation Guide](./BRANDING_IMPLEMENTATION.md)
- [Migration Guide](./BRANDING_MIGRATION_GUIDE.md)
- [Brand Guide](./BRANDING_GUIDE.md)
- [Component README](./packages/ui-components/README.md)

---

## FAQ

**Q: Can I customize colors?**  
A: Yes! Use className prop or extend Tailwind theme.

**Q: How do I use custom fonts?**  
A: Import fonts in your app, they inherit from CSS variables.

**Q: Is dark mode the only option?**  
A: Dark is default, light mode available via CSS variables.

**Q: Can I use with existing styles?**  
A: Yes! Components work alongside your existing CSS.

**Q: Need a component not here?**  
A: Create it using same patterns in `packages/ui-components`.

---

**Last Updated**: March 29, 2026  
**Status**: Ready to use
