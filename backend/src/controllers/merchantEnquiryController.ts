import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getMerchantEnquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('merchant_enquiry')
      .select('*');

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

export const createMerchantEnquiry = async (req: Request, res: Response): Promise<void> => {
  const { merchant_name, merchant_email, enquiry_details } = req.body;

  try {
    const { data, error } = await supabase
      .from('merchant_enquiry')
      .insert([{
        merchant_name,
        merchant_email,
        enquiry_details,
        status: 'Created'
      }])
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      data: data[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateMerchantEnquiry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const { data, error } = await supabase
      .from('merchant_enquiry')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data: data[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};