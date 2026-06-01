import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import * as jose from 'jose';

// In a real app, this should be a 32-byte key from environment variables
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '12345678123456781234567812345678');

/**
 * Internal helper to handle Supabase Auth sign up
 */
export const signUp = async (userData: any) => {
  const { email, password } = userData;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

/**
 * Internal helper to handle database record creation in master.user
 */
export const setUser = async (authData: any, userData: any) => {
  const { user_fname, user_mname, user_lname, user_type_id, phone } = userData;
  
  const { data, error } = await supabase
    .schema('master')
    .from('user')
    .insert([{
      auth_uuid: authData.user.id,
      email: authData.user.email,
      user_fname: user_fname,
      user_mname: user_mname,
      user_lname: user_lname,
      phone: phone,
      user_type_id: user_type_id,
      status_sw: true,
      update_by: 1,
      update_date: new Date().toISOString()
    }])
    .select();

  if (error) throw error;
  return data[0];
};

export const getUsers = async(req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .schema('master')
      .from('user')
      .select(`
        id, 
        auth_uuid,
        user_type_id, 
        merchant_id, 
        user_fname, 
        user_mname, 
        user_lname, 
        phone_country_code, 
        phone, 
        email, 
        update_by, 
        update_date, 
        status_sw
      `);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data,
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authData = await signUp(req.body);
    if (authData.user) {
      const dbUser = await setUser(authData, req.body);
      res.status(201).json({
        success: true,
        data: { auth: authData, user: dbUser },
      });
    } else {
      res.status(201).json({ success: true, data: { auth: authData } });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error creating user' });
  }
};

export const signInUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Fetch user role from database
    const { data: dbUser } = await supabase
      .schema('master')
      .from('user')
      .select('user_type_id')
      .eq('auth_uuid', data.user.id)
      .single();

    const role = dbUser?.user_type_id || 1;

    // Create JWE (JSON Web Encryption)
    const jwe = await new jose.CompactEncrypt(
      new TextEncoder().encode(JSON.stringify({ email: data.user.email, role }))
    )
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .encrypt(SECRET);

    res.status(200).json({
      success: true,
      token: jwe,
      user: { email: data.user.email, role }
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

export const signOutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    await supabase.auth.signOut();
    res.status(200).json({ success: true, message: 'Signed out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};