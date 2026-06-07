import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, ticketId } = req.query;
    let query = supabase
      .schema('transaction')
      .from('invoice')
      .select('*');

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    if (ticketId) {
      query = query.eq('ticket_id', ticketId);
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

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      invoice_number,
      merchant_id,
      ticket_id,
      merchant_service_id,
      total_amount,
      scgst_merchant,
      cgst_merchant,
      igst_merchant,
      convinience_fee,
      sgst,
      cgst,
      igst,
      discount_value,
      grand_total,
      update_by,
      discount_percentage
    } = req.body;

    const { data, error } = await supabase
      .schema('transaction')
      .from('invoice')
      .insert([{
        invoice_number,
        merchant_id,
        ticket_id,
        merchant_service_id,
        total_amount,
        scgst_merchant,
        cgst_merchant,
        igst_merchant,
        convinience_fee,
        sgst,
        cgst,
        igst,
        discount_value,
        grand_total,
        update_by,
        update_date: new Date().toISOString(),
        discount_percentage: discount_percentage || 0
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