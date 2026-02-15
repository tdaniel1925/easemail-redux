/**
 * ReplyComposer Component
 * Pre-filled composer for replying to emails
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { X, Send } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import type { Message } from '@/types/message';
import { quoteEmailBodyHtml } from '@/lib/utils/email-quote';
import { buildReplySubject } from '@/lib/utils/email-headers';
import { SignatureSelector } from '@/components/email/signature-selector';
import { useSignature } from '@/hooks/use-signature';
import type { Signature } from '@/types/database';

interface ReplyComposerProps {
  originalEmail: Message;
  mode: 'reply' | 'replyAll' | 'forward';
  onClose: () => void;
  onSent?: () => void;
}

export function ReplyComposer({
  originalEmail,
  mode,
  onClose,
  onSent,
}: ReplyComposerProps) {
  const [sending, setSending] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);

  // Load signatures for the email account
  const { defaultSignature } = useSignature({
    accountId: originalEmail.email_account_id,
    autoSelectDefault: true,
  });

  // Build the subject line
  const subject =
    mode === 'forward'
      ? `Fwd: ${originalEmail.subject || '(no subject)'}`
      : buildReplySubject(originalEmail.subject || '(no subject)');

  // Build recipient info
  const toRecipient =
    mode === 'reply'
      ? originalEmail.from_name || originalEmail.from_email
      : 'All recipients';

  // Initialize editor with quoted original message
  const quotedBody = quoteEmailBodyHtml(
    originalEmail.body_html || originalEmail.body_text || '',
    originalEmail.from_name || originalEmail.from_email,
    originalEmail.message_date
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: `<p><br/></p>${quotedBody}`,
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  // Auto-select default signature
  useEffect(() => {
    if (defaultSignature && !selectedSignature) {
      setSelectedSignature(defaultSignature);
    }
  }, [defaultSignature, selectedSignature]);

  // Insert signature into editor when signature changes
  useEffect(() => {
    if (editor && selectedSignature) {
      // Get current content
      const currentContent = editor.getHTML();

      // Split at the quoted section (starts with <div or <blockquote)
      const quotedSectionMatch = currentContent.match(/(<(?:div|blockquote)[^>]*class="[^"]*(?:gmail_quote|quoted)[^"]*"[\s\S]*)/);
      const beforeQuote = quotedSectionMatch
        ? currentContent.substring(0, quotedSectionMatch.index)
        : currentContent;
      const quotedSection = quotedSectionMatch ? quotedSectionMatch[1] : '';

      // Remove any existing signature from before the quote
      const contentWithoutSignature = beforeQuote.replace(
        /<div class="signature">[\s\S]*?<\/div>/g,
        ''
      );

      // Add signature before the quoted section
      const signatureHtml = `<div class="signature"><br/><br/>--<br/>${selectedSignature.content_html}</div>`;
      const newContent = contentWithoutSignature + signatureHtml + quotedSection;

      // Update editor content
      editor.commands.setContent(newContent);
    }
  }, [selectedSignature, editor]);

  const handleSend = async () => {
    if (!editor) return;

    const bodyHtml = editor.getHTML();

    // Basic validation - check if user typed something
    const userContent = bodyHtml.split('<div')[0]; // Get content before quoted section
    if (!userContent || userContent.trim() === '<p><br/></p>' || userContent.trim() === '<p></p>') {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);

    try {
      let endpoint = '/api/emails/reply';
      if (mode === 'replyAll') {
        endpoint = '/api/emails/reply-all';
      } else if (mode === 'forward') {
        endpoint = '/api/emails/forward';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: originalEmail.id,
          body_html: bodyHtml,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send');
      }

      toast.success(
        mode === 'reply'
          ? 'Reply sent'
          : mode === 'replyAll'
          ? 'Reply sent to all'
          : 'Email forwarded'
      );

      if (onSent) {
        onSent();
      }

      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="fixed inset-4 z-50 flex flex-col bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">
            {mode === 'reply' && 'Reply'}
            {mode === 'replyAll' && 'Reply All'}
            {mode === 'forward' && 'Forward'}
          </h2>
          <p className="text-sm text-muted-foreground">To: {toRecipient}</p>
          <p className="text-sm text-muted-foreground">{subject}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="rounded-md border">
            <EditorContent editor={editor} />
          </div>

          {/* Signature Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Signature:</Label>
            <SignatureSelector
              accountId={originalEmail.email_account_id}
              value={selectedSignature?.id || null}
              onChange={setSelectedSignature}
              allowNone={true}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t p-4">
        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Discard
        </Button>
      </div>
    </Card>
  );
}
