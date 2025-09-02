import { useState } from 'react';
import { Listing } from '../types/listing';

export const useListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);

  const addListing = (newListing: Listing) => {
    setListings((prev) => [...prev, newListing]);
  };

  return { listings, addListing };
};
