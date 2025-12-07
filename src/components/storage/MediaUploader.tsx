/**
 * Media Uploader Component
 * Handles file uploads with hybrid storage routing
 * Shows upload progress, storage routing decision, and encryption status
 */

import { useState, useRef } from 'react';
import { useStorageStore } from '../../lib/storageStore';
import { Upload, Lock, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MediaUploaderProps {
  onUploadComplete?: (mediaId: string) => void;
  onError?: (error: string) => void;
  maxSize?: number; // bytes
  acceptedTypes?: string[];
  showStorageRoute?: boolean;
}

export function MediaUploader({
  onUploadComplete,
  onError,
  maxSize = 500 * 1024 * 1024, // 500MB default
  acceptedTypes = ['image/*', 'video/*', 'audio/*'],
  showStorageRoute = true,
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const storageStore = useStorageStore();
  const uploads = Array.from(storageStore.uploads.values());

  const handleFileSelect = async (file: File) => {
    // Validate file size
    if (file.size > maxSize) {
      const errorMsg = `File size exceeds ${maxSize / 1024 / 1024}MB limit`;
      onError?.(errorMsg);
      return;
    }

    // Start upload
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      await storageStore.startUpload(file, mediaId);
      onUploadComplete?.(mediaId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMsg);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-background hover:border-primary/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={false}
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="space-y-3 w-full"
        >
          <Upload className="mx-auto h-8 w-8 text-text-muted" />
          <div>
            <p className="text-base font-medium text-text">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-text-muted mt-1">
              Max size: {maxSize / 1024 / 1024}MB
            </p>
          </div>
        </button>
      </motion.div>

      {/* Active Uploads */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Uploads</h3>
          {uploads.map((upload) => (
            <motion.div
              key={upload.mediaId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text truncate">
                  {upload.fileName}
                </span>
                {upload.status === 'completed' && (
                  <CheckCircle className="h-5 w-5 text-success" />
                )}
                {upload.status === 'failed' && (
                  <AlertCircle className="h-5 w-5 text-error" />
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-primary to-info h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${upload.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Status Text */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  {upload.status === 'uploading' && `Uploading... ${upload.progress}%`}
                  {upload.status === 'completed' && 'Upload complete'}
                  {upload.status === 'failed' && `Failed: ${upload.error}`}
                </span>
                <div className="flex items-center gap-1 text-text-muted">
                  <Lock className="h-3 w-3" />
                  <span>Encrypted</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Storage Information */}
      {showStorageRoute && storageStore.initialized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-info/5 border border-info/20 rounded-lg p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-info" />
            <p className="text-sm font-medium text-text">Smart Storage Routing</p>
          </div>

          <ul className="text-xs text-text-muted space-y-1 ml-6">
            <li>✓ Files encrypted locally (AES-256-GCM)</li>
            <li>✓ Stored on your device first (fast access)</li>
            <li>✓ Shared with peers if available (P2P)</li>
            <li>✓ Backed up to IPFS (resilience)</li>
            <li>✓ Cost: $0 forever</li>
          </ul>
        </motion.div>
      )}
    </div>
  );
}
