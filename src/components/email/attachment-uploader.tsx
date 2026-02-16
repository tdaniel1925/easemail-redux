'use client';

/**
 * AttachmentUploader Component
 *
 * Drag-and-drop zone and file picker for uploading email attachments
 */

import { useCallback, useRef, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AttachmentUploaderProps {
  /** Callback when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Whether upload is in progress */
  isUploading?: boolean;
  /** Whether max attachments limit reached */
  disabled?: boolean;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Maximum number of attachments */
  maxAttachments?: number;
  /** Custom class name */
  className?: string;
}

export function AttachmentUploader({
  onFilesSelected,
  isUploading = false,
  disabled = false,
  maxFileSize = 50 * 1024 * 1024, // 50 MB
  maxAttachments = 10,
  className,
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle file selection via input
   */
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      // Validate files
      const validFiles = files.filter((file) => {
        if (file.size > maxFileSize) {
          setError(`File "${file.name}" exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)} MB limit`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setError(null);
        onFilesSelected(validFiles);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [maxFileSize, onFilesSelected]
  );

  /**
   * Handle drag and drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = Array.from(e.dataTransfer.files);

      // Validate files
      const validFiles = files.filter((file) => {
        if (file.size > maxFileSize) {
          setError(`File "${file.name}" exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)} MB limit`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setError(null);
        onFilesSelected(validFiles);
      }
    },
    [disabled, isUploading, maxFileSize, onFilesSelected]
  );

  /**
   * Trigger file input click
   */
  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Drag and drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragging && 'border-blue-500 bg-blue-50 dark:bg-blue-950',
          !isDragging && 'border-gray-300 hover:border-gray-400 dark:border-gray-700',
          (disabled || isUploading) && 'cursor-not-allowed opacity-50'
        )}
      >
        <Upload className="mb-2 h-8 w-8 text-gray-400" />
        <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Max {(maxFileSize / 1024 / 1024).toFixed(0)} MB per file, up to {maxAttachments} files
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          disabled={disabled || isUploading}
          className="hidden"
          accept="*/*"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Alternative: Button trigger */}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={disabled || isUploading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Choose Files'}
        </Button>
      </div>
    </div>
  );
}
