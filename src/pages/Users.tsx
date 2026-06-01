"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/select";
import { showSuccess, showError } from "@/utils/toast";
import { UserPlus, Loader2, Mail, Phone, User as UserIcon, Lock, Building2, ShieldCheck, Pencil, X } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Users = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    user_fname: '',
    user_mname: '',
    user_lname: '',
    email: '',
    phone_country_code: '91',
    phone: '',
    password: '',
    user_type_id: '',
    merchant_id: '',
    status_sw: true,
    update_by: '1'
  });

  // Fetch Users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch User Types
  const { data: userTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ['user-types'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/user-types`);
      if (!res.ok) throw new Error('Failed to fetch user types');
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch Merchants
  const { data: merchants, isLoading: isLoadingMerchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`);
      if (!res.ok) throw new Error('Failed to fetch merchants');
      const json = await res.json();
      return json.data;
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({ 
      user_fname: '', 
      user_mname: '', 
      user_lname: '', 
      email: '', 
      phone_country_code: '91', 
      phone: '', 
      password: '', 
      user_type_id: '', 
      merchant_id: '', 
      status_sw: true, 
      update_by: '1' 
    });
  };

  const createMutation = useMutation({
    mutationFn: async (newUser: any) => {
      const payload = {
        ...newUser,
        user_type_id: parseInt(newUser.user_type_id),
        merchant_id: newUser.merchant_id && newUser.merchant_id !== 'none' ? parseInt(newUser.merchant_id) : null,
        phone_country_code: parseInt(newUser.phone_country_code),
        update_by: parseInt(newUser.update_by)
      };

      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create user');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('User created successfully!');
      resetForm();
    },
    onError: (error: any) => {
      showError(error.message || 'Error creating user');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedUser: any) => {
      const payload = {
        ...updatedUser,
        user_type_id: parseInt(updatedUser.user_type_id),
        merchant_id: updatedUser.merchant_id && updatedUser.merchant_id !== 'none' ? parseInt(updatedUser.merchant_id) : null,
        phone_country_code: parseInt(updatedUser.phone_country_code),
        update_by: parseInt(updatedUser.update_by)
      };

      const res = await fetch(`${API_URL}/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update user');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('User updated successfully!');
      resetForm();
    },
    onError: (error: any) => {
      showError(error.message || 'Error updating user');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_type_id) {
      showError("Please select a User Role");
      return;
    }
    
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setFormData({
      user_fname: user.user_fname || '',
      user_mname: user.user_mname || '',
      user_lname: user.user_lname || '',
      email: user.email || '',
      phone_country_code: user.phone_country_code?.toString() || '91',
      phone: user.phone || '',
      password: '', // Don't populate password for security
      user_type_id: user.user_type_id?.toString() || '',
      merchant_id: user.merchant_id?.toString() || 'none',
      status_sw: !!user.status_sw,
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
              <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
              <p className="text-slate-500">Create and manage system users and their roles</p>
            </div>
            {editingId && (
              <Button variant="outline" onClick={resetForm} className="gap-2">
                <X className="h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Add/Edit User Form */}
            <Card className="xl:col-span-1 h-fit shadow-lg border-indigo-100">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  {editingId ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  {editingId ? 'Edit User Profile' : 'Add New User'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input 
                        required
                        placeholder="First Name"
                        value={formData.user_fname}
                        onChange={(e) => setFormData({...formData, user_fname: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Middle Name</Label>
                        <Input 
                          placeholder="Middle Name"
                          value={formData.user_mname}
                          onChange={(e) => setFormData({...formData, user_mname: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input 
                          placeholder="Last Name"
                          value={formData.user_lname}
                          onChange={(e) => setFormData({...formData, user_lname: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input 
                      type="email"
                      placeholder="email@example.com"
                      disabled={!!editingId} // Email is usually the unique ID in auth
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    {editingId && <p className="text-[10px] text-slate-400">Email cannot be changed after creation.</p>}
                  </div>

                  {!editingId && (
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="password"
                          required
                          placeholder="Min 6 characters"
                          className="pl-10"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

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
                      <Label>Phone Number *</Label>
                      <Input 
                        required
                        placeholder="10-digit mobile"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>User Role *</Label>
                    <Select 
                      value={formData.user_type_id} 
                      onValueChange={(value) => setFormData({...formData, user_type_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingTypes ? "Loading roles..." : "Select Role"} />
                      </SelectTrigger>
                      <SelectContent>
                        {userTypes?.map((type: any) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Associated Merchant</Label>
                    <Select 
                      value={formData.merchant_id} 
                      onValueChange={(value) => setFormData({...formData, merchant_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingMerchants ? "Loading merchants..." : "Select Merchant (Optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {merchants?.map((merchant: any) => (
                          <SelectItem key={merchant.id} value={merchant.id.toString()}>
                            {merchant.organization_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                      id="status" 
                      checked={formData.status_sw}
                      onCheckedChange={(checked) => setFormData({...formData, status_sw: !!checked})}
                    />
                    <Label htmlFor="status" className="cursor-pointer">Active User</Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 mt-4"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (editingId ? 'Update User' : 'Create User')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card className="xl:col-span-2 shadow-md border-slate-200">
              <CardHeader>
                <CardTitle>User Directory</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold">User Details</TableHead>
                          <TableHead className="font-bold">Contact</TableHead>
                          <TableHead className="font-bold">Role & Merchant</TableHead>
                          <TableHead className="font-bold">Status</TableHead>
                          <TableHead className="font-bold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users?.map((user: any) => (
                          <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                  <UserIcon className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900">
                                    {user.user_fname} {user.user_mname} {user.user_lname}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono uppercase">ID: {user.id}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm gap-1">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {user.email || 'N/A'}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <Phone className="h-3.5 w-3.5 text-slate-400" /> +{user.phone_country_code} {user.phone}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit">
                                  <ShieldCheck className="h-3 w-3" />
                                  {userTypes?.find((t: any) => t.id === user.user_type_id)?.name || `Role ${user.user_type_id}`}
                                </div>
                                {user.merchant_id && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <Building2 className="h-3 w-3" />
                                    {merchants?.find((m: any) => m.id === user.merchant_id)?.organization_name || `Merchant ${user.merchant_id}`}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${user.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {user.status_sw ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => handleEdit(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!users || users.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-20 text-slate-500">
                              No users found in the directory.
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

export default Users;