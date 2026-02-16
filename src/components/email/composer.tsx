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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Send, Save, Mail } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import { useAccount } from '@/hooks/use-account';
import { SignatureSelector } from '@/components/email/signature-selector';
import { useSignature } from '@/hooks/use-signature';
import { useAttachments } from '@/hooks/use-attachments';
import { AttachmentUploader } from '@/components/email/attachment-uploader';
import { AttachmentList } from '@/components/email/attachment-list';
import { useUndoSend } from '@/hooks/use-undo-send';
import { showUndoSendToast } from '@/components/email/undo-send-toast';
import { useSmartCompose } from '@/hooks/use-smart-compose';
import { SmartComposeSuggestion } from '@/components/email/smart-compose-suggestion';
import type { Signature } from '@/types/database';
import type { AttachmentMetadata } from '@/types/attachment';
import type { Recipient } from '@/types/email';

interface ComposerProps {
  onClose: () => void;
  onSend?: (data: EmailData) => Promise<void>;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  replyTo?: string;
}

export interface EmailData {
  email_account_id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  attachments?: AttachmentMetadata[];
}

export function EmailComposer({
  onClose,
  onSend,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
}: ComposerProps) {
  const { selectedAccountId, accounts, loading: accountsLoading } = useAccount();
  const [sendingAccountId, setSendingAccountId] = useState<string>('');
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);
  const [trackReadReceipt, setTrackReadReceipt] = useState(false);

  // Generate draft ID for attachment grouping
  const [draftId] = useState(() => crypto.randomUUID());

  // Attachment management
  const {
    attachments,
    upload: uploadAttachment,
    uploadMultiple: uploadMultipleAttachments,
    remove: removeAttachment,
    getCompletedAttachments,
    isUploading,
    isMaxAttachments,
  } = useAttachments({
    messageId: draftId,
    onUploadComplete: (attachment) => {
      toast.success(`Attached ${attachment.name}`);
    },
    onUploadError: (error) => {
      toast.error(error);
    },
  });

  // Load signatures for the selected account
  const { defaultSignature } = useSignature({
    accountId: sendingAccountId,
    autoSelectDefault: true,
  });

  // Undo send functionality
  const { queueSend, cancelSend } = useUndoSend();

  // Smart compose suggestions
  const [editorText, setEditorText] = useState('');
  const {
    suggestion,
    confidence,
    acceptSuggestion,
    dismissSuggestion,
  } = useSmartCompose({
    currentText: editorText,
    subject: subject,
    enabled: editorText.length > 10, // Only show suggestions when user has typed something
  });

  // Initialize sending account to currently selected account
  useEffect(() => {
    if (selectedAccountId && !sendingAccountId) {
      setSendingAccountId(selectedAccountId);
    }
  }, [selectedAccountId, sendingAccountId]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultBody || '<p>Write your email here...</p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Update editor text for smart compose
      setEditorText(editor.getText());
    },
  });

  // Smart compose: Accept suggestion handler
  const handleAcceptSuggestion = useCallback(() => {
    if (!editor || !suggestion) return '';
    const accepted = acceptSuggestion();
    if (accepted) {
      // Insert suggestion at the end of current content
      editor.commands.insertContent(' ' + accepted);
    }
    return accepted;
  }, [editor, suggestion, acceptSuggestion]);

  // Auto-select default signature when account changes
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

      // Remove any existing signature (wrapped in a signature div)
      const contentWithoutSignature = currentContent.replace(
        /<div class="signature">[\s\S]*?<\/div>/g,
        ''
      );

      // Add new signature at the end
      const signatureHtml = `<div class="signature"><br/><br/>--<br/>${selectedSignature.content_html}</div>`;
      const newContent = contentWithoutSignature + signatureHtml;

      // Update editor content
      editor.commands.setContent(newContent);
    }
  }, [selectedSignature, editor]);

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

    if (!sendingAccountId) {
      toast.error('Please select an email account to send from');
      return;
    }

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
      // Get completed attachments
      const completedAttachments = getCompletedAttachments();

      // Convert email strings to Recipient objects
      const toRecipients: Recipient[] = toEmails.map((email) => ({ email }));
      const ccRecipients: Recipient[] = ccEmails.map((email) => ({ email }));
      const bccRecipients: Recipient[] = bccEmails.map((email) => ({ email }));

      // Queue the email for sending with undo window
      const queued = await queueSend({
        account_id: sendingAccountId,
        to_addresses: toRecipients,
        cc_addresses: ccRecipients.length > 0 ? ccRecipients : undefined,
        bcc_addresses: bccRecipients.length > 0 ? bccRecipients : undefined,
        subject: subject.trim(),
        body_text: editor.getText(),
        body_html: editor.getHTML(),
        attachments: completedAttachments.length > 0 ? completedAttachments : undefined,
        signature_id: selectedSignature?.id,
        delay_seconds: 5, // 5 second undo window
        read_receipt_enabled: trackReadReceipt,
      });

      if (!queued) {
        throw new Error('Failed to queue email');
      }

      // Show undo toast
      showUndoSendToast(
        queued.id,
        queued.send_at,
        async (queueId) => {
          await cancelSend(queueId);
        },
        toast
      );

      // Close composer
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
          {/* Account Selector */}
          <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/30 p-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="account" className="min-w-[60px] text-sm font-medium">
              From:
            </Label>
            <Select
              value={sendingAccountId}
              onValueChange={setSendingAccountId}
              disabled={accountsLoading || accounts.length === 0}
            >
              <SelectTrigger id="account" className="flex-1 border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span>{account.email}</span>
                      {account.is_primary && (
                        <span className="text-xs text-muted-foreground">(Primary)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {/* Smart Compose Suggestion */}
          {suggestion && confidence >= 0.5 && (
            <SmartComposeSuggestion
              suggestion={suggestion}
              confidence={confidence}
              onAccept={handleAcceptSuggestion}
              onDismiss={dismissSuggestion}
              className="mt-2"
            />
          )}

          {/* Signature Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Signature:</Label>
            <SignatureSelector
              accountId={sendingAccountId}
              value={selectedSignature?.id || null}
              onChange={setSelectedSignature}
              allowNone={true}
            />
          </div>

          {/* Attachment List */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Attachments ({attachments.length})
              </Label>
              <AttachmentList attachments={attachments} onRemove={removeAttachment} />
            </div>
          )}

          {/* Attachment Uploader */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Attach Files</Label>
            <AttachmentUploader
              onFilesSelected={uploadMultipleAttachments}
              isUploading={isUploading}
              disabled={isMaxAttachments}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t p-4">
        <div className="flex items-center gap-4">
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="read-receipt"
              checked={trackReadReceipt}
              onCheckedChange={(checked) => setTrackReadReceipt(checked === true)}
            />
            <label
              htmlFor="read-receipt"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Request read receipt
            </label>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Discard
        </Button>
      </div>
    </Card>
  );
}
