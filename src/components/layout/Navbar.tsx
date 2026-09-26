'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { signOut, signIn } from 'next-auth/react';
import type { Session } from 'next-auth';

interface NavLink { label: string; href: string; }

const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Locations', href: '/locations' },
  { label: 'How to Vote', href: '/how-to-vote' },
  { label: 'Election Info', href: '/election-info' },
  { label: 'About', href: '/about' },
];

interface NavbarProps {
  user: Session['user'] | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 backdrop-blur-md bg-black/60 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-white font-bold text-xl tracking-tight hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
          >
            Ballotbox
          </Link>

          {/* Desktop nav links + auth */}
          <div className="hidden md:flex items-center gap-6">
            <ul className="flex items-center gap-6">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded px-1 py-1"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {user ? (
              <div className="flex items-center gap-3">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? 'User avatar'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-white text-xs font-bold">
                    {user.name?.[0] ?? '?'}
                  </div>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="text-sm font-medium text-white bg-brand-accent px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign in
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className={clsx(
              'md:hidden inline-flex items-center justify-center rounded-md text-gray-300 hover:text-white',
              'min-h-[48px] min-w-[48px]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              'transition-colors'
            )}
          >
            {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-white/10 bg-black/80 backdrop-blur-md">
          <ul className="flex flex-col px-4 py-3 gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    'block text-sm text-gray-300 hover:text-white transition-colors',
                    'min-h-[48px] flex items-center',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded px-1'
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="pt-2 border-t border-white/10 mt-1">
              {user ? (
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-sm text-gray-400 hover:text-white min-h-[48px] flex items-center"
                >
                  Sign out ({user.name})
                </button>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="text-sm font-medium text-white min-h-[48px] flex items-center"
                >
                  Sign in with Google
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
