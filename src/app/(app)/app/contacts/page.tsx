/**
 * Contacts Page
 */

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/empty-state';
import { Users } from 'lucide-react';

export default async function ContactsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contacts } = user
    ? await supabase.from('contacts').select('*').eq('user_id', user.id).order('name', { ascending: true })
    : { data: null };

  return (
    <div className="p-8">
      <PageHeader title="Contacts" description="Manage your email contacts" />

      {contacts && contacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact: any) => (
            <Card key={contact.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact.avatar_url || undefined} />
                  <AvatarFallback>
                    {contact.name?.[0]?.toUpperCase() || contact.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{contact.name || 'Unnamed'}</div>
                  <div className="text-sm text-muted-foreground truncate">{contact.email}</div>
                  {contact.company && (
                    <div className="text-xs text-muted-foreground mt-1">{contact.company}</div>
                  )}
                  <div className="flex gap-2 mt-2">
                    {contact.is_favorite && <Badge variant="secondary">Favorite</Badge>}
                    {contact.is_priority_sender && <Badge variant="default">Priority</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No contacts yet"
            description="Contacts will appear here as you communicate with people"
          />
        </Card>
      )}
    </div>
  );
}
