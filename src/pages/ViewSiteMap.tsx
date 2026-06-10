"use client";

import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { initMapplsMap } from '@/utils/maps';

const ViewSiteMap = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize map after component mounts
    initMapplsMap('map-container');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Site Map</h1>
              <p className="text-slate-500">Explore the venue layout and locations</p>
            </div>
          </div>

          <Card className="shadow-xl border-indigo-100 overflow-hidden">
            <CardHeader className="bg-indigo-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Venue Interactive Map
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                id="map-container" 
                className="w-full h-[600px] bg-slate-100"
              >
                {/* Map will be injected here by Mappls SDK */}
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-amber-800 text-sm">
            <strong>Note:</strong> Please ensure you have a valid Mappls Access Token configured in <code>src/utils/maps.ts</code> to view the interactive map.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ViewSiteMap;