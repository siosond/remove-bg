import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UploadComponentProps {
  onFileChange: (dataUrl: string, imgName: string) => void;
}

const exampleImages = [
  { src: '/example/girl.jpg', label: 'Portrait' },
  { src: '/example/car.jpg', label: 'Car' },
  { src: '/example/horse.jpg', label: 'Horse' },
  { src: '/example/plant.jpg', label: 'Plant' },
];

const hasFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files');

const DragDropUpload: React.FC<UploadComponentProps> = ({ onFileChange }) => {
  const [dragging, setDragging] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectedImage = useCallback(
    (files: FileList | File[] | null | undefined) => {
      if (files && files.length > 0) {
        const file = files[0];
        if (!file.type.startsWith('image/')) {
          toast.error("That's not an image", {
            description: 'Try a PNG, JPG, or WebP instead.',
          });
          return;
        }
        const nameArr = file.name.split('.');
        nameArr.pop();
        const imageName = nameArr.join('.');
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          if (e.target?.result) {
            onFileChange(e.target?.result as string, imageName);
          }
        };
        reader.readAsDataURL(file);
      }
    },
    [onFileChange]
  );

  // accept drops anywhere on the page, not just inside the card
  useEffect(() => {
    let depth = 0;
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      handleSelectedImage(event.dataTransfer?.files);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleSelectedImage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleSelectedImage(event.target?.files);
    // allow picking the same file again
    event.target.value = '';
  };

  const handleExample = async (uri: string) => {
    try {
      const imgBlob = await fetch(uri).then((r) => r.blob());
      handleSelectedImage([
        new File([imgBlob], uri.replace('/example/', ''), {
          type: 'image/jpeg',
        }),
      ]);
    } catch {
      toast.error("Couldn't load that example. Give it another go.");
    }
  };

  return (
    <>
      <Card className='mx-auto w-full max-w-xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl'>Remove any background</CardTitle>
          <CardDescription>
            Free, and your photo never leaves your device.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-6'>
          <div
            className={cn(
              'flex flex-col items-center gap-4 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors',
              dragging && 'border-primary bg-accent'
            )}
          >
            <div className='rounded-full bg-muted p-3 text-muted-foreground'>
              <ImageUp className='size-6' />
            </div>
            <div className='text-sm text-muted-foreground'>
              Drop a photo here, or
            </div>
            <input
              ref={inputRef}
              type='file'
              accept='image/*'
              onChange={handleFileChange}
              hidden
            />
            <Button size='lg' onClick={() => inputRef.current?.click()}>
              Choose a photo
            </Button>
          </div>

          <div className='flex flex-col items-center gap-3'>
            <span className='text-sm text-muted-foreground'>
              Nothing handy? Try one of these
            </span>
            <ul className='flex gap-2'>
              {exampleImages.map((item) => (
                <li key={item.src}>
                  <button
                    type='button'
                    aria-label={`Try the ${item.label} example`}
                    className='block overflow-hidden rounded-lg ring-1 ring-border transition hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    onClick={() => handleExample(item.src)}
                  >
                    <img
                      className='size-16 object-cover'
                      src={item.src}
                      alt=''
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* drag over overlay */}
      {dragging && (
        <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm'>
          <div className='flex size-full items-center justify-center rounded-2xl border-2 border-dashed border-primary'>
            <h2 className='text-2xl font-semibold'>Drop it anywhere</h2>
          </div>
        </div>
      )}
    </>
  );
};

export default DragDropUpload;
