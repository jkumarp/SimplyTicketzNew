"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError } from "@/utils/toast";
import { Store, Loader2, Mail, Phone, MapPin, FileText, ShieldCheck, Building2 } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Merchants = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    contact_person_name: '',
    organization_name: '',
    email: '',
    phone_country_code: 91,
    phone: '',
    pan_number: '',
    addressline1: '',
    addressline2: '',
    state: '',
    pincode: '',
    country: 1,
    gstn_state: '',
    kyc_completed_sw: false,
    aadhaar_number: '',
    agreement_signed_sw: false,
    db_connection: '',
    gstn: '',
    pan_docid: '',
    aadhaar_docid: '',
    gstn_docid: '',
    update_by: 1,
    status_sw: true
  });

  const { data: merchants, isLoading } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`);
      if (!res.ok) throw new Error('Failed to fetch merchants');
      const json = await res.json();
      return json.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (newMerchant: any) => {
      const res = await fetch(`${API_URL}/merchants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMerchant,
          update_date: new Date().toISOString(),
          // Convert numeric strings to numbers where necessary
          phone_country_code: Number(newMerchant.phone_country_code),
          state: newMerchant.state ? Number(newMerchant.state) : null,
          pincode: newMerchant.pincode ? Number(newMerchant.pincode) : null,
          country: Number(newMerchant.country),
          gstn_state: newMerchant.gstn_state ? Number(newMerchant.gstn_state) : null,
          update_by: Number(newMerchant.update_by)
        })
      });
      if (!res.ok) throw new Error('Failed to register merchant');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      showSuccess('Merchant registered successfully!');
      // Reset form
      setFormData({
        contact_person_name: '',
        organization_name: '',
        email: '',
        phone_country_code: 91,
        phone: '',
        pan_number: '',
        addressline1: '',
        addressline2: '',
        state: '',
        pincode: '',
        country: 1,
        gstn_state: '',
        kyc_completed_sw: false,
        aadhaar_number: '',
        agreement_signed_sw: false,
        db_connection: '',
        gstn: '',
        pan_docid: '',
        aadhaar_docid: '',
        gstn_docid: '',
        update_by: 1,
        status_sw: true
      });
    },
    onError: (error: any) => {
      showError(error.message || 'Error registering merchant');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Merchant Management</h1>
              <p className="text-slate-500">Register and manage your event partners</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Registration Form */}
            <Card className="xl:col-span-1 h-fit shadow-lg border-indigo-100">
              <CardHeader className="bg-indigo-50/50 rounded-t-xl">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Store className="h-5 w-5" />
                  Register Merchant
                </CardTitle>
                <CardDescription>Enter organization and contact details</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Basic Info
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Organization Name *</label>
                        <Input 
                          required
                          placeholder="Acme Events Ltd"
                          value={formData.organization_name}
                          onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Contact Person *</label>
                        <Input 
                          required
                          placeholder="Jane Smith"
                          value={formData.contact_person_name}
                          onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Contact Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input 
                          type="email"
                          placeholder="contact@acme.com"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input 
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Address
                    </h3>
                    <div className="space-y-2">
                      <Input 
                        placeholder="Address Line 1"
                        value={formData.addressline1}
                        onChange={(e) => setFormData({...formData, addressline1: e.target.value})}
                      />
                      <Input 
                        placeholder="Address Line 2"
                        value={formData.addressline2}
                        onChange={(e) => setFormData({...formData, addressline2: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        placeholder="Pincode"
                        value={formData.pincode}
                        onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                      />
                      <Input 
                        placeholder="State ID"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Compliance
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        placeholder="PAN Number"
                        value={formData.pan_number}
                        onChange={(e) => setFormData({...formData, pan_number: e.target.value})}
                      />
                      <Input 
                        placeholder="GSTN"
                        value={formData.gstn}
                        onChange={(e) => setFormData({...formData, gstn: e.target.value})}
                      />
                    </div>
                    <Input 
                      placeholder="Aadhaar Number"
                      value={formData.aadhaar_number}
                      onChange={(e) => setFormData({...formData, aadhaar_number: e.target.value})}
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="kyc" 
                        checked={formData.kyc_completed_sw}
                        onCheckedChange={(checked) => setFormData({...formData, kyc_completed_sw: !!checked})}
                      />
                      <label htmlFor="kyc" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        KYC Completed
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="agreement" 
                        checked={formData.agreement_signed_sw}
                        onCheckedChange={(checked) => setFormData({...formData, agreement_signed_sw: !!checked})}
                      />
                      <label htmlFor="agreement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Agreement Signed
                      </label>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-semibold rounded-xl shadow-lg shadow-indigo-100"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Register Merchant'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Merchants List */}
            <Card className="xl:col-span-2 shadow-md border-slate-200">
              <CardHeader>
                <CardTitle>Registered Merchants</CardTitle>
                <CardDescription>View and manage existing merchant partnerships</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold">Organization</TableHead>
                          <TableHead className="font-bold">Contact</TableHead>
                          <TableHead className="font-bold">Compliance</TableHead>
                          <TableHead className="font-bold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {merchants?.map((merchant: any) => (
                          <TableRow key={merchant.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{merchant.organization_name}</span>
                                <span className="text-xs text-slate-500">{merchant.addressline1}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm">
                                <span className="font-medium">{merchant.contact_person_name}</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {merchant.email || 'N/A'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {merchant.kyc_completed_sw && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100">
                                    <ShieldCheck className="h-3 w-3" /> KYC
                                  </span>
                                )}
                                {merchant.agreement_signed_sw && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                    <FileText className="h-3 w-3" /> AGREEMENT
                                  </span>
                                )}
                                {!merchant.kyc_completed_sw && !merchant.agreement_signed_sw && (
                                  <span className="text-xs text-slate-400 italic">Pending</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${merchant.status_sw ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                {merchant.status_sw ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!merchants || merchants.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 text-slate-400 italic">
                              No merchants registered yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Merchants;