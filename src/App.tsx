import { useState } from 'react';
import './App.css';
import Head from './components/Head';
import Upload from './components/Upload';
import Preview from './components/Preview';
import Download from './components/Download';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const [showUpload, setShowUpload] = useState(true);
  const [originImage, setOriginImage] = useState<string>('');
  const [originImageName, setOriginImageName] = useState<string>('');

  const handleFileChange = (dataUrl: string, imgName: string) => {
    setOriginImage(dataUrl);
    setOriginImageName(imgName);
    setShowUpload(false);
  };
  const handlePreviewClick = (type: 'delete') => {
    if (type === 'delete') {
      setShowUpload(true);
    }
  };

  return (
    <div className='flex min-h-svh flex-col bg-background text-foreground'>
      {/* header */}
      <Head />

      {/* download model */}
      <Download />

      <main className='mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center p-4 sm:p-6'>
        {showUpload && <Upload onFileChange={handleFileChange} />}

        {!showUpload && (
          <Preview
            originUrl={originImage}
            originName={originImageName}
            onClick={handlePreviewClick}
          />
        )}
      </main>

      <Toaster richColors position='bottom-right' />
    </div>
  );
}

export default App;
