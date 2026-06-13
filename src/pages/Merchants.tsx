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
  CreditCard, ClipboardCheck, Pencil, X, Eye,
  Briefcase, Globe, FileCheck
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Merchants = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    pan: null,
    aadhaar: null,
    gstn: null,
    sin: null,
    tin: null,
    moa: null,
    aoa: null,
    trading: null,
    director: null,
    partnership: null
  });
  
  const [formData, setFormData] = useState({
    contact_person_name: '',
    organization_name: '',
    brand_name: '',
    email: '',
    phone_country_code: '91',
    phone: '',
    contact_phone: '',
    contact_email: '',
    pan_number: '',
    aadhaar_number: '',
    gstn: '',
    sin_number: '',
    tin_number: '',
    addressline1: '',
    addressline2: '',
    city: '',
    state: '',
    pincode: '',
    country: '1',
    gstn_state: '',
    kyc_completed_sw: false,
    agreement_signed_sw: false,
    status_sw: true,
    update_by: '1'
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const { data: merchants, isLoading: isLoadingMerchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch merchants');
      const json = await res.json();
      return json.data;
    }
  });

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/countries`, {
        headers: { ...getAuthHeader() }
      });
      const json = await res.json();
      return json.data;
    }
  });

  const { data: states, isLoading: isLoadingStates } = useQuery({
    queryKey: ['states', formData.country],
    queryFn: async () => {
      if (!formData.country) return [];
      const res = await fetch(`${API_URL}/states?countryId=${formData.country}`, {
        headers: { ...getAuthHeader() }
      });
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
      headers: { ...getAuthHeader() },
      body: formData
    });
    if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
    const json = await res.json();
    return json.data.path;
  };

  const viewDocument = async (path: string) => {
    try {
      const res = await fetch(`${API_URL}/documents/signed-url?path=${path}`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to get document link');
      const json = await res.json();
      window.open(json.data, '_blank');
    } catch (err: any) {
      showError(err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFiles({ 
      pan: null, aadhaar: null, gstn: null, sin: null, tin: null, 
      moa: null, aoa: null, trading: null, director: null, partnership: null 
    });
    setFormData({
      contact_person_name: '',
      organization_name: '',
      brand_name: '',
      email: '',
      phone_country_code: '91',
      phone: '',
      contact_phone: '',
      contact_email: '',
      pan_number: '',
      aadhaar_number: '',
      gstn: '',
      sin_number: '',
      tin_number: '',
      addressline1: '',
      addressline2: '',
      city: '',
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
        throw new Error('PAN and AADHAAR documents are mandatory');
      }

      const pan_docid = await uploadFile(files.pan);
      const aadhaar_docid = await uploadFile(files.aadhaar);
      
      // Optional files
      const gstn_docid = files.gstn ? await uploadFile(files.gstn) : '';
      const sin_docid = files.sin ? await uploadFile(files.sin) : '';
      const tin_docid = files.tin ? await uploadFile(files.tin) : '';
      const moa_docid = files.moa ? await uploadFile(files.moa) : '';
      const aoa_docid = files.aoa ? await uploadFile(files.aoa) : '';
      const trading_certificate_docid = files.trading ? await uploadFile(files.trading) : '';
      const director_information_docid = files.director ? await uploadFile(files.director) : '';
      const partnership_agreement_docid = files.partnership ? await uploadFile(files.partnership) : '';

      const payload = {
        ...newMerchant,
        pan_docid,
        aadhaar_docid,
        gstn_docid,
        sin_docid,
        tin_docid,
        moa_docid,
        aoa_docid,
        trading_certificate_docid,
        director_information_docid,
        partnership_agreement_docid,
        update_date: new Date().toISOString(),
        phone_country_code: parseInt(newMerchant.phone_country_code),
        state: newMerchant.state ? parseInt(newMerchant.state) : null,
        pincode: newMerchant.pincode ? parseInt(newMerchant.pincode) : null,
        country: parseInt(newMerchant.country),
        update_by: parseInt(newMerchant.update_by)
      };

      const res = await fetch(`${API_URL}/merchants`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
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
      showError(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedMerchant: any) => {
      const docIds: any = {};
      
      // Handle file uploads for any new files selected
      const fileKeys = [
        { key: 'pan', field: 'pan_docid' },
        { key: 'aadhaar', field: 'aadhaar_docid' },
        { key: 'gstn', field: 'gstn_docid' },
        { key: 'sin', field: 'sin_docid' },
        { key: 'tin', field: 'tin_docid' },
        { key: 'moa', field: 'moa_docid' },
        { key: 'aoa', field: 'aoa_docid' },
        { key: 'trading', field: 'trading_certificate_docid' },
        { key: 'director', field: 'director_information_docid' },
        { key: 'partnership', field: 'partnership_agreement_docid' }
      ];

      for (const item of fileKeys) {
        if (files[item.key]) {
          docIds[item.field] = await uploadFile(files[item.key]!);
        }
      }

      const payload = {
        ...updatedMerchant,
        ...docIds,
        update_date: new Date().toISOString(),
        phone_country_code: parseInt(updatedMerchant.phone_country_code),
        state: updatedMerchant.state ? parseInt(updatedMerchant.state) : null,
        gstn: updatedMerchant.gstn ? parseInt(updatedMerchant.gstn) : null,
        gstn_state: updatedMerchant.gstn_state ? parseInt(updatedMerchant.gstn_state) : null,
        pincode: updatedMerchant.pincode ? parseInt(updatedMerchant.pincode) : null,
        country: parseInt(updatedMerchant.country),
        update_by: parseInt(updatedMerchant.update_by)
      };

      const res = await fetch(`${API_URL}/merchants/${editingId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
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
      showError(error.message);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  const handleEdit = (merchant: any) => {
    setEditingId(merchant.id);
    setFormData({
      contact_person_name: merchant.contact_person_name || '',
      organization_name: merchant.organization_name || '',
      brand_name: merchant.brand_name || '',
      email: merchant.email || '',
      phone_country_code: merchant.phone_country_code?.toString() || '91',
      phone: merchant.phone || '',
      contact_phone: merchant.contact_phone || '',
      contact_email: merchant.contact_email || '',
      pan_number: merchant.pan_number || '',
      aadhaar_number: merchant.aadhaar_number || '',
      gstn: merchant.gstn || '',
      sin_number: merchant.sin_number || '',
      tin_number: merchant.tin_number || '',
      addressline1: merchant.addressline1 || '',
      addressline2: merchant.addressline2 || '',
      city: merchant.city || '',
      state: merchant.state?.toString() || '',
      pincode: merchant.pincode?.toString() || '',
      country: merchant.country?.toString() || '1',
      gstn_state: merchant.gstn_state?.toString() || '',
      kyc_completed_sw: !!merchant.kyc_completed_sw,
      agreement_signed_sw: !!merchant.agreement_signed_sw,
      status_sw: !!merchant.status_sw,
      update_by: '1'
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
              <p className="text-slate-500">Complete the profile and upload necessary documents</p>
            </div>
            {editingId && (
              <Button variant="outline" onClick={resetForm} className="gap-2">
                <X className="h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <Card key={editingId || 'new-merchant'} className="xl:col-span-2 shadow-lg border-indigo-100">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Building2 className="h-5 w-5" />
                  Merchant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <form id="merchant-form" onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Organization Name *</Label>
                      <Input 
                        required
                        value={formData.organization_name}
                        onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand Name</Label>
                      <Input 
                        value={formData.brand_name}
                        onChange={(e) => setFormData({...formData, brand_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Person *</Label>
                      <Input 
                        required
                        value={formData.contact_person_name}
                        onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Email Address</Label>
                      <Input 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1 space-y-2">
                        <Label>Code</Label>
                        <Input 
                          value={formData.phone_country_code}
                          onChange={(e) => setFormData({...formData, phone_country_code: e.target.value})}
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label>Primary Phone Number</Label>
                        <Input 
                          maxLength={10}
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Contact Phone</Label>
                      <Input 
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Contact Email</Label>
                      <Input 
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Identity & Tax
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>PAN Number</Label>
                        <Input 
                          maxLength={10}
                          className="uppercase"
                          value={formData.pan_number}
                          onChange={(e) => setFormData({...formData, pan_number: e.target.value.toUpperCase()})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aadhaar Number</Label>
                        <Input 
                          maxLength={12}
                          value={formData.aadhaar_number}
                          onChange={(e) => setFormData({...formData, aadhaar_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GSTN</Label>
                        <Input 
                          value={formData.gstn}
                          onChange={(e) => setFormData({...formData, gstn: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SIN Number</Label>
                        <Input 
                          value={formData.sin_number}
                          onChange={(e) => setFormData({...formData, sin_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TIN Number</Label>
                        <Input 
                          value={formData.tin_number}
                          onChange={(e) => setFormData({...formData, tin_number: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Business Address
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input 
                          value={formData.addressline1}
                          onChange={(e) => setFormData({...formData, addressline1: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Address Line 2</Label>
                        <Input 
                          value={formData.addressline2}
                          onChange={(e) => setFormData({...formData, addressline2: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input 
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4 md:col-span-1">
                        <div className="space-y-2">
                          <Label>Country *</Label>
                          <Select 
                            value={formData.country} 
                            onValueChange={(value) => setFormData({...formData, country: value, state: ''})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Country" />
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select State" />
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
                            value={formData.pincode}
                            onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                    <div className="flex flex-wrap gap-8">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="kyc" 
                          checked={formData.kyc_completed_sw}
                          onCheckedChange={(checked) => setFormData({...formData, kyc_completed_sw: !!checked})}
                        />
                        <Label htmlFor="kyc">KYC Completed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="agreement" 
                          checked={formData.agreement_signed_sw}
                          onCheckedChange={(checked) => setFormData({...formData, agreement_signed_sw: !!checked})}
                        />
                        <Label htmlFor="agreement">Agreement Signed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="status" 
                          checked={formData.status_sw}
                          onCheckedChange={(checked) => setFormData({...formData, status_sw: !!checked})}
                        />
                        <Label htmlFor="status">Active Status</Label>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card key={`docs-${editingId || 'new'}`} className="shadow-lg border-indigo-100 overflow-hidden">
                <CardHeader className="bg-indigo-600 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-5 w-5" />
                    Mandatory Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>PAN Card *</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'pan')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Aadhaar Card *</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'aadhaar')} />
                  </div>
                  <div className="space-y-2">
                    <Label>GSTN Certificate</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'gstn')} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-900 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileCheck className="h-5 w-5" />
                    Other Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>SIN Document</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'sin')} />
                  </div>
                  <div className="space-y-2">
                    <Label>TIN Document</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'tin')} />
                  </div>
                  <div className="space-y-2">
                    <Label>MOA Document</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'moa')} />
                  </div>
                  <div className="space-y-2">
                    <Label>AOA Document</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'aoa')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Trading Certificate</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'trading')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Director Information</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'director')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Partnership Agreement</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'partnership')} />
                  </div>
                </CardContent>
              </Card>

              <Button 
                form="merchant-form"
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-100"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Uploading & Saving...</span>
                  </div>
                ) : (editingId ? 'Update Merchant' : 'Complete Registration')}
              </Button>
            </div>
          </div>

          <Card className="shadow-md border-slate-200">
            <CardHeader>
              <CardTitle>Merchant Directory</CardTitle>
              <CardDescription>Manage registered event organizers and their verification status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMerchants ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold">Organization</TableHead>
                        <TableHead className="font-bold">Contact</TableHead>
                        <TableHead className="font-bold">Location</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        <TableHead className="text-right font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants?.map((merchant: any) => (
                        <TableRow key={merchant.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{merchant.organization_name}</span>
                              {merchant.brand_name && <span className="text-xs text-indigo-600 font-medium">{merchant.brand_name}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm gap-1">
                              <span className="font-medium text-slate-700">{merchant.contact_person_name}</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1"><Mail className="h-3 w-3" /> {merchant.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {merchant.city || 'N/A'}, {states?.find((s: any) => s.id === merchant.state)?.name || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${merchant.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {merchant.status_sw ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                              {merchant.kyc_completed_sw && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                                  <CheckCircle2 className="h-3 w-3" /> KYC VERIFIED
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => handleEdit(merchant)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
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