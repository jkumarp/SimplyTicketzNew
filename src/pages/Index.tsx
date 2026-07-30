"use client";

import React, { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
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
import { API_URL, RECAPTCHA_SITE_KEY, SITE_URL } from "@/config";
import { merchantEnquirySchema, collectZodErrors } from "@/lib/validationSchemas";
import Recaptcha, { RecaptchaHandle } from "@/components/Recaptcha";
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
  { title: "Register", icon: UserPlus, gradient: "from-teal-500 to-cyan-600" },
  { title: "Upload Documents", icon: FileCheck, gradient: "from-sky-500 to-indigo-600" },
  { title: "KYC Approved", icon: ShieldCheck, gradient: "from-emerald-500 to-teal-600" },
  { title: "Create Event", icon: CalendarPlus, gradient: "from-amber-500 to-orange-600" },
  { title: "Go Live", icon: Globe, gradient: "from-rose-500 to-red-600" },
  { title: "Sell Tickets", icon: Ticket, gradient: "from-violet-500 to-purple-600" },
  { title: "Scan QR", icon: QrCode, gradient: "from-cyan-500 to-blue-600" },
  { title: "Reports", icon: BarChart3, gradient: "from-indigo-500 to-violet-600" },
  { title: "T+1 Settlement", icon: Wallet, gradient: "from-green-500 to-emerald-700" },
];
const Index = () => {
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [enquiryData, setEnquiryData] = useState({
    merchant_name: "",
    merchant_email: "",
    enquiry_details: "",
  });
  const [enquiryErrors, setEnquiryErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaHandle>(null);

  const enquiryMutation = useMutation({
    mutationFn: async (data: typeof enquiryData & { recaptchaToken: string }) => {
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
      setEnquiryErrors({});
      setCaptchaToken(null);
    },
    onError: (err: any) => {
      showError(err.message);
      // reCAPTCHA tokens are single-use, so a failed attempt needs a fresh
      // verification before the next submit is allowed.
      setCaptchaToken(null);
      recaptchaRef.current?.reset();
    },
  });

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = merchantEnquirySchema.safeParse(enquiryData);
    if (!result.success) {
      setEnquiryErrors(collectZodErrors(result.error));
      return;
    }
    if (!captchaToken) {
      showError("Please verify you are not a robot.");
      return;
    }
    setEnquiryErrors({});
    enquiryMutation.mutate({ ...enquiryData, recaptchaToken: captchaToken });
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SimplyTicketz",
    url: SITE_URL,
  };

  // Mirrors the static fallback tags in index.html (seen by non-JS crawlers)
  // so a JS-executing crawler doesn't see conflicting duplicate content -
  // only the WebSite JSON-LD below is genuinely new here.
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Helmet defer={false}>
        <title>SimplyTicketz | Book & Sell Tickets for Events, Sports & Attractions</title>
        <meta
          name="description"
          content="SimplyTicketz is a ticketing platform for events, sports, attractions and tourism. Discover and book tickets, or become a merchant to sell tickets, scan QR check-ins and manage settlements."
        />
        <meta name="keywords" content="event tickets, book tickets online, ticketing platform, sell event tickets, merchant ticketing, QR ticket scanning, event management software" />
        <link rel="canonical" href={SITE_URL + "/"} />
        <meta property="og:title" content="SimplyTicketz | Book & Sell Tickets for Events, Sports & Attractions" />
        <meta
          property="og:description"
          content="Discover and book tickets for events, sports and attractions, or become a merchant to sell tickets, scan QR check-ins and manage settlements."
        />
        <meta property="og:url" content={SITE_URL + "/"} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
      </Helmet>

      <Navbar />

      <main className="flex-grow">
        <Hero />

        {/* Merchant Workflow Section */}
        {/* Merchant Journey */}

        <section
          aria-labelledby="merchant-journey-heading"
          className="relative py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-teal-50"
        >
          <div className="absolute top-0 left-0 w-96 h-96 bg-teal-200 rounded-full blur-3xl opacity-20" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-200 rounded-full blur-3xl opacity-20" />

          <div className="container px-4 md:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center mb-20">
              <span className="inline-flex items-center rounded-full bg-teal-100 text-teal-700 px-4 py-2 text-sm font-semibold">
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-teal-500" />
                Merchant Success Journey
              </span>

              <h2 id="merchant-journey-heading" className="mt-6 text-4xl md:text-6xl font-black text-slate-900">
                Run Your Entire
                <span className="block text-teal-600">
                  Ticketing Business
                </span>
              </h2>

              <p className="mt-6 text-xl text-slate-500">
                Everything from onboarding and ticket sales to QR validation,
                settlements and business analytics.
              </p>
            </div>

            <ol className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 list-none">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <motion.li
                    key={step.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md hover:shadow-xl hover:-translate-y-2 transition-all"
                  >
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-md`}>
                      <Icon className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>

                    <p className="mt-4 text-center font-semibold text-slate-900">
                      {step.title}
                    </p>
                  </motion.li>
                );
              })}
            </ol>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-5">
                  <Zap className="text-teal-600 h-7 w-7" />
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

            <dl className="grid md:grid-cols-4 gap-6 mt-20">
              <div className="bg-white rounded-3xl p-8 text-center shadow-md">
                <dt className="text-5xl font-black text-teal-600">10K+</dt>
                <dd className="text-slate-500 mt-2">Events Managed</dd>
              </div>

              <div className="bg-white rounded-3xl p-8 text-center shadow-md">
                <dt className="text-5xl font-black text-teal-600">1M+</dt>
                <dd className="text-slate-500 mt-2">Tickets Sold</dd>
              </div>

              <div className="bg-white rounded-3xl p-8 text-center shadow-md">
                <dt className="text-5xl font-black text-teal-600">99.9%</dt>
                <dd className="text-slate-500 mt-2">Uptime</dd>
              </div>

              <div className="bg-white rounded-3xl p-8 text-center shadow-md">
                <dt className="text-5xl font-black text-teal-600">T+1</dt>
                <dd className="text-slate-500 mt-2">Settlement</dd>
              </div>
            </dl>

            <div className="mt-24">
              <div className="rounded-[40px] bg-gradient-to-r from-teal-600 via-cyan-600 to-slate-800 p-16 text-center shadow-2xl">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                  Start Selling Tickets Today
                </h2>

                <p className="text-teal-50 text-lg mb-8">
                  Create events, sell tickets and receive settlements faster.
                </p>

                <Button
                  size="lg"
                  onClick={() => setIsEnquiryOpen(true)}
                  className="bg-white text-teal-600 hover:bg-slate-100 rounded-2xl px-10 py-7 text-lg font-bold"
                >
                  Become a Merchant
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section aria-labelledby="trending-events-heading" className="container px-4 md:px-8 py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 id="trending-events-heading" className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
                Discover Trending Events
              </h2>
              <p className="text-slate-500 text-lg">
                Handpicked experiences from top organizers around the world.
              </p>
            </div>
            <CategoryFilter />
          </div>

          <motion.ul
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 list-none"
          >
            {MOCK_EVENTS.map((event, index) => (
              <motion.li
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <article>
                  <EventCard {...event} />
                </article>
              </motion.li>
            ))}
          </motion.ul>
        </section>
        <section aria-labelledby="event-categories-heading" className="py-24 bg-white border-t border-slate-100">
          <div className="container px-4 md:px-8">
            <div className="text-center mb-12">
              <h2 id="event-categories-heading" className="text-3xl font-black text-slate-900">
                Trusted by Event Organizers
              </h2>

              <p className="text-slate-500 mt-3">
                Built for events, attractions, tourism, sports and
                entertainment.
              </p>
            </div>

            <ul className="grid grid-cols-2 md:grid-cols-6 gap-8 list-none">
              {[
                { label: "Music Festivals", className: "bg-teal-50 text-teal-700" },
                { label: "Sports", className: "bg-amber-50 text-amber-700" },
                { label: "Exhibitions", className: "bg-sky-50 text-sky-700" },
                { label: "Conferences", className: "bg-violet-50 text-violet-700" },
                { label: "Museums", className: "bg-rose-50 text-rose-700" },
                { label: "Theme Parks", className: "bg-emerald-50 text-emerald-700" },
              ].map((item) => (
                <li
                  key={item.label}
                  className={`rounded-2xl p-6 text-center font-semibold hover:-translate-y-1 hover:shadow-md transition-all ${item.className}`}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
        {/* Newsletter Section */}
        <section aria-labelledby="newsletter-heading" className="bg-slate-900 py-24 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500 blur-[150px] rounded-full" />
          </div>

          <div className="container px-4 md:px-8 text-center relative z-10">
            <h2 id="newsletter-heading" className="text-3xl md:text-5xl font-black text-white mb-6">
              Never miss an event again
            </h2>
            <p className="text-slate-400 mb-12 max-w-2xl mx-auto text-lg">
              Join 50,000+ event lovers and get notified about the hottest
              tickets before they sell out.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto"
            >
              <Label htmlFor="newsletter-email" className="sr-only">
                Email address
              </Label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Enter your email"
                className="flex-grow px-8 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 outline-none backdrop-blur-sm"
              />
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-4 h-auto rounded-2xl font-bold text-lg"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </section>
      </main>

      {/* Merchant Enquiry Dialog */}
      <Dialog
        open={isEnquiryOpen}
        onOpenChange={(open) => {
          setIsEnquiryOpen(open);
          if (!open) setCaptchaToken(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-teal-600 flex items-center gap-2">
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
                maxLength={100}
                placeholder="e.g. Global Events Ltd."
                className="h-12 rounded-xl border-slate-200 focus:ring-teal-500"
                value={enquiryData.merchant_name}
                onChange={(e) =>
                  setEnquiryData({
                    ...enquiryData,
                    merchant_name: e.target.value,
                  })}
              />
              {enquiryErrors.merchant_name && (
                <p className="text-sm text-red-500">{enquiryErrors.merchant_name}</p>
              )}
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
                maxLength={100}
                placeholder="contact@yourcompany.com"
                className="h-12 rounded-xl border-slate-200 focus:ring-teal-500"
                value={enquiryData.merchant_email}
                onChange={(e) =>
                  setEnquiryData({
                    ...enquiryData,
                    merchant_email: e.target.value,
                  })}
              />
              {enquiryErrors.merchant_email && (
                <p className="text-sm text-red-500">{enquiryErrors.merchant_email}</p>
              )}
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
                minLength={500}
                placeholder="What kind of events do you organize? (Max 500 chars)"
                className="min-h-[120px] rounded-xl border-slate-200 focus:ring-teal-500"
                maxLength={500}
                value={enquiryData.enquiry_details}
                onChange={(e) =>
                  setEnquiryData({
                    ...enquiryData,
                    enquiry_details: e.target.value,
                  })}
              />
              {enquiryErrors.enquiry_details && (
                <p className="text-sm text-red-500">{enquiryErrors.enquiry_details}</p>
              )}
            </div>
            <Recaptcha
              ref={recaptchaRef}
              siteKey={RECAPTCHA_SITE_KEY}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
            />
            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-teal-100"
                disabled={enquiryMutation.isPending || !captchaToken}
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
