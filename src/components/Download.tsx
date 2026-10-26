import React, { useState, useEffect } from 'react';
import { Modal, useOverlayState } from '@heroui/react';
import { downloadFile } from '../assets/script/utils';
import { getModel, setModel } from '../assets/script/model';
import { MODEL_URL } from '../assets/script/config';
import { m } from '../paraglide/messages.js';

const Download: React.FC = () => {
  const state = useOverlayState();
  const [progress, setProgress] = useState(0);
  const [downloadFailed, setDownloadFailed] = useState(false);

  useEffect(() => {
    async function setModelData() {
      const modelBuffer: ArrayBuffer | null = await getModel();
      if (!modelBuffer) {
        state.open();
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
              state.close();
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
    <Modal state={state}>
      <Modal.Backdrop
        variant='blur'
        isDismissable={false}
        isKeyboardDismissDisabled
      >
        <Modal.Container size='lg'>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{m.notes()}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className='pb-4'>
                {!downloadFailed && (
                  <div className='pb-2'>{m.download_model_message()}</div>
                )}
                {downloadFailed && (
                  <div className='text-red-600 pb-2'>{m.download_failed()}</div>
                )}
                <progress max='100' value={progress}></progress>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default Download;
