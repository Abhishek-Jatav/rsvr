'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);
  return <p className="p-8 text-center text-ink-muted" role="status">Loading…</p>;
}
