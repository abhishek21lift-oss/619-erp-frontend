'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/nav-config';

interface SidebarItemProps {
  item: NavItem;
}

export default function SidebarItem({ item }: SidebarItemProps) {
  const pathname = usePathname();
  const active = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
        active ? 'bg-black text-white' : 'hover:bg-gray-100'
      }`}
    >
      <span>{item.label}</span>
    </Link>
  );
}
