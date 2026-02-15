'use client';

/**
 * Signature Form Component
 * Create/edit email signatures with TipTap rich text editor
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import { useSignature } from '@/hooks/use-signature';
import type { Signature } from '@/types/database';
import { Save, X } from 'lucide-react';

export interface SignatureFormProps {
  // Signature to edit (undefined for new signature)
  signature?: Signature;
  // Email account ID to associate with signature
  accountId?: string;
  // Callback on successful save
  onSave?: (signature: Signature) => void;
  // Callback on cancel
  onCancel?: () => void;
}

export function SignatureForm({
  signature,
  accountId,
  onSave,
  onCancel,
}: SignatureFormProps) {
  const [name, setName] = useState(signature?.name || '');
  const [isDefault, setIsDefault] = useState(signature?.is_default || false);
  const [saving, setSaving] = useState(false);

  const { createSignature, updateSignature } = useSignature({ accountId });

  const editor = useEditor({
    extensions: [StarterKit],
    content: signature?.content_html || '<p>Your signature here...</p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[200px] p-4 border rounded-md',
      },
    },
  });

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Signature name is required');
      return;
    }

    if (!editor) {
      toast.error('Editor not initialized');
      return;
    }

    const content_html = editor.getHTML();
    const content_text = editor.getText();

    setSaving(true);

    try {
      if (signature) {
        // Update existing signature
        await updateSignature({
          id: signature.id,
          name,
          content_html,
          content_text,
          is_default: isDefault,
        });
        toast.success('Signature updated successfully');
      } else {
        // Create new signature
        await createSignature({
          name,
          content_html,
          content_text,
          email_account_id: accountId,
          is_default: isDefault,
        });
        toast.success('Signature created successfully');
      }

      // Clear form
      setName('');
      setIsDefault(false);
      editor?.commands.setContent('<p>Your signature here...</p>');

      onSave?.(signature!);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save signature'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {signature ? 'Edit Signature' : 'New Signature'}
          </h3>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Name field */}
        <div className="space-y-2">
          <Label htmlFor="signature-name">Signature Name</Label>
          <Input
            id="signature-name"
            placeholder="e.g., Work, Personal, Formal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Rich text editor */}
        <div className="space-y-2">
          <Label>Signature Content</Label>
          <div className="border rounded-md">
            <EditorContent editor={editor} />
          </div>
          <p className="text-xs text-gray-500">
            Use the editor to format your signature with bold, italic, lists, etc.
          </p>
        </div>

        {/* Default checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is-default"
            checked={isDefault}
            onCheckedChange={(checked) => setIsDefault(checked as boolean)}
          />
          <Label
            htmlFor="is-default"
            className="text-sm font-normal cursor-pointer"
          >
            Set as default signature
          </Label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Signature'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
