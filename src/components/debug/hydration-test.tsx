'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * DIAGNOSTIC COMPONENT - TEST IF REACT IS HYDRATING AND CLICKS WORK
 * This will help us determine if the entire React app is broken or just specific components
 */
export function HydrationTest() {
  const [hydrated, setHydrated] = useState(false);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    console.log('🔬 HYDRATION TEST: React has hydrated!');
    setHydrated(true);
  }, []);

  const handleClick = () => {
    console.log('🔬 HYDRATION TEST: Button clicked!');
    setClicks(c => c + 1);
    alert(`HYDRATION TEST: Click #${clicks + 1} WORKS!`);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] p-4 bg-red-500 text-white rounded-lg shadow-2xl border-4 border-white">
      <div className="text-xs font-bold mb-2">DIAGNOSTIC TEST</div>
      <div className="text-xs mb-2">Hydrated: {hydrated ? '✅ YES' : '❌ NO'}</div>
      <div className="text-xs mb-2">Clicks: {clicks}</div>
      <Button
        onClick={handleClick}
        className="bg-white text-red-500 hover:bg-gray-100 font-bold"
        size="sm"
      >
        TEST CLICK
      </Button>
    </div>
  );
}
