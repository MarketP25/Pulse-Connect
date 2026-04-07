#!/bin/bash

# BRANDING IMPLEMENTATION SETUP SCRIPT
# This script installs all required dependencies for the PULSCO branding system

echo "🚀 Pulsco Branding System Setup"
echo "================================"

# Install Lucide React icons in all portals
echo ""
echo "📦 Installing Lucide React icons..."

pnpm add lucide-react

# Optional: Install UI library components (choose one)
echo ""
echo "📦 Installing UI component libraries..."

# Install clsx for conditional classnames
pnpm add clsx

# Install classnames (alternative)
pnpm add classnames

echo ""
echo "✅ Installation Complete!"
echo ""
echo "Next Steps:"
echo "1. Import design tokens CSS in your app:"
echo "   @import '../../styles/design-tokens.css';"
echo "   @import '../../styles/tailwind.css';"
echo ""
echo "2. Add to your portals:'
pnpm add @pulsco/ui-components
echo ""
echo "3. Start using components:"
echo "   import { Button, Card } from '@pulsco/ui-components';"
echo ""
echo "4. Use Lucide icons:"
echo "   import { Menu, Settings, Bell } from 'lucide-react';"
echo ""
echo "📚 See BRANDING_GUIDE.md for complete implementation details"
