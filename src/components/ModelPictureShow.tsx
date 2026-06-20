import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { API_URL } from '@/config';

interface PictureRecord {
  id: number;
  picture_id: string; // This is the file path inside the Supabase bucket
  category_id: number;
  status_sw: boolean;
}

interface ModalPictureShowProps {
  serviceId: number;
  categoryId: number;
  onClose: () => void;
}

export function ModalPictureShow({ serviceId, categoryId, onClose }: ModalPictureShowProps) {
  const [pictures, setPictures] = useState<PictureRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  // Fetch list of pictures for this category
  useEffect(() => {
    const fetchPictures = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/merchant-service-pictures?serviceId=${serviceId}&categoryId=${categoryId}`,
          { headers: getAuthHeader() }
        );
        if (!response.ok) throw new Error('Failed to fetch pictures list');
        const data = await response.json();
        // Filter to only active pictures
        const activePics = (data.data || []).filter((p: PictureRecord) => p.status_sw !== false);
        setPictures(activePics);
        setCurrentIndex(0);
      } catch (err: any) {
        console.error('Error fetching pictures:', err);
        setError(err.message || 'Error loading pictures');
      } finally {
        setLoading(false);
      }
    };

    fetchPictures();
  }, [serviceId, categoryId]);

  // Fetch signed URL for the currently selected picture path
  useEffect(() => {
    if (pictures.length === 0 || currentIndex >= pictures.length) {
      setCurrentUrl(null);
      return;
    }

    const fetchSignedUrl = async () => {
      setLoadingUrl(true);
      try {
        const currentPath = pictures[currentIndex].picture_id;
        const res = await fetch(
          `${API_URL}/merchant-service-pictures/url?path=${encodeURIComponent(currentPath)}`,
          { headers: getAuthHeader() }
        );
        if (!res.ok) throw new Error('Failed to resolve image URL');
        const json = await res.json();
        setCurrentUrl(json.data);
      } catch (err) {
        console.error('Error resolving picture signed URL:', err);
        setCurrentUrl(null);
      } finally {
        setLoadingUrl(false);
      }
    };

    fetchSignedUrl();
  }, [pictures, currentIndex]);

  const handleNext = () => {
    if (pictures.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % pictures.length);
    }
  };

  const handlePrevious = () => {
    if (pictures.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + pictures.length) % pictures.length);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-2xl bg-white p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Category Gallery
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[400px] bg-slate-950 flex items-center justify-center">
          {loading ? (
            <div className="text-center text-slate-400 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs">Loading picture list...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 p-6 space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : pictures.length === 0 ? (
            <div className="text-center text-slate-500 p-6 space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto" />
              <p className="text-sm font-medium">No pictures uploaded for this category yet.</p>
            </div>
          ) : (
            <>
              {loadingUrl ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : null}

              {currentUrl ? (
                <img 
                  src={currentUrl} 
                  alt={`Gallery Image ${currentIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-500">
                  <p className="text-xs">Failed to load picture content.</p>
                </div>
              )}

              {/* Navigation Arrows */}
              {pictures.length > 1 && (
                <>
                  <Button 
                    onClick={handlePrevious} 
                    variant="ghost" 
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white h-10 w-10 shrink-0 z-20"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    variant="ghost" 
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white h-10 w-10 shrink-0 z-20"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Slide Counter Footer overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full z-20">
                {currentIndex + 1} / {pictures.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}