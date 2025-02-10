import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { uploadToIPFS } from '../utils/ipfs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CreateArtwork = () => {
  const navigate = useNavigate();
  const { web3, contract, account } = useWeb3();
  const [galleries, setGalleries] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    galleryId: '',
    file: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGalleries();
  }, [contract]);

  const loadGalleries = async () => {
    try {
      const galleryEvents = await contract.getPastEvents('GalleryCreated', {
        fromBlock: 0,
        toBlock: 'latest'
      });

      const loadedGalleries = await Promise.all(
        galleryEvents.map(async (event) => {
          const gallery = await contract.methods.galleries(event.returnValues.galleryId).call();
          return {
            id: event.returnValues.galleryId,
            name: gallery.name
          };
        })
      );

      setGalleries(loadedGalleries);
    } catch (error) {
      console.error('Error loading galleries:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        file: e.target.files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.file) {
        throw new Error('Please select an image file');
      }

      const imageHash = await uploadToIPFS(formData.file);
      
      const metadata = {
        name: formData.title,
        description: formData.description,
        image: `ipfs://${imageHash}`,
      };

      const metadataHash = await uploadToIPFS(
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );

      const priceInWei = web3.utils.toWei(formData.price, 'ether');

      await contract.methods
        .createArtwork(
          formData.title,
          `ipfs://${metadataHash}`,
          priceInWei,
          formData.galleryId
        )
        .send({ from: account });

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Artwork</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded-md"
              rows="4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (ETH)</label>
            <Input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              step="0.001"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Gallery</label>
            <Select
              name="galleryId"
              value={formData.galleryId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a gallery</option>
              {galleries.map(gallery => (
                <option key={gallery.id} value={gallery.id}>
                  {gallery.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Artwork File</label>
            <Input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Artwork'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateArtwork;