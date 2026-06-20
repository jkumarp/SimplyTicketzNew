import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, ImageIcon } from 'lucide-react';
import { API_URL } from '@/config';
import { cn } from '@/lib/utils';

interface PictureRecord {
  id: number;
  picture_id: string; // File path inside the Supabase bucket
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
      <DialogContent className="max-w-3xl overflow-hidden rounded-2xl bg-white p-0 border-none shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-indigo-500" /> Activity Gallery
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[460px] bg-slate-950 flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="text-center text-slate-400 space-y-3 z-10">
              <Loader2 className="h-9 w-9 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs font-medium tracking-wide">Retrieving asset list...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 p-6 space-y-3 z-10">
              <div className="h-12 w-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : pictures.length === 0 ? (
            <div className="text-center text-slate-400 p-6 space-y-3 z-10">
              <div className="h-12 w-12 bg-slate-900 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                <ImageIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">No active portfolio images discovered.</p>
            </div>
          ) : (
            <>
              {/* Dynamic Blurred Ambiance Layer */}
              {currentUrl && (
                <img 
                  src={currentUrl} 
                  alt="Ambient Background" 
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-110 pointer-events-none select-none transition-all duration-500"
                />
              )}

              {/* URL Loading Overlay */}
              {loadingUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs z-10 transition-all">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}

              {/* Primary Image Screen */}
              <div className="w-full h-full flex items-center justify-center p-4 z-10">
                {currentUrl ? (
                  <img 
                    src={currentUrl} 
                    alt={`Gallery Display ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-md select-none animate-in fade-in zoom-in-95 duration-200"
                  />
                ) : (
                  <div className="text-center text-slate-500">
                    <p className="text-xs font-medium">Resolution fault: Asset content could not stream.</p>
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              {pictures.length > 1 && (
                <>
                  <Button 
                    onClick={handlePrevious} 
                    variant="ghost" 
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/40 backdrop-blur-md hover:bg-slate-900/70 text-white hover:text-white h-10 w-10 border border-white/10 shadow-lg z-20 transition-all duration-200 active:scale-95"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    variant="ghost" 
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/40 backdrop-blur-md hover:bg-slate-900/70 text-white hover:text-white h-10 w-10 border border-white/10 shadow-lg z-20 transition-all duration-200 active:scale-95"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Lower HUD Overlays */}
              <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 z-20 pointer-events-none">
                {/* Micro Pill Indexer */}
                <div className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wider border border-white/15 shadow-sm">
                  {currentIndex + 1} / {pictures.length}
                </div>

                {/* Progress Indicators Track */}
                {pictures.length > 1 && (
                  <div className="flex items-center gap-1.5 max-w-[80%] overflow-x-auto py-1 px-2 pointer-events-auto">
                    {pictures.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                          "h-1.5 transition-all duration-300 rounded-full",
                          index === currentIndex 
                            ? "w-6 bg-indigo-500 shadow-sm" 
                            : "w-1.5 bg-white/40 hover:bg-white/70"
                        )}
                        aria-label={`Jump to panel slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}