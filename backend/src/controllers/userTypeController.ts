import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getUserTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .schema('master')
      .from('user_type')
      .select('id, internal_sw, name');

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