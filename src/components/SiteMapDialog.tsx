"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from 'lucide-react';
import { initMapplsMap } from '@/utils/maps';

interface SiteMapDialogProps {
  coordinates?: string; // Expected format: "lat, long"
  trigger?: React.ReactNode;
}

const SiteMapDialog = ({ coordinates, trigger }: SiteMapDialogProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      // Small delay to ensure the Dialog content is fully rendered in the DOM
      const timer = setTimeout(() => {
        let center: [number, number] = [19.6012, 73.7091]; // Default
        
        if (coordinates) {
          const parts = coordinates.split(',').map(p => parseFloat(p.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            center = [parts[0], parts[1]];
          }
        }
        
        initMapplsMap('popup-map-container', center);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, coordinates]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="link" className="text-indigo-600 h-auto p-0 text-xs font-bold flex items-center gap-1">
            <MapPin className="h-3 w-3" /> View Site Map
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-white">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            Venue Location
          </DialogTitle>
        </DialogHeader>
        <div className="flex-grow relative bg-slate-50">
          <div id="popup-map-container" className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SiteMapDialog;