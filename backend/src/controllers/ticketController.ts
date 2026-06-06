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

/**
 * bookTicket: Creates a ticket and its associated details in one flow
 */
export const bookTicket = async (req: Request, res: Response): Promise<void> => {
  const { 
    customer_phone, 
    customer_phone_code, 
    merchant_id, 
    merchant_service_id,
    email,
    customer_name,
    payment_mode,
    categories, // Array of { ticket_category_id, adult_count, child_count }
    update_by
  } = req.body;

  try {
    // 1. Create the Ticket Header
    const { data: ticketData, error: ticketError } = await supabase
      .schema('transaction')
      .from('ticket')
      .insert([{
        customer_phone,
        customer_phone_code,
        merchant_id,
        merchant_service_id,
        booking_date: new Date().toISOString(),
        email,
        customer_name,
        payment_mode,
        update_by,
        update_date: new Date().toISOString(),
        status: 'CONFIRMED'
      }])
      .select();

    if (ticketError) {
      res.status(400).json({ error: ticketError.message });
      return;
    }

    const ticketId = ticketData[0].id;

    // 2. Create Ticket Details for each category
    const detailsToInsert = categories.map((cat: any) => ({
      ticket_id: ticketId,
      ticket_category_id: cat.ticket_category_id,
      qr_code_string: `TKT-${ticketId}-${cat.ticket_category_id}-${Date.now()}`,
      scanned_sw: false,
      adult_count: cat.adult_count || 0,
      child_count: cat.child_count || 0,
      update_by,
      update_date: new Date().toISOString()
    }));

    const { data: detailsData, error: detailsError } = await supabase
      .schema('transaction')
      .from('ticket_detail')
      .insert(detailsToInsert)
      .select();

    if (detailsError) {
      // Note: In a production app, you'd want to delete the ticket header if details fail (rollback)
      res.status(400).json({ error: detailsError.message });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Ticket booked successfully',
      data: {
        ticket: ticketData[0],
        details: detailsData
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};