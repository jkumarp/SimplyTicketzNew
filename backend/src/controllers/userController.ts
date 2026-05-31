import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

/**
 * Internal helper to handle Supabase Auth sign up
 */
const signUp = async (userData: any) => {
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
const setUser = async (authData: any, userData: any) => {
  const { user_fname, phone } = userData;
  
  const { data, error } = await supabase
    .schema('master')
    .from('user')
    .insert([{
      auth_uuid: authData.user.id,
      email: authData.user.email,
      user_fname: user_fname,
      phone: phone,
      user_type_id: 1, // Default user type
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

/**
 * Main entry point for creating a user: calls signUp then setUser
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Call signUp function first
    const authData = await signUp(req.body);

    if (authData.user) {
      // 2. Call setUser function to sync with database
      const dbUser = await setUser(authData, req.body);
      
      res.status(201).json({
        success: true,
        data: {
          auth: authData,
          user: dbUser
        },
      });
    } else {
      res.status(201).json({
        success: true,
        data: { auth: authData }
      });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error creating user' });
  }
};