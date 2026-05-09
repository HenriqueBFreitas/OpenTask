'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    const token = document.cookie.includes('access=');
    router.push(token ? '/dashboard' : '/login');
  }, []);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', color: '#a09d97' }}>
      Autenticando...
    </div>
  );
}