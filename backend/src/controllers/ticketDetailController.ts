import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getTicketDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.query;
    let query = supabase
      .schema('transaction')
      .from('ticket_detail')
      .select('*');

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

export const createTicketDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ticket_id,
      ticket_category_id,
      qr_code_string,
      scanned_sw,
      scanned_time,
      adult_count,
      child_count,
      update_by
    } = req.body;

    const { data, error } = await supabase
      .schema('transaction')
      .from('ticket_detail')
      .insert([{
        ticket_id,
        ticket_category_id,
        qr_code_string,
        scanned_sw: scanned_sw || false,
        scanned_time,
        adult_count,
        child_count,
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

export const updateTicketDetail = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('transaction')
      .from('ticket_detail')
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