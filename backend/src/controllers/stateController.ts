import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getStates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryId } = req.query;
    
    let query = supabase
      .schema('master')
      .from('state')
      .select('id, name, country_id');

    if (countryId) {
      query = query.eq('country_id', countryId);
    }

    const { data, error } = await query;

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