import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const createTicketCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      merchant_service_id,
      name,
      timeslot_id,
      total_ticket_count,
      age_restriction_sw,
      child_age_limit,
      free_age_limit,
      adult_price,
      child_price,
      special_instruction,
      update_by,
      status_sw
    } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('ticket_category')
      .insert([{
        merchant_service_id,
        name,
        timeslot_id,
        total_ticket_count,
        age_restriction_sw,
        child_age_limit,
        free_age_limit,
        adult_price,
        child_price,
        special_instruction,
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

export const updateTicketCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('ticket_category')
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

export const getTicketCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantServiceId } = req.query;
    let query = supabase.schema('master').from('ticket_category').select('*');
    
    if (merchantServiceId) {
      query = query.eq('merchant_service_id', merchantServiceId);
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