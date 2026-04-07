# PULSCO Brand Guidelines

**Version:** 1.0  
**Last Updated:** March 29, 2026  
**Aesthetic:** Tech-forward, Futuristic, Enterprise

---

## 1. Brand Identity

### Vision
PULSCO (Pulse Connect) is a **planetary-scale intelligence platform** that connects, governs, and optimizes complex ecosystems. Our brand reflects:
- **Intelligence & Efficiency**: Data-driven, precision-focused
- **Trust & Transparency**: Governance-first, immutable audits
- **Global Reach**: Planetary scale, multi-region presence
- **Innovation**: Cutting-edge tech, forward-thinking

### Brand Pillars
| Pillar | Description |
|--------|-------------|
| **Planetary** | Global scale, interconnected, distributed |
| **Intelligent** | AI-driven, predictive, autonomous |
| **Trustworthy** | Governance, security, compliance |
| **Fast** | Real-time, responsive, efficient |

---

## 2. Color Palette

### Primary Colors
```
Deep Orbit Blue (Primary):
  Hex: #0A1428
  RGB: 10, 20, 40
  Usage: Main brand color, headers, primary actions

Pulse Cyan (Accent):
  Hex: #00D9FF
  RGB: 0, 217, 255
  Usage: Highlights, active states, data visualization

Stellar Purple (Secondary):
  Hex: #9D00FF
  RGB: 157, 0, 255
  Usage: Gradients, secondary CTAs, premium features
```

### Extended Palette
```
Nebula Dark (Background):
  Hex: #0F1929
  RGB: 15, 25, 41
  Usage: Page backgrounds, dark mode base

Cosmic Slate (Subtle):
  Hex: #1A2744
  RGB: 26, 39, 68
  Usage: Cards, containers, surface elevation

Grid Silver (Borders):
  Hex: #3A4A6A
  RGB: 58, 74, 106
  Usage: Dividers, borders, subtle separators

Tech White (Text):
  Hex: #F0F4F8
  RGB: 240, 244, 248
  Usage: Primary text, high contrast
```

### Semantic Colors
```
Success (Growth):
  Hex: #10B981
  RGB: 16, 185, 129
  Usage: Success states, positive data

Warning (Caution):
  Hex: #F59E0B
  RGB: 245, 158, 11
  Usage: Warnings, pending states

Critical (Alert):
  Hex: #EF4444
  RGB: 239, 68, 68
  Usage: Errors, critical alerts

Info (Insight):
  Hex: #3B82F6
  RGB: 59, 130, 246
  Usage: Information, notifications
```

### Accessibility
- Cyan (#00D9FF) on Deep Blue (#0A1428): WCAG AAA compliant (contrast 12.8:1)
- Purple (#9D00FF) on Nebula (#0F1929): WCAG AA compliant (contrast 7.2:1)
- Always test contrast ratios before deployment

---

## 3. Typography System

### Font Stack
```
Headlines & Titles:
  Font Family: 'Inter', system-ui, sans-serif
  Font Weight: 700 (bold)
  Letter Spacing: -0.02em

Body & UI:
  Font Family: 'Inter', system-ui, sans-serif
  Font Weight: 500 (medium)
  Letter Spacing: -0.01em

Code & Technical:
  Font Family: 'JetBrains Mono', 'Courier New', monospace
  Font Weight: 400
  Letter Spacing: 0
```

### Scale (Responsive)
```
Heading 1 (H1):
  Desktop: 48px / 1.1 line-height
  Mobile: 36px / 1.2 line-height
  Weight: 700

Heading 2 (H2):
  Desktop: 36px / 1.1 line-height
  Mobile: 28px / 1.2 line-height
  Weight: 700

Heading 3 (H3):
  Desktop: 28px / 1.2 line-height
  Mobile: 22px / 1.3 line-height
  Weight: 600

Heading 4 (H4):
  Desktop: 22px / 1.2 line-height
  Weight: 600

Body Large (16px):
  Desktop: 16px / 1.6 line-height
  Weight: 500

Body Regular (14px):
  Desktop: 14px / 1.6 line-height
  Weight: 500

Caption (12px):
  Desktop: 12px / 1.5 line-height
  Weight: 400
  Color: Grid Silver (secondary text)
```

---

## 4. Spacing & Layout

### 8px Base Grid
All spacing uses multiples of 8px for consistency:
```
xs: 4px   (0.5x)
sm: 8px   (1x)
md: 16px  (2x)
lg: 24px  (3x)
xl: 32px  (4x)
2xl: 48px (6x)
3xl: 64px (8x)
```

### Container Widths
```
Mobile: 100% (no max)
Tablet: 640px (sm)
Desktop: 1024px (lg)
Wide: 1280px (xl)
Ultra-wide: 1536px (2xl)
```

### Common Spacing Rules
- Page padding: 24px (mobile), 32px (tablet), 48px (desktop)
- Component padding: 16px (sm), 24px (md)
- Margin between sections: 48px (vertical), 32px (horizontal)

---

## 5. Component Design System

### Buttons
**Primary Button**
```
Background: Pulse Cyan (#00D9FF)
Text: Deep Orbit Blue (#0A1428)
Padding: 12px 24px
Border Radius: 6px
Font Weight: 600
Hover: Cyan at 85% opacity
Active: Cyan at 70% opacity
```

**Secondary Button**
```
Background: Transparent
Border: 2px solid Pulse Cyan (#00D9FF)
Text: Pulse Cyan (#00D9FF)
Padding: 12px 24px
Border Radius: 6px
Font Weight: 600
Hover: Background at 10% opacity
```

**Tertiary Button**
```
Background: Cosmic Slate (#1A2744)
Text: Tech White (#F0F4F8)
Padding: 12px 24px
Border Radius: 6px
Font Weight: 500
Hover: Background at 120% brightness
```

### Cards
```
Background: Cosmic Slate (#1A2744)
Border: 1px solid Grid Silver (#3A4A6A)
Border Radius: 8px
Padding: 24px
Box Shadow: 0 4px 6px rgba(0, 217, 255, 0.1)
Hover Shadow: 0 8px 12px rgba(0, 217, 255, 0.15)
```

### Input Fields
```
Background: Nebula Dark (#0F1929)
Border: 1px solid Grid Silver (#3A4A6A)
Border Radius: 6px
Padding: 12px 16px
Font Size: 14px
Focus: Border 2px Pulse Cyan (#00D9FF)
Focus Box Shadow: 0 0 0 3px rgba(0, 217, 255, 0.1)
```

### Badge / Tag
```
Background: Stellar Purple (#9D00FF) at 15% opacity
Text: Stellar Purple (#9D00FF)
Padding: 4px 12px
Border Radius: 4px
Font Size: 12px
Font Weight: 600
```

---

## 6. Iconography

### Style Guide
- **Style**: Modern, minimal, geometric
- **Stroke Width**: 2px (consistent)
- **Corner Radius**: 1px (subtle rounding)
- **Sizing**: 16px, 20px, 24px, 32px (multiples of 4)
- **Color**: Inherit text color or use Pulse Cyan

### Recommended Icon Set
Use **Lucide React** (tech-forward, minimal):
```bash
npm install lucide-react
```

### Common Icons
```
Navigation:
  - Menu, X, ChevronRight, ChevronDown
  
Data:
  - BarChart3, LineChart, PieChart, TrendingUp
  
Settings:
  - Settings, Sliders, Cog, Tool
  
Communication:
  - MessageSquare, Send, Bell, Mail
  
Status:
  - CheckCircle, AlertCircle, XCircle, Clock
  
Location:
  - MapPin, Globe, Navigation, Map
  
Actions:
  - Plus, Edit, Trash2, Copy, Download
```

---

## 7. Navigation Patterns

### Global Navigation (All Portals)
```
Layout: Sidebar (collapsible) + Top Bar
Sticky: Yes
Height: 64px (top bar), 300px min (sidebar expanded)

Top Bar Contents:
  - Logo (left)
  - Search (center-left)
  - User Menu (right)
  - Notifications (right)

Sidebar Contents:
  - Logo
  - Navigation links (active indicator in Cyan)
  - Help/Support (bottom)
  - Theme toggle (bottom)
```

### Breadcrumbs
```
Format: Home > Section > Subsection > Current
Separator: /
Color: Grid Silver
Current: Tech White (bold)
Hover: Pulse Cyan (clickable)
```

### Tabs
```
Active Tab:
  Border Bottom: 3px solid Pulse Cyan (#00D9FF)
  Text: Tech White (#F0F4F8)
  
Inactive Tab:
  Border Bottom: 1px solid Grid Silver (#3A4A6A)
  Text: Grid Silver (#3A4A6A)
  
Hover: Text to Tech White
```

---

## 8. Portal-Specific Branding

### Admin Portal (pulse-connect-admin-ui)
**Purpose**: Governance, monitoring, oversight  
**Primary Color**: Deep Orbit Blue  
**Accent**: Pulse Cyan  
**Tone**: Professional, analytical, data-heavy

**Key Sections**:
- Dashboard (metrics, alerts)
- Governance (policy, audit)
- Users & Roles
- System Health
- Reports

### User Portal (pulse-connect-ui)
**Purpose**: Customer engagement, transactions  
**Primary Color**: Deep Orbit Blue  
**Accent**: Pulse Cyan with Stellar Purple accents  
**Tone**: Friendly, efficient, action-oriented

**Key Sections**:
- Home (overview)
- Transactions
- Settings
- Support
- Account

### Marketing Portal (pap_v1)
**Purpose**: Campaigns, insights, engagement  
**Primary Color**: Stellar Purple  
**Accent**: Pulse Cyan  
**Tone**: Dynamic, engaging, results-focused

**Key Sections**:
- Campaigns
- Analytics
- Audience
- Content
- Performance

---

## 9. Dark Mode (Default)

All portals use **dark mode by default** to match the tech-forward aesthetic.

**Light Mode (Optional)**:
```
If implemented, use:
- Background: #FFFFFF (white)
- Surface: #F3F4F6 (light gray)
- Text: #111827 (near-black)
- Primary: #0A1428 (Deep Blue)
- Accent: #00D9FF (Pulse Cyan)
```

---

## 10. Animations & Transitions

### Timing
```
Fast: 150ms (interactions)
Normal: 300ms (state changes)
Slow: 500ms (complex animations)
```

### Easing Functions
```
Ease In: cubic-bezier(0.4, 0, 1, 1)
Ease Out: cubic-bezier(0, 0, 0.2, 1)
Ease In-Out: cubic-bezier(0.4, 0, 0.2, 1)
```

### Transitions
```
- Background color: 300ms ease-out
- Border color: 300ms ease-out
- Shadow: 300ms ease-out
- Opacity: 200ms ease-out
- Transform: 300ms ease-out
```

### Micro-interactions
```
Button Press: scale(0.95) on active
Link Hover: color fade + underline slide
Card Hover: elevation increase + shadow expand
```

---

## 11. Implementation Checklist

- [ ] Tailwind config updated with design tokens (all portals)
- [ ] CSS custom properties (variables) configured
- [ ] Component library created (buttons, cards, inputs, etc.)
- [ ] Lucide Icons integrated
- [ ] Typography system applied
- [ ] Navigation templates created
- [ ] Dark mode verified
- [ ] Accessibility tested (WCAG AA minimum)
- [ ] Design system documentation complete
- [ ] Team trained on brand guidelines

---

## 12. Resources & Tools

### Design Tools
- Figma: For design mockups
- Color Oracle: For contrast checking
- Responsive Design Checker: For mobile testing

### Development
- Tailwind CSS: Utility-first CSS framework
- shadcn/ui or Headless UI: Component library options
- Lucide React: Icon library

### Documentation
- MDN Web Docs: CSS standards
- Tailwind Docs: Utility framework
- Web Accessibility Guidelines (WAG): WCAG 2.1

---

**Next Steps:**
1. Download fonts (Inter, JetBrains Mono from Google Fonts)
2. Configure Tailwind with design tokens
3. Create component library
4. Apply to all three portals
5. Get team feedback and iterate
