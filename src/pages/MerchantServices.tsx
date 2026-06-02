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
  Briefcase, Loader2, Building2, MapPin, Clock, 
  CreditCard, Calendar, Pencil, X, Plus, 
  QrCode, Globe, Palette, Image as ImageIcon
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const MerchantServices = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    merchant_id: '',
    name: '',
    logo_image_path: '',
    single_qr_sw: false,
    background_color: '#ffffff',
    beneficiary_name: '',
    account_type: 'Savings',
    bank_account_number: '',
    bank_name: '',
    branch_name: '',
    bank_ifsc: '',
    start_time: '09:00',
    end_time: '18:00',
    mon_working_sw: true,
    tue_working_sw: true,
    wed_working_sw: true,
    thu_working_sw: true,
    fri_working_sw: true,
    sat_working_sw: false,
    sun_working_sw: false,
    addressline1: '',
    addressline2: '',
    state: '',
    pincode: '',
    country: '1',
    location_coordinates: '',
    encrypted_url: '',
    status_sw: true,
    update_by: '1'
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Queries
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['merchant-services'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch services');
      return (await res.json()).data;
    }
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`, {
        headers: { ...getAuthHeader() }
      });
      return (await res.json()).data;
    }
  });

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/countries`);
      return (await res.json()).data;
    }
  });

  const { data: states } = useQuery({
    queryKey: ['states', formData.country],
    queryFn: async () => {
      if (!formData.country) return [];
      const res = await fetch(`${API_URL}/states?countryId=${formData.country}`);
      return (await res.json()).data;
    },
    enabled: !!formData.country
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      merchant_id: '',
      name: '',
      logo_image_path: '',
      single_qr_sw: false,
      background_color: '#ffffff',
      beneficiary_name: '',
      account_type: 'Savings',
      bank_account_number: '',
      bank_name: '',
      branch_name: '',
      bank_ifsc: '',
      start_time: '09:00',
      end_time: '18:00',
      mon_working_sw: true,
      tue_working_sw: true,
      wed_working_sw: true,
      thu_working_sw: true,
      fri_working_sw: true,
      sat_working_sw: false,
      sun_working_sw: false,
      addressline1: '',
      addressline2: '',
      state: '',
      pincode: '',
      country: '1',
      location_coordinates: '',
      encrypted_url: '',
      status_sw: true,
      update_by: '1'
    });
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        merchant_id: parseInt(data.merchant_id),
        state: data.state ? parseInt(data.state) : null,
        pincode: data.pincode ? parseInt(data.pincode) : null,
        country: parseInt(data.country),
        update_by: parseInt(data.update_by)
      };

      const url = editingId ? `${API_URL}/merchant-services/${editingId}` : `${API_URL}/merchant-services`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Operation failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-services'] });
      showSuccess(editingId ? 'Service updated!' : 'Service created!');
      resetForm();
    },
    onError: (error: any) => showError(error.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.merchant_id) return showError("Please select a Merchant");
    mutation.mutate(formData);
  };

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    setFormData({
      ...service,
      merchant_id: service.merchant_id.toString(),
      state: service.state?.toString() || '',
      country: service.country?.toString() || '1',
      pincode: service.pincode?.toString() || '',
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
              <h1 className="text-3xl font-bold text-slate-900">Merchant Services</h1>
              <p className="text-slate-500">Configure and manage specific services offered by merchants</p>
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
                  <Briefcase className="h-5 w-5" />
                  Service Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <form id="service-form" onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Associated Merchant *</Label>
                      <Select 
                        value={formData.merchant_id} 
                        onValueChange={(v) => setFormData({...formData, merchant_id: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Merchant" />
                        </SelectTrigger>
                        <SelectContent>
                          {merchants?.map((m: any) => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.organization_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Service Name *</Label>
                      <Input 
                        required
                        placeholder="e.g. VIP Lounge Access"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Banking Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Settlement Banking
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Beneficiary Name</Label>
                        <Input 
                          value={formData.beneficiary_name}
                          onChange={(e) => setFormData({...formData, beneficiary_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Type</Label>
                        <Select value={formData.account_type} onValueChange={(v) => setFormData({...formData, account_type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Savings">Savings</SelectItem>
                            <SelectItem value="Current">Current</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input 
                          value={formData.bank_account_number}
                          onChange={(e) => setFormData({...formData, bank_account_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input 
                          value={formData.bank_name}
                          onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Branch Name</Label>
                        <Input 
                          value={formData.branch_name}
                          onChange={(e) => setFormData({...formData, branch_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IFSC Code</Label>
                        <Input 
                          value={formData.bank_ifsc}
                          onChange={(e) => setFormData({...formData, bank_ifsc: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Operating Hours
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Working Days</Label>
                        <div className="flex flex-wrap gap-3 pt-2">
                          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                            <div key={day} className="flex items-center gap-1.5">
                              <Checkbox 
                                id={day} 
                                checked={(formData as any)[`${day}_working_sw`]} 
                                onCheckedChange={(c) => setFormData({...formData, [`${day}_working_sw`]: !!c})}
                              />
                              <Label htmlFor={day} className="text-xs uppercase">{day}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Service Location
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input value={formData.addressline1} onChange={(e) => setFormData({...formData, addressline1: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Coordinates (Lat, Long)</Label>
                        <Input placeholder="12.9716, 77.5946" value={formData.location_coordinates} onChange={(e) => setFormData({...formData, location_coordinates: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-3 gap-4 md:col-span-2">
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Select value={formData.country} onValueChange={(v) => setFormData({...formData, country: v, state: ''})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {countries?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Select value={formData.state} onValueChange={(v) => setFormData({...formData, state: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {states?.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Pincode</Label>
                          <Input type="number" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="shadow-lg border-indigo-100">
                <CardHeader className="bg-slate-900 text-white">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5" /> Appearance & Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Logo Image Path</Label>
                    <div className="flex gap-2">
                      <Input placeholder="/assets/logos/service.png" value={formData.logo_image_path} onChange={(e) => setFormData({...formData, logo_image_path: e.target.value})} />
                      <Button variant="outline" size="icon"><ImageIcon className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 p-1 h-10" value={formData.background_color} onChange={(e) => setFormData({...formData, background_color: e.target.value})} />
                      <Input value={formData.background_color} onChange={(e) => setFormData({...formData, background_color: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Encrypted URL</Label>
                    <div className="flex gap-2">
                      <Input placeholder="https://..." value={formData.encrypted_url} onChange={(e) => setFormData({...formData, encrypted_url: e.target.value})} />
                      <Button variant="outline" size="icon"><Globe className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="pt-4 space-y-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="qr" checked={formData.single_qr_sw} onCheckedChange={(c) => setFormData({...formData, single_qr_sw: !!c})} />
                      <Label htmlFor="qr" className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Single QR Enabled</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="status" checked={formData.status_sw} onCheckedChange={(c) => setFormData({...formData, status_sw: !!c})} />
                      <Label htmlFor="status">Service Active</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                form="service-form"
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-100"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Service' : 'Create Service')}
              </Button>
            </div>
          </div>

          <Card className="shadow-md border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Directory</CardTitle>
                <CardDescription>List of all configured merchant services</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingServices ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Service Name</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Bank Info</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services?.map((service: any) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-bold text-indigo-600">{service.name}</TableCell>
                          <TableCell>
                            {merchants?.find((m: any) => m.id === service.merchant_id)?.organization_name || `ID: ${service.merchant_id}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1 text-slate-500">
                              <Clock className="h-3 w-3" /> {service.start_time} - {service.end_time}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{service.bank_name}</div>
                            <div className="text-slate-400">{service.bank_account_number}</div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${service.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {service.status_sw ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}><Pencil className="h-4 w-4" /></Button>
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

export default MerchantServices;