import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { downloadFile } from '../assets/script/utils';
import { getModel, setModel } from '../assets/script/model';
import { MODEL_URL } from '../assets/script/config';

const Download: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadFailed, setDownloadFailed] = useState(false);

  useEffect(() => {
    async function setModelData() {
      const modelBuffer: ArrayBuffer | null = await getModel();
      if (!modelBuffer) {
        setIsOpen(true);
        downloadFile({
          url: MODEL_URL,
          progress: (loaded, total) => {
            const res = Math.round((loaded / total) * 100);
            setProgress(res);
          },
          finalCb: (flag, data) => {
            if (flag === true) {
              console.log('download model successfully');
              setModel(data as ArrayBuffer);
              setIsOpen(false);
            } else {
              // download failed
              setDownloadFailed(true);
            }
          },
        });
      }
    }
    setModelData();
  }, []);

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className='sm:max-w-lg'
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription className='sr-only'>
            Downloading the background removal model
          </DialogDescription>
        </DialogHeader>
        <div className='pb-4'>
          {!downloadFailed && (
            <div className='pb-2'>
              Downloading a model file of approximately 5MB. Please be patient.
            </div>
          )}
          {downloadFailed && (
            <div className='text-red-600 pb-2'>
              Download failed, please refresh and try again.
            </div>
          )}
          <Progress value={progress} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Download;
