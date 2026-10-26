import { useState } from 'react';
import './App.css';
import Head from './components/Head';
import Upload from './components/Upload';
import Preview from './components/Preview';
import Download from './components/Download';

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
    <div className='App'>
      {/* header */}
      <Head />

      {/* download model */}
      <Download />

      {showUpload && <Upload onFileChange={handleFileChange} />}

      {!showUpload && (
        <Preview
          originUrl={originImage}
          originName={originImageName}
          onClick={handlePreviewClick}
        />
      )}
    </div>
  );
}

export default App;
