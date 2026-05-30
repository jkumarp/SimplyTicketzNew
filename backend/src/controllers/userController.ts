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

// Example Endpoint: Creating an item
export const setUsers = async(req: Request, res: Response) : Promise<void>=> {
  const { email } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{ email }])
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};