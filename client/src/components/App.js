import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from '../contexts/Web3Context';
import Navigation from './Navigation';
import Gallery from './Gallery';
import CreateArtwork from './CreateArtwork';
import ArtworkDetail from './ArtworkDetail';
import CreateGallery from './CreateGallery';
import { Alert } from '@/components/ui/alert';
import { useWeb3 } from '../contexts/Web3Context';

const App = () => {
  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <Web3Status />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Gallery />} />
              <Route path="/create" element={<CreateArtwork />} />
              <Route path="/artwork/:id" element={<ArtworkDetail />} />
              <Route path="/create-gallery" element={<CreateGallery />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Web3Provider>
  );
};

const Web3Status = () => {
  const { loading, error, account } = useWeb3();

  if (loading) {
    return (
      <Alert className="m-4">
        <AlertTitle>Loading</AlertTitle>
        <AlertDescription>
          Connecting to Web3...
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!account) {
    return (
      <Alert variant="warning" className="m-4">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Please connect your wallet to continue
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default App;