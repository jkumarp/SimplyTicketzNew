import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, customerPhone } = req.query;
    let query = supabase
      .schema('transaction')
      .from('ticket')
      .select('*');

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    if (customerPhone) {
      query = query.eq('customer_phone', customerPhone);
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

export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customer_phone,
      customer_phone_code,
      merchant_id,
      merchant_service_id,
      booking_date,
      email,
      dob,
      gstin,
      address,
      customer_name,
      payment_mode,
      transaction_date,
      transaction_reference,
      bank_reference,
      update_by,
      status
    } = req.body;

    const { data, error } = await supabase
      .schema('transaction')
      .from('ticket')
      .insert([{
        customer_phone,
        customer_phone_code,
        merchant_id,
        merchant_service_id,
        booking_date: booking_date || new Date().toISOString(),
        email,
        dob,
        gstin,
        address,
        customer_name,
        payment_mode,
        transaction_date,
        transaction_reference,
        bank_reference,
        update_by,
        update_date: new Date().toISOString(),
        status: status || 'PENDING'
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

export const updateTicket = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('transaction')
      .from('ticket')
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