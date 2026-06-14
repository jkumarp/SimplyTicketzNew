"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CategoryFilter from "@/components/CategoryFilter";
import EventCard from "@/components/EventCard";
import Footer from "@/components/Footer";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarPlus,
  FileCheck,
  Globe,
  Loader2,
  QrCode,
  Send,
  ShieldCheck,
  Store,
  Ticket,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import { API_URL } from "@/config";

const MOCK_EVENTS = [
  {
    id: 1,
    title: "Neon Dreams Music Festival",
    date: "Aug 15, 2024",
    location: "Central Park, NY",
    price: "$129",
    image:
      "https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=80&w=800",
    category: "Music",
    rating: 4.9,
  },
  {
    id: 2,
    title: "Global Tech Summit 2024",
    date: "Sep 10, 2024",
    location: "Convention Center, SF",
    price: "$299",
    image:
      "https://images.unsplash.com/photo-1540575861501-7ad0582373f2?auto=format&fit=crop&q=80&w=800",
    category: "Arts",
    rating: 4.7,
  },
  {
    id: 3,
    title: "Championship Finals",
    date: "Oct 05, 2024",
    location: "Madison Square Garden",
    price: "$85",
    image:
      "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800",
    category: "Sports",
    rating: 4.8,
  },
];
const workflowSteps = [
  { title: "Register", icon: UserPlus },
  { title: "Upload Documents", icon: FileCheck },
  { title: "KYC Approved", icon: ShieldCheck },
  { title: "Create Event", icon: CalendarPlus },
  { title: "Go Live", icon: Globe },
  { title: "Sell Tickets", icon: Ticket },
  { title: "Scan QR", icon: QrCode },
  { title: "Reports", icon: BarChart3 },
  { title: "T+1 Settlement", icon: Wallet },
];
const Index = () => {
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [enquiryData, setEnquiryData] = useState({
    merchant_name: "",
    merchant_email: "",
    enquiry_details: "",
  });

  const enquiryMutation = useMutation({
    mutationFn: async (data: typeof enquiryData) => {
      const guestRes = await fetch(`${API_URL}/guestLogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.merchant_email }),
      });

      if (!guestRes.ok) throw new Error("Guest authentication failed");
      const guestAuth = await guestRes.json();
      const token = guestAuth.token;

      const res = await fetch(`${API_URL}/merchant-enquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to send enquiry");
      return res.json();
    },
    onSuccess: () => {
      showSuccess("Enquiry sent successfully! Our team will contact you soon.");
      setIsEnquiryOpen(false);
      setEnquiryData({
        merchant_name: "",
        merchant_email: "",
        enquiry_details: "",
      });
    },
    onError: (err: any) => showError(err.message),
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
        {/* Merchant Journey */}

        <section className="relative py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
          <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-20" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20" />

          <div className="container px-4 md:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center mb-20">
              <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-4 py-2 text-sm font-semibold">
                Merchant Success Journey
              </span>

              <h2 className="mt-6 text-4xl md:text-6xl font-black text-slate-900">
                Run Your Entire
                <span className="block text-indigo-600">
                  Ticketing Business
                </span>
              </h2>

              <p className="mt-6 text-xl text-slate-500">
                Everything from onboarding and ticket sales to QR validation,
                settlements and business analytics.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md hover:shadow-xl hover:-translate-y-2 transition-all"
                  >
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    <p className="mt-4 text-center font-semibold text-slate-900">
                      {step.title}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-5">
                  <Zap className="text-indigo-600 h-7 w-7" />
                </div>

                <h3 className="text-xl font-bold mb-3">
                  Quick Onboarding
                </h3>

                <p className="text-slate-500">
                  Complete registration, upload documents and get verified
                  quickly.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5">
                  <ShieldCheck className="text-emerald-600 h-7 w-7" />
                </div>

                <h3 className="text-xl font-bold mb-3">
                  QR Validation
                </h3>

                <p className="text-slate-500">
                  Validate tickets instantly using our mobile scanning
                  application.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-5">
                  <BarChart3 className="text-blue-600 h-7 w-7" />
                </div>

                <h3 className="text-xl font-bold mb-3">
                  Business Analytics
                </h3>

                <p className="text-slate-500">
                  Track sales, attendance, settlements and revenue in real time.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mt-20">
              <div className="bg-white rounded-3xl p-8 text-center shadow-md">
                <h3 className="text-5xl font-black text-indigo-600">10K+</h3>
                <p className="text-slate-500 mt-2">Events Managed</p>
              </div>

              <div className="bg-white rounded-3xl p-8 text-center shadow-md">
                <h3 className="text-5xl font-black text-indigo-600">1M+</h3>
                <p className="text-slate-500 mt-2">Tickets Sold</p>
              </div>

              <div className="bg-white rounded-3xl p-8 text-center shadow-md">
                <h3 className="text-5xl font-black text-indigo-600">99.9%</h3>
                <p className="text-slate-500 mt-2">Uptime</p>
              </div>

              <div className="bg-white rounded-3xl p-8 text-center shadow-md">
                <h3 className="text-5xl font-black text-indigo-600">T+1</h3>
                <p className="text-slate-500 mt-2">Settlement</p>
              </div>
            </div>

            <div className="mt-24">
              <div className="rounded-[40px] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-16 text-center shadow-2xl">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                  Start Selling Tickets Today
                </h2>

                <p className="text-indigo-100 text-lg mb-8">
                  Create events, sell tickets and receive settlements faster.
                </p>

                <Button
                  size="lg"
                  onClick={() => setIsEnquiryOpen(true)}
                  className="bg-white text-indigo-600 hover:bg-slate-100 rounded-2xl px-10 py-7 text-lg font-bold"
                >
                  Become a Merchant
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section className="container px-4 md:px-8 py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
                Discover Trending Events
              </h2>
              <p className="text-slate-500 text-lg">
                Handpicked experiences from top organizers around the world.
              </p>
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
        <section className="py-24 bg-white border-t border-slate-100">
          <div className="container px-4 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900">
                Trusted by Event Organizers
              </h2>

              <p className="text-slate-500 mt-3">
                Built for events, attractions, tourism, sports and
                entertainment.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
              {[
                "Music Festivals",
                "Sports",
                "Exhibitions",
                "Conferences",
                "Museums",
                "Theme Parks",
              ].map((item) => (
                <div
                  key={item}
                  className="bg-slate-50 rounded-2xl p-6 text-center font-semibold text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
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
              Join 50,000+ event lovers and get notified about the hottest
              tickets before they sell out.
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
              Fill out the form below and our team will get back to you with
              onboarding details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEnquirySubmit} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="merchant_name"
                className="font-bold text-slate-700"
              >
                Organization / Name *
              </Label>
              <Input
                id="merchant_name"
                required
                placeholder="e.g. Global Events Ltd."
                className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
                value={enquiryData.merchant_name}
                onChange={(e) =>
                  setEnquiryData({
                    ...enquiryData,
                    merchant_name: e.target.value,
                  })}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="merchant_email"
                className="font-bold text-slate-700"
              >
                Email Address *
              </Label>
              <Input
                id="merchant_email"
                type="email"
                required
                placeholder="contact@yourcompany.com"
                className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
                value={enquiryData.merchant_email}
                onChange={(e) =>
                  setEnquiryData({
                    ...enquiryData,
                    merchant_email: e.target.value,
                  })}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="enquiry_details"
                className="font-bold text-slate-700"
              >
                Tell us about your events *
              </Label>
              <Textarea
                id="enquiry_details"
                required
                placeholder="What kind of events do you organize? (Max 500 chars)"
                className="min-h-[120px] rounded-xl border-slate-200 focus:ring-indigo-500"
                maxLength={500}
                value={enquiryData.enquiry_details}
                onChange={(e) =>
                  setEnquiryData({
                    ...enquiryData,
                    enquiry_details: e.target.value,
                  })}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-100"
                disabled={enquiryMutation.isPending}
              >
                {enquiryMutation.isPending
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : (
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
