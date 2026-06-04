"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  CreditCard, Pencil, X, QrCode, Palette, Image as ImageIcon
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const serviceSchema = z.object({
  merchant_id: z.string().min(1, "Merchant is required"),
  name: z.string().min(1, "Name is required").max(200, "Max 200 characters"),
  logo_image_path: z.string().max(100).optional().or(z.literal('')),
  single_qr_sw: z.boolean().default(false),
  background_color: z.string().max(50).default("#ffffff"),
  beneficiary_name: z.string().max(100).optional().or(z.literal('')),
  account_type: z.string().max(10).default("Savings"),
  bank_account_number: z.string().max(50).optional().or(z.literal('')),
  bank_name: z.string().max(100).optional().or(z.literal('')),
  branch_name: z.string().max(100).optional().or(z.literal('')),
  bank_ifsc: z.string().max(50).optional().or(z.literal('')),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
  mon_working_sw: z.boolean().default(true),
  tue_working_sw: z.boolean().default(true),
  wed_working_sw: z.boolean().default(true),
  thu_working_sw: z.boolean().default(true),
  fri_working_sw: z.boolean().default(true),
  sat_working_sw: z.boolean().default(false),
  sun_working_sw: z.boolean().default(false),
  addressline1: z.string().max(100).optional().or(z.literal('')),
  addressline2: z.string().max(100).optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z.string().regex(/^\d*$/).optional().or(z.literal('')),
  country: z.string().default("1"),
  location_coordinates: z.string().max(100).optional().or(z.literal('')),
  encrypted_url: z.string().max(500).optional().or(z.literal('')),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1")
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceTabProps {
  onServiceSelect: (id: string) => void;
  selectedServiceId: string | null;
}

const ServiceTab = ({ onServiceSelect, selectedServiceId }: ServiceTabProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      merchant_id: '', name: '', logo_image_path: '', single_qr_sw: false,
      background_color: '#ffffff', beneficiary_name: '', account_type: 'Savings',
      bank_account_number: '', bank_name: '', branch_name: '', bank_ifsc: '',
      start_time: '09:00', end_time: '18:00', mon_working_sw: true,
      tue_working_sw: true, wed_working_sw: true, thu_working_sw: true,
      fri_working_sw: true, sat_working_sw: false, sun_working_sw: false,
      addressline1: '', addressline2: '', state: '', pincode: '',
      country: '1', location_coordinates: '', encrypted_url: '',
      status_sw: true, update_by: '1'
    }
  });

  const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['merchant-services'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      return (await res.json()).data;
    }
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`, { headers: getAuthHeader() });
      return (await res.json()).data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const payload = {
        ...data,
        merchant_id: parseInt(data.merchant_id),
        state: data.state ? parseInt(data.state) : null,
        pincode: data.pincode ? parseInt(data.pincode) : null,
        country: parseInt(data.country),
        update_by: parseInt(data.update_by)
      };
      const url = editingId ? `${API_URL}/merchant-services/${editingId}` : `${API_URL}/merchant-services`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Operation failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-services'] });
      showSuccess(editingId ? 'Service updated!' : 'Service created!');
      setEditingId(null);
      form.reset();
    },
    onError: (error: any) => showError(error.message)
  });

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    form.reset({
      ...service,
      merchant_id: service.merchant_id.toString(),
      state: service.state?.toString() || '',
      country: service.country?.toString() || '1',
      pincode: service.pincode?.toString() || '',
      update_by: '1'
    });
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <Card className="xl:col-span-2 shadow-md border-indigo-100">
            <CardHeader className="bg-indigo-50/30 border-b">
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Briefcase className="h-5 w-5" />
                {editingId ? 'Edit Service' : 'New Service Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="merchant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Merchant" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {merchants?.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.organization_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name *</FormLabel>
                      <FormControl><Input placeholder="e.g. VIP Lounge Access" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="bank_name" render={({ field }) => (
                  <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="bank_account_number" render={({ field }) => (
                  <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="bank_ifsc" render={({ field }) => (
                  <FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button type="submit" disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Service' : 'Create Service')}
                </Button>
                {editingId && <Button variant="outline" onClick={() => { setEditingId(null); form.reset(); }}>Cancel</Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-indigo-100">
            <CardHeader className="bg-slate-900 text-white">
              <CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FormField control={form.control} name="background_color" render={({ field }) => (
                <FormItem><FormLabel>Theme Color</FormLabel><div className="flex gap-2"><Input type="color" className="w-12 p-1 h-10" {...field} /><Input {...field} /></div></FormItem>
              )} />
              <FormField control={form.control} name="status_sw" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Active Status</FormLabel></FormItem>
              )} />
            </CardContent>
          </Card>
        </form>
      </Form>

      <Card className="shadow-md border-slate-200">
        <CardHeader><CardTitle>Service Directory</CardTitle></CardHeader>
        <CardContent>
          {isLoadingServices ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div> : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((service: any) => (
                  <TableRow key={service.id} className={selectedServiceId === service.id.toString() ? "bg-indigo-50/50" : ""}>
                    <TableCell className="font-bold text-indigo-600 cursor-pointer" onClick={() => onServiceSelect(service.id.toString())}>
                      {service.name}
                    </TableCell>
                    <TableCell>{merchants?.find((m: any) => m.id === service.merchant_id)?.organization_name || service.merchant_id}</TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${service.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{service.status_sw ? 'ACTIVE' : 'INACTIVE'}</span></TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onServiceSelect(service.id.toString())}>Select</Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceTab;