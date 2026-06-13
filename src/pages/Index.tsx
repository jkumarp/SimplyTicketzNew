"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import CategoryFilter from '@/components/CategoryFilter';
import EventCard from '@/components/EventCard';
import Footer from '@/components/Footer';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { motion } from 'framer-motion';
import { Store, ArrowRight, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from "@/utils/toast";
import { API_URL } from "@/config";

const MOCK_EVENTS = [
  {
    id: 1,
    title: "Neon Dreams Music Festival",
    date: "Aug 15, 2024",
    location: "Central Park, NY",
    price: "$129",
    image: "https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=80&w=800",
    category: "Music",
    rating: 4.9
  },
  {
    id: 2,
    title: "Global Tech Summit 2024",
    date: "Sep 10, 2024",
    location: "Convention Center, SF",
    price: "$299",
    image: "https://images.unsplash.com/photo-1540575861501-7ad0582373f2?auto=format&fit=crop&q=80&w=800",
    category: "Arts",
    rating: 4.7
  },
  {
    id: 3,
    title: "Championship Finals",
    date: "Oct 05, 2024",
    location: "Madison Square Garden",
    price: "$85",
    image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800",
    category: "Sports",
    rating: 4.8
  }
];

const Index = () => {
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [enquiryData, setEnquiryData] = useState({
    merchant_name: '',
    merchant_email: '',
    enquiry_details: ''
  });

  const enquiryMutation = useMutation({
    mutationFn: async (data: typeof enquiryData) => {
      const res = await fetch(`${API_URL}/merchant-enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to send enquiry');
      return res.json();
    },
    onSuccess: () => {
      showSuccess("Enquiry sent successfully! Our team will contact you soon.");
      setIsEnquiryOpen(false);
      setEnquiryData({ merchant_name: '', merchant_email: '', enquiry_details: '' });
    },
    onError: (err: any) => showError(err.message)
  });

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enquiryMutation.mutate(enquiryData);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <Hero />
        
        {/* Merchant CTA Section */}
        <section className="bg-white border-y py-12">
          <div className="container px-4 md:px-8">
            <div className="bg-indigo-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-4">
                  <Store className="h-5 w-5" />
                  <span>FOR PARTNERS</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Are you an event organizer?</h2>
                <p className="text-slate-600 text-lg">
                  Join our network of merchants and start selling tickets to thousands of eager fans today.
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={() => setIsEnquiryOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-2xl text-lg font-bold group"
              >
                Register as Merchant
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </section>

        <section className="container px-4 md:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Upcoming Events</h2>
              <p className="text-slate-500">Handpicked experiences just for you</p>
            </div>
            <CategoryFilter />
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {MOCK_EVENTS.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <EventCard {...event} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="bg-indigo-600 py-20">
          <div className="container px-4 md:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Never miss an event again
            </h2>
            <p className="text-indigo-100 mb-10 max-w-xl mx-auto text-lg">
              Join 50,000+ event lovers and get notified about the hottest tickets before they sell out.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-grow px-6 py-3 rounded-full border-none focus:ring-2 focus:ring-white outline-none"
              />
              <button className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-800 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Merchant Enquiry Dialog */}
      <Dialog open={isEnquiryOpen} onOpenChange={setIsEnquiryOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
              <Store className="h-6 w-6" />
              Merchant Partnership
            </DialogTitle>
            <DialogDescription>
              Fill out the form below and our team will get back to you with onboarding details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEnquirySubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="merchant_name">Organization / Name *</Label>
              <Input 
                id="merchant_name" 
                required 
                placeholder="e.g. Global Events Ltd."
                value={enquiryData.merchant_name}
                onChange={(e) => setEnquiryData({...enquiryData, merchant_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchant_email">Email Address *</Label>
              <Input 
                id="merchant_email" 
                type="email" 
                required 
                placeholder="contact@yourcompany.com"
                value={enquiryData.merchant_email}
                onChange={(e) => setEnquiryData({...enquiryData, merchant_email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enquiry_details">Tell us about your events *</Label>
              <Textarea 
                id="enquiry_details" 
                required 
                placeholder="What kind of events do you organize? (Max 500 chars)"
                className="min-h-[120px]"
                maxLength={500}
                value={enquiryData.enquiry_details}
                onChange={(e) => setEnquiryData({...enquiryData, enquiry_details: e.target.value})}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-bold"
                disabled={enquiryMutation.isPending}
              >
                {enquiryMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Send Enquiry
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
      <MadeWithDyad />
    </div>
  );
};

export default Index;