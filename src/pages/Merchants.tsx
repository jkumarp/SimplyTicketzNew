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
  CreditCard, ClipboardCheck, Pencil, X, Eye
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
      const res = await fetch(`${API_URL}/countries`);
      const json = await res.json();
      return json.data;
    }
  });

  const { data: states, isLoading: isLoadingStates } = useQuery({
    queryKey: ['states', formData.country],
    queryFn: async () => {
      if (!formData.country) return [];
      const res = await fetch(`${API_URL}/states?countryId=${formData.country}`);
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
        throw new Error('PAN and AADHAAR documents are mandatory');
      }

      const pan_docid = await uploadFile(files.pan);
      const aadhaar_docid = await uploadFile(files.aadhaar);
      let gstn_docid = '';
      if (files.gstn) gstn_docid = await uploadFile(files.gstn);

      const payload = {
        ...newMerchant,
        pan_docid,
        aadhaar_docid,
        gstn_docid,
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
        phone_country_code: parseInt(updatedMerchant.phone_country_code),
        state: updatedMerchant.state ? parseInt(updatedMerchant.state) : null,
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
                      <Label>Contact Person *</Label>
                      <Input 
                        required
                        value={formData.contact_person_name}
                        onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
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
                        <Label>Phone Number</Label>
                        <Input 
                          maxLength={10}
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Identity & Tax
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <div className="grid grid-cols-3 gap-4 md:col-span-2">
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
              <Card className="shadow-lg border-indigo-100 overflow-hidden">
                <CardHeader className="bg-indigo-600 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-5 w-5" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>PAN Card</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'pan')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Aadhaar Card</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'aadhaar')} />
                  </div>
                  <div className="space-y-2">
                    <Label>GSTN Certificate</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'gstn')} />
                  </div>
                </CardContent>
              </Card>

              <Button 
                form="merchant-form"
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Merchant' : 'Complete Registration')}
              </Button>
            </div>
          </div>

          <Card className="shadow-md border-slate-200">
            <CardHeader>
              <CardTitle>Merchant Directory</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMerchants ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchants?.map((merchant: any) => (
                      <TableRow key={merchant.id}>
                        <TableCell className="font-bold">{merchant.organization_name}</TableCell>
                        <TableCell>{merchant.contact_person_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {merchant.pan_docid && <Button size="sm" variant="outline" onClick={() => viewDocument(merchant.pan_docid)}>PAN</Button>}
                            {merchant.aadhaar_docid && <Button size="sm" variant="outline" onClick={() => viewDocument(merchant.aadhaar_docid)}>AADHAAR</Button>}
                          </div>
                        </TableCell>
                        <TableCell>{merchant.status_sw ? 'ACTIVE' : 'INACTIVE'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(merchant)}><Pencil className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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