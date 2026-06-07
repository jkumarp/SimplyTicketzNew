import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getInvoiceDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId, ticketId } = req.query;
    let query = supabase
      .schema('transaction')
      .from('invoice_detail')
      .select('*');

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
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

export const createInvoiceDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      invoice_id,
      ticket_id,
      ticket_detail_id,
      adult_price,
      child_price,
      adult_count,
      child_count,
      total_amount,
      update_by
    } = req.body;

    const { data, error } = await supabase
      .schema('transaction')
      .from('invoice_detail')
      .insert([{
        invoice_id,
        ticket_id,
        ticket_detail_id,
        adult_price,
        child_price,
        adult_count,
        child_count,
        total_amount,
        update_by,
        update_date: new Date().toISOString()
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