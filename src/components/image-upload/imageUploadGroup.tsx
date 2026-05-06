import React, { useRef } from 'react';
import { FormItem, FormLabel } from '@/components/ui/form';
import { Plus } from 'lucide-react';

type ImageUploadGroupProps = {
  docIndex: number;
  imagePreviews: Record<string, string>;
  onChange: (imgIdx: number, file: File) => void;
};

export const ImageUploadGroup: React.FC<ImageUploadGroupProps> = ({
  docIndex,
  imagePreviews,
  onChange,
}) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    imgIdx: number
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(imgIdx, file);
    }
  };

  return (
    <div className="flex gap-4 w-full">
      {[0, 1, 2].map((imgIdx) => {
        const key = `${docIndex}-${imgIdx}`;
        const hasImage = !!imagePreviews[key];

        return (
          <div key={key} className="flex-1">
            <FormItem className="space-y-2">
              <FormLabel>Image {imgIdx + 1}</FormLabel>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={(el) => (fileInputRefs.current[key] = el)}
                onChange={(e) => handleFileSelect(e, imgIdx)}
              />
              <div
                className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 hover:bg-gray-100"
                onClick={() => fileInputRefs.current[key]?.click()}
              >
                {hasImage ? (
                  <img
                    src={imagePreviews[key]}
                    alt={`Doc ${docIndex} Img ${imgIdx + 1}`}
                    className="h-full w-full rounded object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="mb-2 px-2 text-center text-sm text-neutral-500">
                      Click to upload Image {imgIdx + 1}
                    </p>
                    <div className="bg-freshleaf rounded-md p-2 text-white">
                      <Plus className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </div>
            </FormItem>
          </div>
        );
      })}
    </div>
  );
};
