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

export const setUsers = async(req: Request, res: Response) : Promise<void>=> {
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