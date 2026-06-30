import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

/**
 * Retrieve merchant service users with optional filtering by merchant, service, or user ID
 */
export const getMerchantServiceUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, serviceId, userId } = req.query;
    let query = supabase
      .schema('master')
      .from('merchant_service_users')
      .select('*');

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
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

/**
 * Associate a user with a merchant service
 */
export const createMerchantServiceUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchant_id, service_id, user_id, status_sw, updated_by } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_users')
      .insert([{
        merchant_id,
        service_id,
        user_id,
        status_sw: status_sw ?? true,
        updated_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

/**
 * Update an existing merchant service user association
 */
export const updateMerchantServiceUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
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

/**
 * Delete a merchant service user association
 */
export const deleteMerchantServiceUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .schema('master')
      .from('merchant_service_users')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Merchant service user mapping deleted successfully',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};