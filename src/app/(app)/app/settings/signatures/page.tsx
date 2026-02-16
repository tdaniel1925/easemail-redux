'use client';

/**
 * Signature Management Page
 * Allows users to create, edit, and delete email signatures
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SignatureForm } from '@/components/settings/signature-form';
import { useSignature } from '@/hooks/use-signature';
import { useAccount } from '@/hooks/use-account';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { Signature } from '@/types/database';

export default function SignaturesPage() {
  const { selectedAccountId } = useAccount();
  const [showForm, setShowForm] = useState(false);
  const [editingSignature, setEditingSignature] = useState<Signature | undefined>(undefined);

  const {
    signatures,
    isLoading,
    deleteSignature,
    setDefaultSignature,
    isDeleting,
  } = useSignature({
    accountId: selectedAccountId || undefined,
    autoSelectDefault: false,
  });

  const handleEdit = (signature: Signature) => {
    setEditingSignature(signature);
    setShowForm(true);
  };

  const handleDelete = async (signatureId: string) => {
    if (!confirm('Are you sure you want to delete this signature?')) {
      return;
    }

    try {
      await deleteSignature(signatureId);
      toast.success('Signature deleted');
    } catch (error) {
      toast.error('Failed to delete signature');
    }
  };

  const handleSetDefault = async (signatureId: string) => {
    try {
      await setDefaultSignature(signatureId);
      toast.success('Default signature updated');
    } catch (error) {
      toast.error('Failed to set default signature');
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingSignature(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingSignature(undefined);
  };

  const handleNewSignature = () => {
    setEditingSignature(undefined);
    setShowForm(true);
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Signatures</h1>
            <p className="text-muted-foreground mt-1">
              Manage your email signatures for professional communication
            </p>
          </div>
          {!showForm && (
            <Button onClick={handleNewSignature}>
              <Plus className="h-4 w-4 mr-2" />
              New Signature
            </Button>
          )}
        </div>

        {/* Signature Form */}
        {showForm && (
          <SignatureForm
            signature={editingSignature}
            accountId={selectedAccountId || undefined}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        )}

        {/* Signatures List */}
        {!showForm && (
          <div className="space-y-4">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading signatures...
              </div>
            )}

            {!isLoading && signatures.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t created any signatures yet
                </p>
                <Button onClick={handleNewSignature}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Signature
                </Button>
              </Card>
            )}

            {!isLoading && signatures.length > 0 && (
              <div className="grid gap-4">
                {signatures.map((signature) => (
                  <Card key={signature.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{signature.name}</h3>
                          {signature.is_default && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                              <Star className="h-3 w-3" />
                              Default
                            </span>
                          )}
                        </div>
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: signature.content_html }}
                        />
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {!signature.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSetDefault(signature.id)}
                            title="Set as default"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(signature)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(signature.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
