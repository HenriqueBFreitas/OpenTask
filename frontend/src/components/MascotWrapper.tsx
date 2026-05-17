'use client';
import { usePathname } from 'next/navigation';
import Mascot from '@/components/Mascot';

export default function MascotWrapper() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return <Mascot />;
}