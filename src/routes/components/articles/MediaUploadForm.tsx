
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, UploadCloud, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface MediaUploadFormProps {
  onImagesChange: (images: string[]) => void;
  initialImages?: string[];
  onPrevious: () => void;
  onNext: () => void;
}

const MediaUploadForm: React.FC<MediaUploadFormProps> = ({
  onImagesChange,
  initialImages = [],
  onPrevious,
  onNext,
}) => {
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onImagesChange(images);
  }, [images, onImagesChange]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const uploadPromises = acceptedFiles.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('https://oi.chanomhub.online/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Upload failed');
        }

        const data = await response.json();
        return data.url; // Assuming the API returns { url: "..." }
      } catch (err) {
        console.error('Upload error:', err);
        setError(`Failed to upload ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    const uploadedUrls: string[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        uploadedUrls.push(result.value);
      }
    });

    setImages((prevImages) => [...prevImages, ...uploadedUrls]);
    setUploading(false);
    setUploadProgress(100); // Reset or set to 100 after all uploads
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.webp'],
    },
    multiple: true,
  });

  const handleRemoveImage = (urlToRemove: string) => {
    setImages((prevImages) => prevImages.filter((url) => url !== urlToRemove));
  };

  const handleAddImageUrl = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const url = e.currentTarget.value.trim();
      if (url && !images.includes(url)) {
        setImages((prevImages) => [...prevImages, url]);
        e.currentTarget.value = '';
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>อัปโหลดรูปภาพ</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <p className="text-gray-600">Uploading... {uploadProgress}%</p>
              <Progress value={uploadProgress} className="w-full mt-2" />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-700">ลากและวางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
              <p className="text-sm text-gray-500">(ขนาดไฟล์สูงสุด: 10MB)</p>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4">
          <div>
            <Label htmlFor="imageUrl">เพิ่ม URL รูปภาพ</Label>
            <Input
              id="imageUrl"
              placeholder="วาง URL รูปภาพและกด Enter"
              onKeyDown={handleAddImageUrl}
              className="mt-1"
            />
            <ScrollArea className="h-40 w-full rounded-md border p-4 mt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Uploaded image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious}>
            ย้อนกลับ
          </Button>
          <Button onClick={onNext} disabled={uploading}>
            ถัดไป
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaUploadForm;
