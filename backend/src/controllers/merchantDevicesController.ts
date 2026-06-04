import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getMerchantDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId } = req.query;
    let query = supabase
      .schema('master')
      .from('merchant_device')
      .select('*');

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
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

export const createMerchantDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      merchant_id,
      merchant_subscription_id,
      merchant_service_id,
      phone,
      publisher_id,
      update_by,
      status_sw
    } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_device')
      .insert([{
        merchant_id,
        merchant_subscription_id,
        merchant_service_id,
        phone,
        publisher_id,
        update_by,
        update_date: new Date().toISOString(),
        status_sw
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

export const updateMerchantDevice = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant_device')
      .update({
        ...updateData,
        update_date: new Date().toISOString()
      })
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