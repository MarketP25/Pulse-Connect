# 🌍 Pulse Connect

<<<<<<< HEAD
**Pulse Connect** is a full‑stack digital marketing and communication platform built with Next.js, Firebase, and Tailwind CSS. Designed for modern businesses and creators, it delivers intuitive user experiences, real‑time client engagement, and scalable backend services.

---

## 🔥 Features

- 🔐 Firebase Authentication for secure user access  
- ⚡ High‑performance frontend built with Next.js and Turbopack  
- 🎨 Responsive UI powered by Tailwind CSS  
- 🔌 Real‑time database integration with Firestore  
- 🚀 Instant deployment using Vercel and Firebase Hosting  
- 🧠 Modular codebase for efficient feature expansion  
- ♿ Accessibility and responsive design baked into components
=======
Pulse Connect is a celebration-powered, region-aware platform where anyone can list and book garages, rooms, Airbnbs, and more—from Kenya to Berlin. Inspired by the best of **Canva** (joyful creation), **Fiver**(micro-entrepreneurship), and **Upwork** (secure collaboration), Pulse Connect empowers hosts and guests with clarity, trust, and delight.
>>>>>>> origin/feat/permission-system-update

---

## 🚀 Getting Started

<<<<<<< HEAD
These instructions are for developers who want to run Pulse Connect locally for development, testing, or contribution.
=======
To launch the development server:
>>>>>>> origin/feat/permission-system-update

1. Clone the repository  
   ```bash
   git clone https://github.com/MarketP25/Pulse-Connect.git
Navigate to the project folder

bash
cd Pulse-Connect
Install dependencies

bash
npm install
# or
yarn install
# or
pnpm install
Start the development server

bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
<<<<<<< HEAD
Then open http://localhost:3000 in your browser to view the platform. Start iterating by modifying app/page.tsx or the relevant pages; updates will reflect instantly in development.

🎨 Design and Branding
Pulse Connect integrates the Pulse Connect logo across headers, splash screens, and meta tags. The design system is:

✳️ Modular: built with reusable, scalable components

🔁 Responsive: optimized across devices and screen sizes

♿ Accessible: designed to meet accessibility standards

🎯 Brand consistent: every detail echoes Pulse Connect’s identity

📚 Learn More
Next.js Documentation for framework features and APIs

Learn Next.js interactive tutorial for hands‑on guidance

Next.js GitHub for community contributions and issues

🌍 Deployment
Deploy Pulse Connect seamlessly using Vercel or Firebase Hosting. For production best practices, consult the Next.js Deployment Guide and your CI/CD configuration.

📄 License
This project is licensed under the MIT License. You’re welcome to explore, use, and build upon it with proper attribution.
=======
Then visit http://localhost:3000 to preview the app.
Start iterating by modifying src/pages/index.tsx. Updates reflect instantly.

🎨 Design System
Pulse Connect’s design system is:
- ✳️ Modular – built with reusable, scalable components
- 🔁 Responsive – optimized across devices and screen sizes
- ♿ Accessible – meets global accessibility standards
- 🎯 Brand-consistent – every detail echoes Pulse Connect’s identity
- 🎉 Celebratory – milestone badges, confetti, and affirming feedback
Fonts are optimized via Vercel’s font loader, featuring the Geist family.

💸 Payments & Region Awareness
Pulse Connect supports multi-gateway payments:
- Stripe, PayPal, M-Pesa, Paystack
- Region-aware currency conversion
- Metadata-rich, audit-friendly booking flows

🧠 Core Features
- 🖼️ Drag-and-drop listing builder 
- 👤 Host profiles with tiered packages and badges 
- 📩 Custom request flow and escrow logic 
- 🔐 Secure messaging and dispute resolution
- 🌍 Localization: language, currency, county filters
- 🎉 Celebration UX: confetti, toasts, milestone tracking

📚 Learn More
- Next.js Documentation
- Learn Next.js
- Next.js GitHub

🌍 Deployment
Deploy Pulse Connect seamlessly using Vercel, the creators of Next.js.
For best practices, see the Next.js Deployment Guide.

🛠️ Tech Stack
- Frontend: React + Next.js + TypeScript
- Backend: Node.js or Django (flexible)
- Payments: Stripe, PayPal, M-Pesa, Paystack
- Analytics: Plausible + Firebase
- Styling: Tailwind CSS + custom animations
- Testing: Jest + Testing Library

🎯 Vision
Pulse Connect is more than a platform—it’s a movement. Every listing is a business. Every booking is a celebration. Every host is a founder.
>>>>>>> origin/feat/permission-system-update

Code

---

### Optional cleanup before merging other branches
- The feature branch contains IDE and build artifacts (`.idea`, `.vs`, `.vscode`, `.next`, `node_modules`, etc.). If you don’t want those in history, create a cleaned branch from the feature branch, remove those files, commit, and merge the cleaned branch instead. Example:
```powershell
git checkout -b feat/login-ui-clean origin/feat/login-ui
git rm -r --cached --ignore-unmatch .idea .vs .vscode node_modules .next coverage
git commit -m "chore: remove IDE and build artifacts from branch before merge"
git push origin feat/login-ui-clean
# then merge feat/login-ui-clean into main
