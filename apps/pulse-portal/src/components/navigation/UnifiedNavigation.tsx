"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon?: ReactNode;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Analytics", href: "/analytics" },
  { label: "Governance", href: "/governance" },
  { label: "Settings", href: "/settings" },
  { label: "Legal", href: "/legal" },
  { label: "Terms", href: "/terms" }
];

export function UnifiedNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 xs:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 xxs:h-14 xs:h-16">
            <div className="flex items-center">
              <Link href="/" className="text-lg xxs:text-xl font-bold text-white">
                PULSCO
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-2 xxs:space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-gray-300 hover:text-white hover:bg-purple-600/20 px-2 xxs:px-3 py-2 rounded-md text-xs xxs:text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden inline-flex items-center justify-center w-8 h-8 xxs:w-10 xxs:h-10 rounded-md text-gray-300 hover:text-white hover:bg-purple-600/20 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Desktop notifications */}
            <div className="hidden md:flex items-center space-x-4">
              <button className="text-gray-300 hover:text-white" type="button">
                <span className="sr-only">Notifications</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-12 xxs:top-14 xs:top-16 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-purple-500/30">
          <div className="px-3 xxs:px-4 xs:px-6 py-3 xxs:py-4">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-300 hover:text-white hover:bg-purple-600/20 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-purple-500/30 pt-2 mt-2">
                <button
                  className="text-gray-300 hover:text-white w-full text-left px-3 py-2"
                  type="button"
                >
                  <span className="sr-only">Notifications</span>
                  <span className="flex items-center">
                    <svg
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    Notifications
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UnifiedNavigation;
