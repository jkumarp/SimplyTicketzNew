import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const createTicketTimeslot = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      merchant_id,
      ticket_category_id,
      name,
      start,
      end,
      total_ticket_count,
      update_by,
      status_sw
    } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('ticket_timeslot')
      .insert([{
        merchant_id,
        ticket_category_id,
        name,
        start,
        end,
        total_ticket_count,
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

export const updateTicketTimeslot = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('ticket_timeslot')
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

export const getTicketTimeslots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId } = req.query;
    let query = supabase.schema('master').from('ticket_timeslot').select('*');
    
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