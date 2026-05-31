import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getUsers = async(req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .schema('master')
      .from('user')
      .select(`
        id, 
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


export const signUp = async (req: Request, res: Response): Promise<void> => {
  const { email, password, user_fname, phone } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (data.user) {
      // Sync with master.user table
      const { error: dbError } = await supabase
        .schema('master')
        .from('user')
        .insert([{
          id: data.user.id,
          email: data.user.email,
          user_fname: user_fname,
          phone: phone,
          user_type_id: 1, // Default user type
          status_sw: true,
          update_by: 1,
          update_date: new Date().toISOString()
        }]);

      if (dbError) {
        console.error('Error syncing user to DB:', dbError);
      }
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const setUser = async(req: Request, res: Response) : Promise<void>=> {
  const { 
    id,
    user_type_id, 
    merchant_id, 
    user_fname, 
    phone_country_code, 
    phone, 
    email, 
    update_by, 
    update_date, 
    status_sw 
  } = req.body;

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('user')
      .insert([{ 
        id,
        user_type_id, 
        merchant_id, 
        user_fname, 
        phone_country_code, 
        phone, 
        email, 
        update_by, 
        update_date, 
        status_sw 
      }])
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};