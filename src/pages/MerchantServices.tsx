"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceTab from '@/components/service-mgmt/ServiceTab';
import CategoryTab from '@/components/service-mgmt/CategoryTab';
import TimeslotTab from '@/components/service-mgmt/TimeslotTab';
import DeviceTab from '@/components/service-mgmt/DeviceTab';
import { Briefcase, Ticket, Clock, ChevronRight, Smartphone } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const MerchantServices = () => {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("services");

  const { data: services } = useQuery({
    queryKey: ['merchant-services'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
      });
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedServiceId
  });

  const selectedService = services?.find((s: any) => s.id.toString() === selectedServiceId);

  const handleServiceSelect = (id: string) => {
    setSelectedServiceId(id);
    setActiveTab("categories"); // Auto-switch to categories when a service is selected
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Service Management</h1>
              <p className="text-slate-500">Configure services, ticket categories, and entry timeslots</p>
            </div>
            {selectedServiceId && (
              <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Active Context:</span>
                <span className="text-sm font-medium text-slate-700">
                  {selectedService ? `${selectedService.name} (#${selectedServiceId})` : `Service ID #${selectedServiceId}`}
                </span>
                <ChevronRight className="h-4 w-4 text-indigo-300" />
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-14 p-1 bg-slate-200/50 rounded-2xl mb-8">
              <TabsTrigger value="services" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Services</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Ticket className="h-4 w-4" />
                <span className="hidden sm:inline">Categories</span>
              </TabsTrigger>
              <TabsTrigger value="timeslots" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Timeslots</span>
              </TabsTrigger>
              <TabsTrigger value="devices" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Scanning Devices</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="mt-0 outline-none">
              <ServiceTab 
                onServiceSelect={handleServiceSelect} 
                selectedServiceId={selectedServiceId} 
              />
            </TabsContent>

            <TabsContent value="categories" className="mt-0 outline-none">
              <CategoryTab serviceId={selectedServiceId} />
            </TabsContent>

            <TabsContent value="timeslots" className="mt-0 outline-none">
              <TimeslotTab serviceId={selectedServiceId} />
            </TabsContent>

            <TabsContent value="devices" className="mt-0 outline-none">
              <DeviceTab serviceId={selectedServiceId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantServices;