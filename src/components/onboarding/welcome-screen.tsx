'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, Sparkles, Zap, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function WelcomeScreen() {
  const router = useRouter();

  const features = [
    {
      icon: <Mail className="h-8 w-8 text-primary" />,
      title: 'Smart Inbox',
      description: 'Automatically organized by priority, people, newsletters, and more',
    },
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: 'AI-Powered Features',
      description: 'Smart compose, email remix, voice dictation, and event extraction',
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: 'Real-Time Sync',
      description: 'Instant updates across all devices with live notifications',
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: 'Privacy First',
      description: 'Your data stays yours - no tracking, full control',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <Card className="max-w-4xl p-8 md:p-12">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Welcome to EaseMail</h1>
          <p className="text-base md:text-lg text-muted-foreground mb-8 md:mb-12">
            The smartest way to manage your email
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 md:mb-12 text-left">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold mb-1 text-base">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => router.push('/app/settings/accounts')}
              className="w-full sm:w-auto"
            >
              Connect Your Email
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/app/inbox')}
              className="w-full sm:w-auto"
            >
              Explore Without Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
