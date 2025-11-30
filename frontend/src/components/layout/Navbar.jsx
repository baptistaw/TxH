// src/components/layout/Navbar.jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import GlobalSearch from '@/components/search/GlobalSearch';

export default function Navbar() {
  const { user, isSignedIn } = useAuth();
  const { name: orgName, logoUrl: orgLogoUrl } = useOrganization();
  const pathname = usePathname();

  const navLinks = [
    { href: '/patients', label: 'Pacientes' },
    { href: '/cases', label: 'Casos' },
  ];

  // Estilos para componentes de Clerk (tema oscuro)
  const clerkAppearance = {
    elements: {
      userButtonBox: 'flex items-center',
      userButtonTrigger: 'focus:shadow-none',
      userButtonAvatarBox: 'w-10 h-10',
      userButtonPopoverCard: 'bg-dark-600 border-dark-400',
      userButtonPopoverActionButton: 'text-gray-300 hover:bg-dark-500',
      userButtonPopoverActionButtonText: 'text-gray-300',
      userButtonPopoverFooter: 'hidden',
    },
  };

  return (
    <nav className="bg-dark-600 border-b border-dark-400 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Organización y navegación */}
          <div className="flex items-center gap-4">
            {/* Logo de la organización */}
            <Link href="/" className="flex items-center gap-3">
              <img
                src={orgLogoUrl}
                alt={orgName}
                className="w-10 h-10 rounded-lg object-cover shadow-glow"
              />
              <div>
                <h1 className="text-lg font-bold text-surgical-400">
                  {orgName}
                </h1>
                <p className="text-xs text-gray-500">
                  Sistema Anestesiológico
                </p>
              </div>
            </Link>

            {/* Navigation links */}
            <div className="hidden md:flex items-center gap-2 ml-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-surgical-500 text-white shadow-glow'
                      : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Global Search */}
            {isSignedIn && <GlobalSearch />}
          </div>

          {/* User menu con Clerk */}
          {isSignedIn && (
            <div className="flex items-center gap-4">
              {/* Info del rol */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-300">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>

              {/* UserButton de Clerk */}
              <UserButton
                appearance={clerkAppearance}
                afterSignOutUrl="/sign-in"
                userProfileMode="navigation"
                userProfileUrl="/profile"
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-dark-400 px-4 py-2">
        <div className="flex gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                pathname === link.href
                  ? 'bg-surgical-500 text-white'
                  : 'text-gray-300 hover:bg-dark-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
