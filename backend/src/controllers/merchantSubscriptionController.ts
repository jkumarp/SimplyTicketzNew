import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const createMerchantSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      merchant_id,
      subscription_id,
      merchant_service_id,
      start_date,
      end_date,
      ticket_encryption_key,
      secret_key,
      secret_value,
      allowed_scanning_device,
      allowed_pos_device,
      allowed_staff_login,
      convinience_fee,
      ticket_refund_sw,
      update_by,
      status_sw
    } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_subscription')
      .insert([{
        merchant_id,
        subscription_id,
        merchant_service_id,
        start_date,
        end_date,
        ticket_encryption_key,
        secret_key,
        secret_value,
        allowed_scanning_device,
        allowed_pos_device,
        allowed_staff_login,
        convinience_fee,
        ticket_refund_sw,
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

export const updateMerchantSubscription = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant_subscription')
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

export const getMerchantSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId } = req.query;
    let query = supabase.schema('master').from('merchant_subscription').select('*');
    
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