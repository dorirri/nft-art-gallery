import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import ArtworkCard from './ArtworkCard';
import { Card } from '@/components/ui/card';

const Gallery = () => {
  const { contract, account } = useWeb3();
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

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
            name: gallery.name,
            curator: gallery.curator
          };
        })
      );

      setGalleries(loadedGalleries);
      if (loadedGalleries.length > 0) {
        setSelectedGallery(loadedGalleries[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading galleries:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGallery) {
      loadArtworks(selectedGallery);
    }
  }, [selectedGallery]);

  const loadArtworks = async (galleryId) => {
    try {
      const artworkIds = await contract.methods.getGalleryArtworks(galleryId).call();
      
      const loadedArtworks = await Promise.all(
        artworkIds.map(async (id) => {
          const artwork = await contract.methods.artworks(id).call();
          const uri = await contract.methods.tokenURI(id).call();
          const rating = await contract.methods.getAverageRating(id).call();
          
          return {
            id,
            title: artwork.title,
            artist: artwork.artist,
            price: artwork.price,
            forSale: artwork.forSale,
            rating,
            uri
          };
        })
      );

      setArtworks(loadedArtworks);
    } catch (error) {
      console.error('Error loading artworks:', error);
    }
  };

  if (loading) {
    return <div>Loading galleries...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 overflow-x-auto p-4">
        {galleries.map((gallery) => (
          <button
            key={gallery.id}
            onClick={() => setSelectedGallery(gallery.id)}
            className={`px-4 py-2 rounded-lg ${
              selectedGallery === gallery.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {gallery.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} />
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ArtworkCard = ({ artwork }) => {
  const navigate = useNavigate();
  const { web3, contract, account } = useWeb3();

  const handlePurchase = async () => {
    try {
      await contract.methods.purchaseArtwork(artwork.id).send({
        from: account,
        value: artwork.price
      });
      window.location.reload();
    } catch (error) {
      console.error('Error purchasing artwork:', error);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{artwork.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <img
          src={artwork.uri}
          alt={artwork.title}
          className="w-full h-48 object-cover rounded-lg"
        />
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">Artist: {artwork.artist}</p>
          <p className="text-sm text-gray-600">
            Price: {web3.utils.fromWei(artwork.price, 'ether')} ETH
          </p>
          <div className="flex items-center">
            <span className="text-sm text-gray-600">Rating: </span>
            <div className="ml-2 flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-xl ${
                    star <= artwork.rating ? 'text-yellow-500' : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="space-x-2">
        <Button
          onClick={() => navigate(`/artwork/${artwork.id}`)}
          variant="outline"
        >
          View Details
        </Button>
        {artwork.forSale && artwork.artist !== account && (
          <Button onClick={handlePurchase} variant="default">
            Purchase
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ArtworkCard;