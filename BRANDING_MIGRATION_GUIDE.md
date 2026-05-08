# PULSCO Branding - Portal Migration Guide

This guide helps you integrate the PULSCO design system into each portal.

---

## Phase 1: Setup (Estimated Time: 30 minutes)

### 1.1 Install Dependencies

```bash
# In root workspace
pnpm add lucide-react clsx classnames

# In each portal
pnpm add @pulsco/ui-components
```

### 1.2 Update Global CSS

In your app's root CSS or in `_app.tsx`:

```css
/* styles/globals.css */
@import "../styles/design-tokens.css";
@import "../styles/tailwind.css";
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
```

For Next.js with CSS modules:

```tsx
// pages/_app.tsx
import '../styles/globals.css';
import '../../../styles/design-tokens.css';
import '../../../styles/tailwind.css';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

### 1.3 Verify Tailwind Config

Ensure your `tailwind.config.js` includes the PULSCO design tokens. Both portals have this configured already:

```js
// tailwind.config.js - already configured with PULSCO tokens
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // PULSCO brand colors
        'orbit-blue': { /* ... */ },
        'pulse-cyan': { /* ... */ },
        'stellar-purple': { /* ... */ },
        // ... etc
      },
    },
  },
  plugins: [/* ... */],
};
```

---

## Phase 2: Component Migration (Estimated Time: 2-4 hours)

### 2.1 Replace Buttons

**Before:**
```tsx
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  Click Me
</button>
```

**After:**
```tsx
import { Button } from '@pulsco/ui-components';

<Button variant="primary">Click Me</Button>
```

### 2.2 Replace Cards

**Before:**
```tsx
<div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
  Content
</div>
```

**After:**
```tsx
import { Card } from '@pulsco/ui-components';

<Card elevated>
  Content
</Card>
```

### 2.3 Replace Inputs

**Before:**
```tsx
<input
  type="email"
  className="px-4 py-2 bg-gray-900 border border-gray-600 rounded"
  placeholder="Enter email"
/>
```

**After:**
```tsx
import { Input } from '@pulsco/ui-components';

<Input
  label="Email"
  placeholder="Enter email"
  type="email"
/>
```

### 2.4 Replace Badges/Tags

**Before:**
```tsx
<span className="px-3 py-1 text-sm font-medium bg-green-500 text-white rounded">
  Success
</span>
```

**After:**
```tsx
import { Badge } from '@pulsco/ui-components';

<Badge variant="success">Success</Badge>
```

### 2.5 Replace Navigation

**Before:**
```tsx
<header className="px-6 py-4 bg-gray-900 border-b">
  <nav className="flex justify-between items-center">
    <h1>My App</h1>
    <div>{children}</div>
  </nav>
</header>
```

**After:**
```tsx
import { Navigation } from '@pulsco/ui-components';

<Navigation title="My App">
  {children}
</Navigation>
```

---

## Phase 3: Icon Migration (Estimated Time: 1 hour)

Replace any icon library with Lucide React:

**Before (Font Awesome):**
```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';

<FontAwesomeIcon icon={faBell} />
```

**After (Lucide):**
```tsx
import { Bell } from 'lucide-react';

<Bell size={24} className="text-pulse-cyan-500" />
```

Common Lucide icons:
- Navigation: `Menu`, `X`, `ChevronRight`, `ChevronDown`
- Data: `BarChart3`, `LineChart`, `PieChart`, `TrendingUp`
- Settings: `Settings`, `Sliders`, `Cog`, `Tool`
- Status: `CheckCircle`, `AlertCircle`, `XCircle`, `Clock`
- Actions: `Plus`, `Edit`, `Trash2`, `Copy`, `Download`

---

## Phase 4: Color & Spacing Updates (Estimated Time: 1-2 hours)

### 4.1 Update Colors

**Before:**
```tsx
<div className="bg-blue-700 text-white">
  Blue content
</div>
```

**After:**
```tsx
<div className="bg-orbit-blue-600 text-tech-white">
  PULSCO Blue content
</div>
```

**Color Mapping:**
- Primary: `orbit-blue-600`
- Accent: `pulse-cyan-500`
- Secondary: `stellar-purple-500`
- Background: `nebula-900` or `nebula-800`
- Text: `tech-white`

### 4.2 Update Spacing

**Before:**
```tsx
<div className="p-4 mt-8 mb-8">
  Content
</div>
```

**After:**
```tsx
<div className="p-md mt-2xl mb-2xl">
  Content
</div>
```

**Spacing Map:**
- 4px: `xs`
- 8px: `sm`
- 16px: `md`
- 24px: `lg`
- 32px: `xl`
- 48px: `2xl`
- 64px: `3xl`

---

## Phase 5: Testing & QA (Estimated Time: 2-3 hours)

### 5.1 Visual Testing

- [ ] Verify colors match brand guidelines
- [ ] Check component sizes and spacing
- [ ] Review responsive behavior on mobile
- [ ] Validate dark mode appearance
- [ ] Test component interactions

### 5.2 Accessibility Testing

```bash
pnpm add --save-dev @axe-core/react
```

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<YourComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 5.3 Cross-Browser Testing

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## Migration Checklist

### Admin Portal (pulse-connect-admin-ui)

- [ ] Install dependencies
- [ ] Import global CSS
- [ ] Replace navigation
- [ ] Update dashboard components
- [ ] Replace all buttons
- [ ] Update form inputs
- [ ] Replace badges
- [ ] Update icons
- [ ] Test accessibility
- [ ] Verify responsive design
- [ ] Get design team review

### User Portal (pulse-connect-ui)

- [ ] Install dependencies
- [ ] Import global CSS
- [ ] Replace navigation
- [ ] Update page layouts
- [ ] Replace all buttons
- [ ] Update form components
- [ ] Replace badges and tags
- [ ] Update icons
- [ ] Test accessibility
- [ ] Verify responsive design
- [ ] Get product team review

---

## Common Issues & Solutions

### Issue: Styles not applying

**Cause**: Missing CSS imports  
**Solution**:
```tsx
// _app.tsx
import '../../../styles/design-tokens.css';
import '../../../styles/tailwind.css';
```

### Issue: Colors look different

**Cause**: Class names don't match  
**Solution**: Use exact class names from design tokens
```tsx
// Use these exact names
<div className="bg-orbit-blue-600 text-pulse-cyan-500">
```

### Issue: Components have wrong size

**Cause**: Conflicting Tailwind config  
**Solution**: Ensure portal's Tailwind includes PULSCO theme

### Issue: Icons not showing

**Cause**: Lucide not installed or imported  
**Solution**:
```bash
pnpm add lucide-react
```

```tsx
import { Bell } from 'lucide-react';
```

---

## Rollback Plan

If issues arise during migration:

### 1. Revert Component Imports

Switch back to custom components temporarily:
```tsx
// Old component location
// import { Button } from '../components/Button';
// New component location
import { Button } from '@pulsco/ui-components';
```

### 2. Keep Git History

```bash
# Commit before migration
git commit -m "checkpoint: before branding migration"

# Easy to revert if needed
git revert <commit-hash>
```

### 3. Feature Flags

```tsx
const USE_BRANDING_SYSTEM = true;

function MyButton(props) {
  if (USE_BRANDING_SYSTEM) {
    return <BrandingButton {...props} />;
  }
  return <LegacyButton {...props} />;
}
```

---

## Performance Considerations

The new design system is optimized for performance:

- Component size: ~2-4KB per component
- Total package: ~45KB gzipped
- No additional runtime overhead
- Tree-shakeable exports

**Bundle impact:** Minimal (< 50KB added)

---

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Setup | 30 min | ✅ Ready |
| Component Migration | 2-4 hrs | Ready |
| Icon Migration | 1 hr | Ready |
| Colors & Spacing | 1-2 hrs | Ready |
| Testing & QA | 2-3 hrs | Ready |
| **Total** | **6-12 hrs** | **Ready** |

Per portal: ~3-6 hours of development + 1-2 hours QA

---

## Next Steps

1. **Start with one portal** (recommend Admin Portal first)
2. **Follow the phases in order**
3. **Test thoroughly at each phase**
4. **Get team review before next portal**
5. **Document any customizations made**
6. **Celebrate successful migration! 🎉**

---

## Resources

- [Component API](BRANDING_IMPLEMENTATION.md#component-api)
- [Design Tokens](BRANDING_IMPLEMENTATION.md#design-tokens-reference)
- [Lucide Icons Gallery](https://lucide.dev)
- [Tailwind Docs](https://tailwindcss.com)

---

**Need help?** Check the examples in each portal's codebase or refer to the component README.
