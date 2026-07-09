"use client";

import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthHeader } from "@/utils/common";
import { API_URL } from "@/config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import {
  ArrowLeft,
  Printer,
  Sparkles,
  Ticket,
  Smartphone,
  CheckCircle,
  MapPin,
  Loader2,
  Pencil,
} from "lucide-react";

const DEFAULT_STANDY_TEXT = "Unlock instant admissions right from your smartphone. Secure your access passes in under 60 seconds with no paper clutter!";

const QRCodeStandy = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const standyRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // Fetch service details for branding
  const { data: service, isLoading } = useQuery({
    queryKey: ["merchant-service-standy", serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId,
  });

  // Mutation to update qr_standy_text
  const updateMutation = useMutation({
    mutationFn: async (newText: string) => {
      const res = await fetch(`${API_URL}/merchant-services/${serviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          qr_standy_text: newText,
        }),
      });

      if (!res.ok) throw new Error("Failed to update standy subtext");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-service-standy", serviceId] });
      showSuccess("Standy subtext updated successfully!");
      setIsEditing(false);
    },
    onError: (err: any) => showError(err.message),
  });

  const handlePrint = () => {
    window.print();
  };

  const openEditDialog = () => {
    setEditText(service?.qr_standy_text || DEFAULT_STANDY_TEXT);
    setIsEditing(true);
  };

  const handleSaveText = () => {
    updateMutation.mutate(editText.trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
        <Footer />
      </div>
    );
  }

  // Generate Customer Booking URL
  const bookingUrl = `${window.location.protocol}//${window.location.host}/book/${serviceId}`;
  const standyTextToShow = service?.qr_standy_text || DEFAULT_STANDY_TEXT;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col print:bg-white print:p-0">
      <Navbar />

      <main className="flex-grow container px-4 md:px-8 py-12 flex flex-col items-center justify-center">
        {/* Action Controls (Hidden during print) */}
        <div className="w-full max-w-2xl flex justify-between items-center mb-8 print:hidden">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 rounded-xl text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={openEditDialog}
              className="gap-2 h-12 px-5 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
            >
              <Pencil className="h-4 w-4" /> Edit Statement
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-12 px-6 rounded-xl shadow-lg shadow-indigo-100 font-bold"
            >
              <Printer className="h-5 w-5" /> Print Standy Banner
            </Button>
          </div>
        </div>

        {/* Printable Standy poster container */}
        <div
          ref={standyRef}
          className="w-full max-w-2xl bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-900 border-[12px] border-slate-900 rounded-[40px] shadow-2xl overflow-hidden text-center relative print:border-none print:shadow-none print:my-0 print:mx-auto print:max-w-none print:h-screen print:flex print:flex-col print:justify-between"
        >
          {/* Top Decorative Sparkles */}
          <div className="absolute top-10 left-10 opacity-30 animate-pulse">
            <Sparkles className="h-10 w-10 text-indigo-400" />
          </div>
          <div className="absolute top-20 right-10 opacity-20">
            <Sparkles className="h-8 w-8 text-indigo-300" />
          </div>

          <div className="p-8 sm:p-12 space-y-10 flex-grow flex flex-col justify-between">
            {/* Header / Brand Details */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider">
                <Ticket className="h-4 w-4" /> Skip The Long Waiting Lines
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                Welcome To
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-300 drop-shadow-sm font-black uppercase">
                  {service?.name || "SimplyTicketz Event"}
                </span>
              </h1>
              {service?.addressline1 && (
                <p className="text-slate-400 flex items-center justify-center gap-1.5 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-indigo-400" />
                  {service.addressline1}, {service.city}
                </p>
              )}
            </div>

            {/* Catchy statement */}
            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Scan, Book & Enjoy! 🚀
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                {standyTextToShow}
              </p>
            </div>

            {/* Big QR Display Container */}
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="bg-white p-6 rounded-[32px] shadow-2xl border-4 border-indigo-500/30 flex items-center justify-center relative">
                <QRCodeSVG value={bookingUrl} size={240} level="H" />
                {/* Center floating icon badge overlay */}
                <div className="absolute bg-indigo-600 text-white p-2 rounded-2xl shadow-md border-2 border-white -bottom-3">
                  <Smartphone className="h-5 w-5" />
                </div>
              </div>
              <p className="text-indigo-400 font-mono text-[11px] mt-2 select-all hover:underline cursor-pointer">
                {bookingUrl}
              </p>
            </div>

            {/* Instructional Steps list */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-6 border-t border-slate-800">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center mx-auto text-sm">
                  1
                </div>
                <p className="text-xs font-bold text-slate-300">Scan QR Code</p>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center mx-auto text-sm">
                  2
                </div>
                <p className="text-xs font-bold text-slate-300">Pick Passes</p>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center mx-auto text-sm">
                  3
                </div>
                <p className="text-xs font-bold text-slate-300">Get Entry QR</p>
              </div>
            </div>

            {/* Footer Trust badge */}
            <div className="pt-4 text-slate-500 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-indigo-500" /> Powered by SimplyTicketz
            </div>
          </div>
        </div>
      </main>

      {/* Edit Statement Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-indigo-600" /> Edit Standy Statement
            </DialogTitle>
            <DialogDescription>
              Modify the subtext on your printable standy poster. Keep it clear, concise, and catchy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="standy-text">Catchy Subtext Statement</Label>
              <Textarea
                id="standy-text"
                rows={4}
                maxLength={200}
                placeholder="Write your catchy statement here..."
                className="rounded-xl focus-visible:ring-indigo-500"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
              <div className="text-right text-[10px] text-slate-400">
                {editText.length} / 200 characters max
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 font-bold"
              onClick={handleSaveText}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save & Apply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />

      {/* Embedded print stylesheets layout */}
      <style>
        {`
        @media print {
          body { background: white; }
          nav, footer, button, .print\\:hidden { display: none !important; }
          .container { width: 100%; max-width: none; padding: 0; margin: 0; }
          main { padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .print\\:border-none { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}
      </style>
    </div>
  );
};

export default QRCodeStandy;