'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * ROUTER DIAGNOSTIC - Test if Next.js router is working
 */
export function RouterDiagnostic() {
  const router = useRouter();
  const pathname = usePathname();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Check if router and pathname are available
    const results: string[] = [];
    results.push(`Router available: ${router ? 'YES' : 'NO'}`);
    results.push(`Pathname: ${pathname || 'NONE'}`);
    results.push(`useRouter type: ${typeof router}`);
    results.push(`router.push type: ${typeof router?.push}`);
    setTestResults(results);

    // Listen for unhandled errors
    const errorHandler = (event: ErrorEvent) => {
      setErrors(prev => [...prev, `ERROR: ${event.message}`]);
    };
    window.addEventListener('error', errorHandler);

    return () => window.removeEventListener('error', errorHandler);
  }, [router, pathname]);

  const testRouterPush = () => {
    console.log('🧪 ROUTER TEST: Testing router.push()');
    try {
      router.push('/app/sent');
      setTestResults(prev => [...prev, '✅ router.push() called successfully']);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setTestResults(prev => [...prev, `❌ router.push() error: ${msg}`]);
      console.error('🧪 ROUTER TEST ERROR:', error);
    }
  };

  const testWindowLocation = () => {
    console.log('🧪 ROUTER TEST: Testing window.location.href');
    try {
      window.location.href = '/app/drafts';
      setTestResults(prev => [...prev, '✅ window.location navigation initiated']);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setTestResults(prev => [...prev, `❌ window.location error: ${msg}`]);
      console.error('🧪 ROUTER TEST ERROR:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] p-4 bg-purple-600 text-white rounded-lg shadow-2xl border-4 border-white max-w-md max-h-[80vh] overflow-auto">
      <div className="text-xs font-bold mb-2">ROUTER DIAGNOSTIC</div>

      <div className="text-xs space-y-1 mb-3">
        {testResults.map((result, i) => (
          <div key={i}>{result}</div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="text-xs space-y-1 mb-3 bg-red-700 p-2 rounded">
          <div className="font-bold">ERRORS:</div>
          {errors.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          onClick={testRouterPush}
          className="bg-white text-purple-600 hover:bg-gray-100 font-bold"
          size="sm"
        >
          Test router.push()
        </Button>
        <Button
          onClick={testWindowLocation}
          className="bg-white text-purple-600 hover:bg-gray-100 font-bold"
          size="sm"
        >
          Test window.location
        </Button>
      </div>
    </div>
  );
}
