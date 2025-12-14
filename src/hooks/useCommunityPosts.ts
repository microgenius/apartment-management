import { useState, useEffect } from 'react';
import { communityPostsService } from '../services/communityPostsService';
import type { CommunityPost } from '../types';

export function useCommunityPosts() {
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await communityPostsService.getAll();
      setCommunityPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch community posts');
      console.error('Error fetching community posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return {
    communityPosts,
    setCommunityPosts,
    loading,
    error,
    refetch: fetchPosts
  };
}
