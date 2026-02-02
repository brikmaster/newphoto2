'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

export interface LocalPhoto {
  id: string;
  file: File;
  preview: string;
  description: string;
  type: 'photo' | 'video';
  teamSelection: 'home' | 'away' | 'none' | '';
  status: 'pending' | 'ready';
}

interface LocalPhotoUploaderProps {
  userId: string;
  gameId: number;
  gameName: string;
  onPhotosReady: (photos: LocalPhoto[]) => void;
  maxPhotos?: number;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function LocalPhotoUploader({
  userId,
  gameId,
  gameName,
  onPhotosReady,
  maxPhotos = 10,
}: LocalPhotoUploaderProps) {
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);

    // Check photo limit
    const remainingSlots = maxPhotos - photos.length;
    if (acceptedFiles.length > remainingSlots) {
      if (remainingSlots === 0) {
        setError(`Maximum ${maxPhotos} photos allowed. Remove some photos to add more.`);
        return;
      }
      setError(`Only ${remainingSlots} more photo(s) allowed. First ${remainingSlots} files were added.`);
      acceptedFiles = acceptedFiles.slice(0, remainingSlots);
    }

    const newPhotos: LocalPhoto[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      description: '',
      type: file.type.startsWith('video/') ? 'video' as const : 'photo' as const,
      teamSelection: '',
      status: 'pending',
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  }, [photos.length, maxPhotos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/mp4': ['.mp4']
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: photos.length >= maxPhotos,
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map(({ file, errors }) => {
        if (errors.some(e => e.code === 'file-too-large')) {
          return `${file.name} is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`;
        }
        if (errors.some(e => e.code === 'file-invalid-type')) {
          return `${file.name} is not a valid image or video file`;
        }
        return `${file.name} was rejected`;
      });
      setError(errors.join(', '));
    }
  });

  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo?.preview) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
    });
    setError(null);
  }, []);

  const clearAll = useCallback(() => {
    photos.forEach(photo => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setPhotos([]);
    setError(null);
  }, [photos]);

  const handleContinue = useCallback(() => {
    if (photos.length > 0) {
      onPhotosReady(photos);
    }
  }, [photos, onPhotosReady]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#1b95e5] mb-4">
          Select Photos
        </h1>
        <div className="bg-blue-50 rounded-lg p-4 inline-block">
          <p className="text-[#1b95e5] font-medium">
            Game: <span className="font-bold">{gameName || `Game ${gameId}`}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Photos will be posted directly to ScoreStream
          </p>
        </div>
      </div>

      {/* Photo Limit Info */}
      <div className="mb-4 text-center">
        <span className={`text-lg font-semibold ${photos.length >= maxPhotos ? 'text-red-600' : 'text-[#1b95e5]'}`}>
          {photos.length} / {maxPhotos} photos selected
        </span>
        {photos.length >= maxPhotos && (
          <p className="text-sm text-red-600 mt-1">
            Maximum photos reached. Remove some to add more.
          </p>
        )}
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          photos.length >= maxPhotos
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : isDragActive
            ? 'border-[#1b95e5] bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {photos.length >= maxPhotos
                ? 'Maximum photos reached'
                : isDragActive
                ? 'Drop photos here'
                : 'Drag & drop photos here'}
            </p>
            {photos.length < maxPhotos && (
              <p className="text-sm text-gray-500 mt-1">
                or click to select files
              </p>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Supports JPG, PNG, GIF, WebP, MP4 | Max 10MB per file | Max {maxPhotos} files
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Selected Photos ({photos.length})
            </h3>
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                {photo.type === 'video' ? (
                  <video
                    src={photo.preview}
                    className="w-full h-32 object-cover rounded-lg"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={photo.preview}
                    alt={photo.file.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                  {photo.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continue Button */}
      {photos.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
          >
            Continue to Edit ({photos.length} photos)
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Add descriptions and select team before posting
          </p>
        </div>
      )}

      {/* Stats */}
      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-[#1b95e5]">{photos.length}</p>
            <p className="text-sm text-gray-600">Photos Selected</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600">
              {Math.round(photos.reduce((acc, p) => acc + p.file.size, 0) / 1024 / 1024 * 10) / 10} MB
            </p>
            <p className="text-sm text-gray-600">Total Size</p>
          </div>
        </div>
      )}
    </div>
  );
}
