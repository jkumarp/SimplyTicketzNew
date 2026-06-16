import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getMerchantServiceHolidays = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, serviceId } = req.query;
    let query = supabase.schema('master').from('merchant_service_holiday').select('*');
    
    if (merchantId) query = query.eq('merchant_id', merchantId);
    if (serviceId) query = query.eq('merchant_service_id', serviceId);

    const { data, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createMerchantServiceHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchant_id, merchant_service_id, holiday_name, holiday_date, update_by, status_sw } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_holiday')
      .insert([{
        merchant_id,
        merchant_service_id,
        holiday_name,
        holiday_date,
        update_by,
        update_date: new Date().toISOString(),
        status_sw: status_sw ?? true
      }])
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateMerchantServiceHoliday = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_holiday')
      .update({
        ...req.body,
        update_date: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({ success: true, data: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteMerchantServiceHoliday = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .schema('master')
      .from('merchant_service_holiday')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};