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
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { 
  Store, Loader2, Mail, Phone, MapPin, FileText, 
  ShieldCheck, Building2, Upload, CheckCircle2, 
  CreditCard, ClipboardCheck, Pencil, X, Eye, ExternalLink
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Merchants = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    pan: null,
    aadhaar: null,
    gstn: null
  });
  
  const [formData, setFormData] = useState({
    contact_person_name: '',
    organization_name: '',
    email: '',
    phone_country_code: '91',
    phone: '',
    pan_number: '',
    aadhaar_number: '',
    gstn: '',
    addressline1: '',
    addressline2: '',
    state: '',
    pincode: '',
    country: '1',
    gstn_state: '',
    kyc_completed_sw: false,
    agreement_signed_sw: false,
    status_sw: true,
    update_by: '1'
  });

  const { data: merchants, isLoading: isLoadingMerchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`);
      if (!res.ok) throw new Error('Failed to fetch merchants');
      const json = await res.json();
      return json.data;
    }
  });

  const { data: countries, isLoading: isLoadingCountries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/countries`);
      if (!res.ok) throw new Error('Failed to fetch countries');
      const json = await res.json();
      return json.data;
    }
  });

  const { data: states, isLoading: isLoadingStates } = useQuery({
    queryKey: ['states', formData.country],
    queryFn: async () => {
      if (!formData.country) return [];
      const res = await fetch(`${API_URL}/states?countryId=${formData.country}`);
      if (!res.ok) throw new Error('Failed to fetch states');
      const json = await res.json();
      return json.data;
    },
    enabled: !!formData.country
  });

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
    const json = await res.json();
    return json.data.path;
  };

  const viewDocument = async (path: string) => {
    try {
      const res = await fetch(`${API_URL}/documents/signed-url?path=${path}`);
      if (!res.ok) throw new Error('Failed to get document link');
      const json = await res.json();
      window.open(json.data, '_blank');
    } catch (err: any) {
      showError(err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFiles({ pan: null, aadhaar: null, gstn: null });
    setFormData({
      contact_person_name: '',
      organization_name: '',
      email: '',
      phone_country_code: '91',
      phone: '',
      pan_number: '',
      aadhaar_number: '',
      gstn: '',
      addressline1: '',
      addressline2: '',
      state: '',
      pincode: '',
      country: '1',
      gstn_state: '',
      kyc_completed_sw: false,
      agreement_signed_sw: false,
      status_sw: true,
      update_by: '1'
    });
  };

  const createMutation = useMutation({
    mutationFn: async (newMerchant: any) => {
      if (!files.pan || !files.aadhaar) {
        throw new Error('PAN and AADHAAR documents are mandatory for new registration');
      }

      const pan_docid = await uploadFile(files.pan);
      const aadhaar_docid = await uploadFile(files.aadhaar);
      let gstn_docid = '';
      
      if (files.gstn) {
        gstn_docid = await uploadFile(files.gstn);
      }

      const payload = {
        ...newMerchant,
        pan_docid,
        aadhaar_docid,
        gstn_docid,
        update_date: new Date().toISOString(),
        kyc_completed_date: newMerchant.kyc_completed_sw ? new Date().toISOString() : null,
        agreement_signed_date: newMerchant.agreement_signed_sw ? new Date().toISOString() : null,
        phone_country_code: parseInt(newMerchant.phone_country_code),
        state: newMerchant.state ? parseInt(newMerchant.state) : null,
        pincode: newMerchant.pincode ? parseInt(newMerchant.pincode) : null,
        country: parseInt(newMerchant.country),
        gstn_state: newMerchant.gstn_state ? parseInt(newMerchant.gstn_state) : null,
        update_by: parseInt(newMerchant.update_by)
      };

      const res = await fetch(`${API_URL}/merchants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to register merchant');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      showSuccess('Merchant registered successfully!');
      resetForm();
    },
    onError: (error: any) => {
      showError(error.message || 'Error registering merchant');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedMerchant: any) => {
      let pan_docid = updatedMerchant.pan_docid;
      let aadhaar_docid = updatedMerchant.aadhaar_docid;
      let gstn_docid = updatedMerchant.gstn_docid;

      if (files.pan) pan_docid = await uploadFile(files.pan);
      if (files.aadhaar) aadhaar_docid = await uploadFile(files.aadhaar);
      if (files.gstn) gstn_docid = await uploadFile(files.gstn);

      const payload = {
        ...updatedMerchant,
        pan_docid,
        aadhaar_docid,
        gstn_docid,
        update_date: new Date().toISOString(),
        kyc_completed_date: updatedMerchant.kyc_completed_sw ? (updatedMerchant.kyc_completed_date || new Date().toISOString()) : null,
        agreement_signed_date: updatedMerchant.agreement_signed_sw ? (updatedMerchant.agreement_signed_date || new Date().toISOString()) : null,
        phone_country_code: parseInt(updatedMerchant.phone_country_code),
        state: updatedMerchant.state ? parseInt(updatedMerchant.state) : null,
        pincode: updatedMerchant.pincode ? parseInt(updatedMerchant.pincode) : null,
        country: parseInt(updatedMerchant.country),
        gstn_state: updatedMerchant.gstn_state ? parseInt(updatedMerchant.gstn_state) : null,
        update_by: parseInt(updatedMerchant.update_by)
      };

      const res = await fetch(`${API_URL}/merchants/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to update merchant');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      showSuccess('Merchant updated successfully!');
      resetForm();
    },
    onError: (error: any) => {
      showError(error.message || 'Error updating merchant');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (merchant: any) => {
    setEditingId(merchant.id);
    setFormData({
      contact_person_name: merchant.contact_person_name || '',
      organization_name: merchant.organization_name || '',
      email: merchant.email || '',
      phone_country_code: merchant.phone_country_code?.toString() || '91',
      phone: merchant.phone || '',
      pan_number: merchant.pan_number || '',
      aadhaar_number: merchant.aadhaar_number || '',
      gstn: merchant.gstn || '',
      addressline1: merchant.addressline1 || '',
      addressline2: merchant.addressline2 || '',
      state: merchant.state?.toString() || '',
      pincode: merchant.pincode?.toString() || '',
      country: merchant.country?.toString() || '1',
      gstn_state: merchant.gstn_state?.toString() || '',
      kyc_completed_sw: !!merchant.kyc_completed_sw,
      agreement_signed_sw: !!merchant.agreement_signed_sw,
      status_sw: !!merchant.status_sw,
      update_by: merchant.update_by?.toString() || '1'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {editingId ? 'Edit Merchant' : 'Merchant Onboarding'}
              </h1>
              <p className="text-slate-500">
                {editingId ? `Updating profile for ${formData.organization_name}` : 'Complete the profile to start selling tickets'}
              </p>
            </div>
            {editingId && (
              <Button variant="outline" onClick={resetForm} className="gap-2">
                <X className="h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <Card className="xl:col-span-2 shadow-lg border-indigo-100">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Building2 className="h-5 w-5" />
                  Merchant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <form id="merchant-form" onSubmit={handleSubmit} className="space-y-8">
                  {/* Section 1: Basic & Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Organization Name *</Label>
                      <Input 
                        required
                        placeholder="Legal Entity Name"
                        value={formData.organization_name}
                        onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Person *</Label>
                      <Input 
                        required
                        placeholder="Full Name"
                        value={formData.contact_person_name}
                        onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input 
                        type="email"
                        placeholder="business@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1 space-y-2">
                        <Label>Code</Label>
                        <Input 
                          placeholder="91"
                          value={formData.phone_country_code}
                          onChange={(e) => setFormData({...formData, phone_country_code: e.target.value})}
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label>Phone Number</Label>
                        <Input 
                          placeholder="10-digit mobile"
                          maxLength={10}
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Identity & Tax */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Identity & Tax
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>PAN Number</Label>
                        <Input 
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          className="uppercase"
                          value={formData.pan_number}
                          onChange={(e) => setFormData({...formData, pan_number: e.target.value.toUpperCase()})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aadhaar Number</Label>
                        <Input 
                          placeholder="12-digit number"
                          maxLength={12}
                          value={formData.aadhaar_number}
                          onChange={(e) => setFormData({...formData, aadhaar_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GSTN</Label>
                        <Input 
                          placeholder="GST Identification Number"
                          value={formData.gstn}
                          onChange={(e) => setFormData({...formData, gstn: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Address */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Business Address
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input 
                          placeholder="Street, Building"
                          value={formData.addressline1}
                          onChange={(e) => setFormData({...formData, addressline1: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Address Line 2</Label>
                        <Input 
                          placeholder="Area, Landmark"
                          value={formData.addressline2}
                          onChange={(e) => setFormData({...formData, addressline2: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4 md:col-span-2">
                        <div className="space-y-2">
                          <Label>Country *</Label>
                          <Select 
                            value={formData.country} 
                            onValueChange={(value) => setFormData({...formData, country: value, state: ''})}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={isLoadingCountries ? "Loading..." : "Select Country"} />
                            </SelectTrigger>
                            <SelectContent>
                              {countries?.map((country: any) => (
                                <SelectItem key={country.id} value={country.id.toString()}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>State *</Label>
                          <Select 
                            value={formData.state} 
                            onValueChange={(value) => setFormData({...formData, state: value})}
                            disabled={!formData.country || isLoadingStates}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={!formData.country ? "Select Country First" : (isLoadingStates ? "Loading..." : "Select State")} />
                            </SelectTrigger>
                            <SelectContent>
                              {states?.map((state: any) => (
                                <SelectItem key={state.id} value={state.id.toString()}>
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Pincode</Label>
                          <Input 
                            type="number"
                            placeholder="6-digit"
                            value={formData.pincode}
                            onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Compliance & Status */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-indigo-600" /> Compliance & Status
                    </h3>
                    <div className="flex flex-wrap gap-8">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="kyc" 
                          checked={formData.kyc_completed_sw}
                          onCheckedChange={(checked) => setFormData({...formData, kyc_completed_sw: !!checked})}
                        />
                        <Label htmlFor="kyc" className="cursor-pointer">KYC Completed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="agreement" 
                          checked={formData.agreement_signed_sw}
                          onCheckedChange={(checked) => setFormData({...formData, agreement_signed_sw: !!checked})}
                        />
                        <Label htmlFor="agreement" className="cursor-pointer">Agreement Signed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="status" 
                          checked={formData.status_sw}
                          onCheckedChange={(checked) => setFormData({...formData, status_sw: !!checked})}
                        />
                        <Label htmlFor="status" className="cursor-pointer">Active Status</Label>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Sidebar: Document Uploads & Action */}
            <div className="space-y-8">
              <Card className="shadow-lg border-indigo-100 overflow-hidden">
                <CardHeader className="bg-indigo-600 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-5 w-5" />
                    Required Documents
                  </CardTitle>
                  <CardDescription className="text-indigo-100">
                    {editingId ? 'Upload new files to replace existing ones' : 'Upload clear scans for verification'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">PAN Card {editingId ? '' : '*'}</Label>
                    <div className="relative group">
                      <Input 
                        type="file" 
                        accept=".pdf,.jpg,.png"
                        onChange={(e) => handleFileChange(e, 'pan')}
                        className="cursor-pointer bg-slate-50 border-dashed border-2 hover:border-indigo-400 transition-colors"
                      />
                      {files.pan && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Aadhaar Card {editingId ? '' : '*'}</Label>
                    <div className="relative group">
                      <Input 
                        type="file" 
                        accept=".pdf,.jpg,.png"
                        onChange={(e) => handleFileChange(e, 'aadhaar')}
                        className="cursor-pointer bg-slate-50 border-dashed border-2 hover:border-indigo-400 transition-colors"
                      />
                      {files.aadhaar && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">GSTN Certificate</Label>
                    <div className="relative group">
                      <Input 
                        type="file" 
                        accept=".pdf,.jpg,.png"
                        onChange={(e) => handleFileChange(e, 'gstn')}
                        className="cursor-pointer bg-slate-50 border-dashed border-2 hover:border-indigo-400 transition-colors"
                      />
                      {files.gstn && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                form="merchant-form"
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-xl shadow-indigo-100"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (editingId ? 'Update Merchant' : 'Complete Registration')}
              </Button>

              <Card className="shadow-md border-slate-200">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Total Merchants</span>
                    <span className="font-bold">{merchants?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Active Partners</span>
                    <span className="font-bold text-green-600">
                      {merchants?.filter((m: any) => m.status_sw).length || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Merchants Table */}
          <Card className="shadow-md border-slate-200">
            <CardHeader>
              <CardTitle>Merchant Directory</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMerchants ? (
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
                        <TableHead className="font-bold">Identity</TableHead>
                        <TableHead className="font-bold">Documents</TableHead>
                        <TableHead className="font-bold">Compliance</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        <TableHead className="font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants?.map((merchant: any) => (
                        <TableRow key={merchant.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{merchant.organization_name}</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {merchant.addressline1 || 'No address'}
                              </span>
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
                              <span className="text-[10px] font-bold text-slate-400 uppercase">PAN: {merchant.pan_number || 'N/A'}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">AADHAAR: {merchant.aadhaar_number || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {merchant.pan_docid && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 px-2 text-[10px] gap-1"
                                  onClick={() => viewDocument(merchant.pan_docid)}
                                >
                                  <Eye className="h-3 w-3" /> PAN
                                </Button>
                              )}
                              {merchant.aadhaar_docid && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 px-2 text-[10px] gap-1"
                                  onClick={() => viewDocument(merchant.aadhaar_docid)}
                                >
                                  <Eye className="h-3 w-3" /> AADHAAR
                                </Button>
                              )}
                              {merchant.gstn_docid && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 px-2 text-[10px] gap-1"
                                  onClick={() => viewDocument(merchant.gstn_docid)}
                                >
                                  <Eye className="h-3 w-3" /> GSTN
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {merchant.kyc_completed_sw && (
                                <ShieldCheck className="h-5 w-5 text-green-500" title="KYC Verified" />
                              )}
                              {merchant.agreement_signed_sw && (
                                <FileText className="h-5 w-5 text-blue-500" title="Agreement Signed" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${merchant.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {merchant.status_sw ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => handleEdit(merchant)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Merchants;