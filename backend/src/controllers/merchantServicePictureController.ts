import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getMerchantServicePictures = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, serviceId, categoryId } = req.query;
    let query = supabase.schema('master').from('merchant_service_picture').select('*');

    if (merchantId) query = query.eq('merchant_id', merchantId);
    if (serviceId) query = query.eq('service_id', serviceId);
    if (categoryId) query = query.eq('category_id', categoryId);

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

export const createMerchantServicePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchant_id, service_id, category_id, picture_id, status_sw } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_picture')
      .insert([{
        merchant_id,
        service_id,
        category_id,
        picture_id,
        status_sw: status_sw ?? true,
        updated_dt: new Date().toISOString()
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

export const updateMerchantServicePicture = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_picture')
      .update({
        ...updateData,
        updated_dt: new Date().toISOString()
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

export const deleteMerchantServicePicture = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .schema('master')
      .from('merchant_service_picture')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Picture record deleted successfully',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};