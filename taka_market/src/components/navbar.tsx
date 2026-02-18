"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUserProfile } from "@/lib/hooks";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`transition ${
        isActive
          ? "text-green-400 font-medium"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, loading } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-green-400">
              TAKA
            </Link>
            <div className="hidden md:flex gap-6">
              <NavLink href="/markets">Markets</NavLink>
              {user && <NavLink href="/dashboard">Dashboard</NavLink>}
              <NavLink href="/leaderboard">Leaderboard</NavLink>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-20 bg-gray-800 rounded animate-pulse" />
            ) : user ? (
              <>
                {profile && (
                  <span className="text-green-400 font-medium hidden sm:inline">
                    {(profile.tkBalance ?? 0).toFixed(2)} TK
                  </span>
                )}
                <button
                  onClick={() => {
                    signOut(auth).catch(() => {
                      // Sign out failed silently - user can retry
                    });
                  }}
                  className="text-gray-400 hover:text-white text-sm hidden md:inline"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-green-500 hover:bg-green-600 text-black font-medium px-4 py-2 rounded-lg transition"
              >
                Sign In
              </Link>
            )}
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-gray-400 hover:text-white p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-4 space-y-3">
          <Link
            href="/markets"
            className="block text-gray-400 hover:text-white transition"
            onClick={() => setMobileMenuOpen(false)}
          >
            Markets
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="block text-gray-400 hover:text-white transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
          )}
          <Link
            href="/leaderboard"
            className="block text-gray-400 hover:text-white transition"
            onClick={() => setMobileMenuOpen(false)}
          >
            Leaderboard
          </Link>
          {user && profile && (
            <div className="pt-2 border-t border-gray-800">
              <span className="text-green-400 font-medium text-sm">
                {(profile.tkBalance ?? 0).toFixed(2)} TK
              </span>
            </div>
          )}
          {user && (
            <button
              onClick={() => {
                signOut(auth).catch(() => {});
                setMobileMenuOpen(false);
              }}
              className="block text-gray-400 hover:text-white text-sm"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
