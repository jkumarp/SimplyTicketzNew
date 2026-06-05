"use client";

import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const MerchantManageTickets = () => {
  const { serviceId } = useParams();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-grow container px-4 md:px-8 py-12">
        <h1 className="text-3xl font-bold text-slate-900">Manage Tickets</h1>
        <p className="text-slate-500">Service ID: {serviceId}</p>
        {/* Ticket management table will go here */}
      </main>
      <Footer />
    </div>
  );
};

export default MerchantManageTickets;