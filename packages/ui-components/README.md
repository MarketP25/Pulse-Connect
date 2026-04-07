# @pulsco/ui-components

PULSCO Design System - Reusable UI Components for all portals.

## Overview

Complete component library implementing the PULSCO brand design system with:
- **Brand Consistency**: All components follow PULSCO branding guidelines
- **Accessibility**: WCAG AA compliant components
- **Responsive Design**: Mobile-first, fully responsive
- **Dark Mode**: Dark mode as default with light mode support
- **Type Safe**: Full TypeScript support

## Installation

```bash
pnpm add @pulsco/ui-components
```

## Components

### Button
```tsx
import { Button } from '@pulsco/ui-components';

<Button variant="primary">Click me</Button>
<Button variant="secondary" size="lg">Secondary</Button>
<Button variant="danger" isLoading>Loading...</Button>
```

**Variants**: `primary` | `secondary` | `tertiary` | `ghost` | `danger` | `success`  
**Sizes**: `sm` | `md` | `lg`

### Card
```tsx
import { Card } from '@pulsco/ui-components';

<Card elevated>
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>
```

### Badge
```tsx
import { Badge } from '@pulsco/ui-components';

<Badge variant="primary">New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="critical">Critical</Badge>
```

**Variants**: `primary` | `success` | `warning` | `critical` | `info`

### Input
```tsx
import { Input } from '@pulsco/ui-components';

<Input
  label="Email"
  placeholder="Enter email"
  error={error}
  helpText="We'll never share your email"
/>
```

### Navigation
```tsx
import { Navigation } from '@pulsco/ui-components';

<Navigation title="Admin Dashboard" logo={<Logo />}>
  <SearchBar />
  <Notifications />
  <UserMenu />
</Navigation>
```

### Breadcrumbs
```tsx
import { Breadcrumbs } from '@pulsco/ui-components';

<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', current: true },
  ]}
/>
```

## Design Tokens

Components automatically use the PULSCO design tokens:

### Colors
- **Primary**: `orbit-blue-600` (#0A1428)
- **Accent**: `pulse-cyan-500` (#00D9FF)
- **Secondary**: `stellar-purple-500` (#9D00FF)

### Typography
- **Font Family**: Inter (UI), JetBrains Mono (code)
- **Font Sizes**: h1-h4, body, body-lg, caption
- **Weights**: light (300), normal (400), medium (500), semibold (600), bold (700)

### Spacing
- Grid based on 8px: xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px), 3xl (64px)

## Customization

### Using Tailwind Classes
Components support standard Tailwind classes:

```tsx
<Button className="rounded-full shadow-lg">
  Custom Button
</Button>
```

### CSS Variables
Access design tokens via CSS custom properties:

```css
.custom-element {
  background-color: var(--color-pulse-cyan-accent);
  padding: var(--spacing-lg);
  font-family: var(--font-family-sans);
}
```

## Integration

### Add to Portal
1. Install the package:
   ```bash
   pnpm add @pulsco/ui-components
   ```

2. Import components:
   ```tsx
   import { Button, Card, Badge } from '@pulsco/ui-components';
   ```

3. Ensure Tailwind CSS is configured with PULSCO tokens (see tailwind.config.js)

## Accessibility

All components are built with accessibility as a core principle:
- WCAG AA compliant
- Keyboard navigation support
- Screen reader friendly
- Focus management
- High contrast support

## Contributing

1. Update components in `/src/components/`
2. Ensure TypeScript types are exported
3. Update exports in `components/index.ts`
4. Test with all three portals
5. Update this README with changes

## License

ISC
