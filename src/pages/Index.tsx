"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import CategoryFilter from '@/components/CategoryFilter';
import EventCard from '@/components/EventCard';
import Footer from '@/components/Footer';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { motion } from 'framer-motion';
import { Store, ArrowRight, Loader2, Send, CheckCircle2, Zap, ShieldCheck, BarChart3 } from 'lucide-react';
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
      const guestRes = await fetch(`${API_URL}/guestLogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.merchant_email })
      });
      
      if (!guestRes.ok) throw new Error('Guest authentication failed');
      const guestAuth = await guestRes.json();
      const token = guestAuth.token;

      const res = await fetch(`${API_URL}/merchant-enquiries`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        
        {/* Merchant Workflow Section */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="container px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm">For Event Organizers</span>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-4 mb-6">
                  Seamless Merchant Workflow
                </h2>
                <p className="text-slate-500 text-lg">
                  From registration to settlement, we've built a platform that helps you grow your event business with ease.
                </p>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 bg-slate-50 p-4 md:p-8"
            >
              <img 
                src="/merchant-workflow.jpeg" 
                alt="SimplyTicketz Merchant Workflow" 
                className="w-full h-auto rounded-2xl"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="flex gap-4">
                  <div className="bg-indigo-100 p-3 rounded-2xl h-fit">
                    <Zap className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2">Quick Onboarding</h4>
                    <p className="text-sm text-slate-500">Register and upload documents to get verified in record time.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-emerald-100 p-3 rounded-2xl h-fit">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2">Secure Validation</h4>
                    <p className="text-sm text-slate-500">Use our scanning devices for instant QR ticket verification at the gate.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-blue-100 p-3 rounded-2xl h-fit">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2">T+1 Settlements</h4>
                    <p className="text-sm text-slate-500">Get your ticket sales revenue settled directly to your bank account daily.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mt-16 text-center">
              <Button 
                size="lg" 
                onClick={() => setIsEnquiryOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-7 rounded-2xl text-xl font-bold shadow-xl shadow-indigo-200 group"
              >
                Start Selling Today
                <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section className="container px-4 md:px-8 py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">Discover Trending Events</h2>
              <p className="text-slate-500 text-lg">Handpicked experiences from top organizers around the world.</p>
            </div>
            <CategoryFilter />
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {MOCK_EVENTS.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <EventCard {...event} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Newsletter Section */}
        <section className="bg-slate-900 py-24 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500 blur-[150px] rounded-full" />
          </div>
          
          <div className="container px-4 md:px-8 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
              Never miss an event again
            </h2>
            <p className="text-slate-400 mb-12 max-w-2xl mx-auto text-lg">
              Join 50,000+ event lovers and get notified about the hottest tickets before they sell out.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-grow px-8 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none backdrop-blur-sm"
              />
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 h-auto rounded-2xl font-bold text-lg">
                Subscribe
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Merchant Enquiry Dialog */}
      <Dialog open={isEnquiryOpen} onOpenChange={setIsEnquiryOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-indigo-600 flex items-center gap-2">
              <Store className="h-6 w-6" />
              Merchant Partnership
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Fill out the form below and our team will get back to you with onboarding details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEnquirySubmit} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="merchant_name" className="font-bold text-slate-700">Organization / Name *</Label>
              <Input 
                id="merchant_name" 
                required 
                placeholder="e.g. Global Events Ltd."
                className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
                value={enquiryData.merchant_name}
                onChange={(e) => setEnquiryData({...enquiryData, merchant_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchant_email" className="font-bold text-slate-700">Email Address *</Label>
              <Input 
                id="merchant_email" 
                type="email" 
                required 
                placeholder="contact@yourcompany.com"
                className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
                value={enquiryData.merchant_email}
                onChange={(e) => setEnquiryData({...enquiryData, merchant_email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enquiry_details" className="font-bold text-slate-700">Tell us about your events *</Label>
              <Textarea 
                id="enquiry_details" 
                required 
                placeholder="What kind of events do you organize? (Max 500 chars)"
                className="min-h-[120px] rounded-xl border-slate-200 focus:ring-indigo-500"
                maxLength={500}
                value={enquiryData.enquiry_details}
                onChange={(e) => setEnquiryData({...enquiryData, enquiry_details: e.target.value})}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-100"
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