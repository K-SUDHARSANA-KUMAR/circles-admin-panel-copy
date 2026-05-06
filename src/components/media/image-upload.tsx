import React, { useRef, useState, useEffect } from 'react';
import { FormItem, FormLabel } from '@/components/ui/form';
import {
  Plus,
  Trash2,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ImageUploadFieldProps = {
  name: string;
  label?: string;
  multiple?: boolean;
  onChange?: (files: File[]) => void;
  onRemove?: (index: number) => void;
  value?: string[];
  className?: string;
  maxImages?: number;
  aspectRatio?: 'square' | 'video' | 'auto';
  placeholder?: string;
  fixedHeight?: string;
  disabled?: boolean;
};

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  name,
  label = 'Upload Images',
  multiple = false,
  onChange,
  onRemove,
  value = [],
  className,
  maxImages = 10,
  aspectRatio = 'auto',
  placeholder = 'Click to upload images or drag and drop',
  fixedHeight = 'h-full',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);

  // Initialize previews from value prop and reset local state when value changes
  useEffect(() => {
    if (value && value.length > 0) {
      setPreviews(value);
      setCurrentIndex(0);
      // If we have external values, clear local files since they're managed externally
      if (!onRemove) {
        setFiles([]);
      }
    } else {
      setPreviews([]);
      setCurrentIndex(0);
      if (!onRemove) {
        setFiles([]);
      }
    }
  }, [value, onRemove]);

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    const validFiles = newFiles.filter((file) =>
      file.type.startsWith('image/')
    );

    if (multiple) {
      if (onRemove) {
        onChange?.(validFiles);
      } else {
        const currentPreviewCount = previews.length;
        const remainingSlots = maxImages - currentPreviewCount;
        const filesToAdd = validFiles.slice(0, remainingSlots);

        // Always append new files to existing ones
        const newFilesList = [...files, ...filesToAdd];
        const newPreviews = [...previews];

        filesToAdd.forEach((file) => {
          newPreviews.push(URL.createObjectURL(file));
        });

        setFiles(newFilesList);
        setPreviews(newPreviews);
        onChange?.(newFilesList);

        // Clear file input value so selecting same file again works
        if (inputRef.current) inputRef.current.value = '';
      }
    } else {
      const file = validFiles[0];
      if (file) {
        if (onRemove) {
          onChange?.([file]);
        } else {
          const url = URL.createObjectURL(file);
          setFiles([file]);
          setPreviews([url]);
          onChange?.([file]);
          if (inputRef.current) inputRef.current.value = '';
        }
      }
    }
  };

  const handleRemove = (idx: number) => {
    if (onRemove) {
      // Use custom removal logic if provided
      onRemove(idx);
      // Reset file input so user can re-upload the same file
      if (inputRef.current) inputRef.current.value = '';
    } else {
      // Default removal logic
      const newFiles = [...files];
      const newPreviews = [...previews];

      // Revoke object URL to prevent memory leaks
      if (newPreviews[idx] && newPreviews[idx].startsWith('blob:')) {
        URL.revokeObjectURL(newPreviews[idx]);
      }

      newFiles.splice(idx, 1);
      newPreviews.splice(idx, 1);

      setFiles(newFiles);
      setPreviews(newPreviews);
      onChange?.(newFiles);

      // Adjust current index if necessary
      if (currentIndex >= newPreviews.length && newPreviews.length > 0) {
        setCurrentIndex(newPreviews.length - 1);
      } else if (newPreviews.length === 0) {
        setCurrentIndex(0);
      }
      // Reset file input
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
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
    handleFileChange(e.dataTransfer.files);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % previews.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + previews.length) % previews.length);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };


  const openFullScreen = (index: number) => {
    setFullScreenIndex(index);
    setIsFullScreenOpen(true);
  };

  const closeFullScreen = () => {
    setIsFullScreenOpen(false);
  };

  const nextFullScreenImage = () => {
    setFullScreenIndex((prev) => (prev + 1) % previews.length);
  };

  const prevFullScreenImage = () => {
    setFullScreenIndex((prev) => (prev - 1 + previews.length) % previews.length);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isFullScreenOpen) return;
      
      if (event.key === 'Escape') {
        closeFullScreen();
      } else if (event.key === 'ArrowRight') {
        nextFullScreenImage();
      } else if (event.key === 'ArrowLeft') {
        prevFullScreenImage();
      }
    };

    if (isFullScreenOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullScreenOpen, previews.length]);

  return (
    <div className={cn('flex h-full flex-col gap-2', className)}>
      <div className="h-fit">{label}</div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFileChange(e.target.files)}
      />

      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all duration-200 p-4',
          fixedHeight,
          disabled
            ? 'border-neutral-200 bg-neutral-50'
            : isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'hover:border-neutral-400 border-neutral-300'
        )}
        onDragOver={!disabled ? handleDragOver : undefined}
        onDragLeave={!disabled ? handleDragLeave : undefined}
        onDrop={!disabled ? handleDrop : undefined}
      >
        {previews.length === 0 ? (
          <div
            className={`flex h-full flex-col items-center justify-center ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
            onClick={() => !disabled && inputRef.current?.click()}
          >
            <div className="flex h-full flex-col items-center justify-center space-y-2">
              <div className="rounded-full bg-gray-100 p-3">
                {disabled ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                ) : (
                  <Plus className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <p className="px-2 text-center text-sm text-gray-500">
                {disabled ? 'Uploading images...' : placeholder}
              </p>
              <p className="text-xs text-gray-400">
                {multiple ? `Max ${maxImages} images` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            <div
              className="relative h-full w-full overflow-hidden rounded-lg bg-no-repeat cursor-pointer"
              style={{
                backgroundImage: `url(${previews[currentIndex]})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
              }}
              onClick={() => openFullScreen(currentIndex)}
              title="Click to view in full screen"
            >
              {/* Navigation arrows */}
              {previews.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/2 left-2 -translate-y-1/2 hover:bg-neutral-200"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/2 right-2 -translate-y-1/2 hover:bg-neutral-200"
                    onClick={nextImage}
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}

              {/* Image counter */}
              <div className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
                {currentIndex + 1} of {previews.length}
              </div>

              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    openFullScreen(currentIndex);
                  }}
                  title="View in full screen"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    handleRemove(currentIndex);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </Button>

                {multiple && previews.length < maxImages && !disabled && (
                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    <Plus className="h-4 w-4 text-white" />
                  </Button>
                )}
              </div>
            </div>

            {/* Thumbnail navigation */}
            {previews.length > 1 && (
              <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                <div className="flex justify-center space-x-2">
                  {previews.map((preview, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={cn(
                        'h-8 w-8 overflow-hidden rounded border-2 transition-all',
                        idx === currentIndex
                          ? 'border-white'
                          : 'border-white/50 hover:border-white/80'
                      )}
                      onClick={() => goToImage(idx)}
                      onDoubleClick={() => openFullScreen(idx)}
                      title="Double-click to view in full screen"
                    >
                      <img
                        src={preview}
                        alt={`Thumbnail ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Screen Image Modal */}
      {isFullScreenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          {/* Close button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeFullScreen}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 rounded-lg bg-black/50 px-3 py-2 text-white">
            {fullScreenIndex + 1} of {previews.length}
          </div>

          {/* Navigation arrows */}
          {previews.length > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={prevFullScreenImage}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={nextFullScreenImage}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Main image */}
          <div className="max-h-[90vh] max-w-[90vw] flex items-center justify-center">
            <img
              src={previews[fullScreenIndex]}
              alt={`Full screen view ${fullScreenIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Thumbnail navigation */}
          {previews.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex gap-2 rounded-lg bg-black/50 p-2">
                {previews.map((preview, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={cn(
                      'h-12 w-12 overflow-hidden rounded border-2 transition-all',
                      idx === fullScreenIndex
                        ? 'border-white'
                        : 'border-white/50 hover:border-white/80'
                    )}
                    onClick={() => setFullScreenIndex(idx)}
                  >
                    <img
                      src={preview}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="absolute inset-0 -z-10"
            onClick={closeFullScreen}
          />
        </div>
      )}
    </div>
  );
};
