import { useState } from 'react';
import './App.css';
import Head from './components/Head';
import Upload from './components/Upload';
import Preview from './components/Preview';
import Download from './components/Download';
import { LanguageContext } from './contexts/Context';
import { getLocale } from './paraglide/runtime';
import type { Locale } from './paraglide/runtime';

export type Language = Locale;

function App() {
  const [language, setLanguage] = useState<Language>(getLocale());
  const [showUpload, setShowUpload] = useState(true);
  const [originImage, setOriginImage] = useState<string>('');
  const [originImageName, setOriginImageName] = useState<string>('');

  const handleLanguageChange = (tag: Language) => {
    setLanguage(tag);
  };
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
    <LanguageContext.Provider value={language}>
      <div className='App'>
        {/* header */}
        <Head onLanguageChange={handleLanguageChange} />

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
    </LanguageContext.Provider>
  );
}

export default App;
