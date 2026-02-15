'use client';

/**
 * Email Composer Component
 * Rich text email composition with TipTap, auto-save, and send functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { X, Send, Save } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';

interface ComposerProps {
  onClose: () => void;
  onSend?: (data: EmailData) => Promise<void>;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  replyTo?: string;
}

export interface EmailData {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
}

export function EmailComposer({
  onClose,
  onSend,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
}: ComposerProps) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultBody || '<p>Write your email here...</p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (editor && (to || subject || editor.getHTML() !== '<p></p>')) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [to, subject, editor]);

  const saveDraft = useCallback(async () => {
    if (!editor) return;

    try {
      // TODO: Call draft save server action
      console.warn('Auto-saving draft...');
      toast.success('Draft saved');
    } catch (error) {
      console.error('Draft save failed:', error);
    }
  }, [editor]);

  const handleSend = async () => {
    if (!editor) return;

    const toEmails = to.split(',').map((e) => e.trim()).filter(Boolean);
    const ccEmails = cc.split(',').map((e) => e.trim()).filter(Boolean);
    const bccEmails = bcc.split(',').map((e) => e.trim()).filter(Boolean);

    if (toEmails.length === 0) {
      toast.error('Please enter at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    setSending(true);

    try {
      const emailData: EmailData = {
        to: toEmails,
        cc: ccEmails,
        bcc: bccEmails,
        subject: subject.trim(),
        body_html: editor.getHTML(),
      };

      if (onSend) {
        await onSend(emailData);
      }

      toast.success('Email sent successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="fixed inset-4 z-50 flex flex-col bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">New Message</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          {/* To Field */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="to" className="min-w-[60px]">
                To:
              </Label>
              <Input
                id="to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(!showCc)}
              >
                Cc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(!showBcc)}
              >
                Bcc
              </Button>
            </div>
          </div>

          {/* Cc Field */}
          {showCc && (
            <div className="flex items-center gap-2">
              <Label htmlFor="cc" className="min-w-[60px]">
                Cc:
              </Label>
              <Input
                id="cc"
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1"
              />
            </div>
          )}

          {/* Bcc Field */}
          {showBcc && (
            <div className="flex items-center gap-2">
              <Label htmlFor="bcc" className="min-w-[60px]">
                Bcc:
              </Label>
              <Input
                id="bcc"
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="flex-1"
              />
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center gap-2">
            <Label htmlFor="subject" className="min-w-[60px]">
              Subject:
            </Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1"
            />
          </div>

          {/* Editor */}
          <div className="rounded-md border">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t p-4">
        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
          <Button variant="outline" onClick={saveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Discard
        </Button>
      </div>
    </Card>
  );
}
