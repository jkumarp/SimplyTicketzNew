import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

/**
 * Uploads a picture to the 'merchant_service_picture' Supabase bucket.
 */
export const uploadServicePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
    const filePath = fileName;

    const { data, error } = await supabase.storage
      .from('merchant_service_picture')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Picture uploaded successfully',
      data: { path: data.path }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Generates a signed URL for a picture.
 */
export const getPictureUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path } = req.query;
    if (!path || typeof path !== 'string') {
      res.status(400).json({ error: 'File path is required' });
      return;
    }

    const { data, error } = await supabase.storage
      .from('merchant_service_picture')
      .createSignedUrl(path, 3600); // 1 hour validity

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data: data.signedUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getMerchantServicePictures = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId, categoryId } = req.query;
    let query = supabase.schema('master').from('merchant_service_picture').select('*');
   
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
    // First, get the record to find the picture_id (path) for storage deletion
    const { data: record } = await supabase
      .schema('master')
      .from('merchant_service_picture')
      .select('picture_id')
      .eq('id', id)
      .single();

    if (record?.picture_id) {
      await supabase.storage
        .from('merchant_service_picture')
        .remove([record.picture_id]);
    }

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
      message: 'Picture record and file deleted successfully',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};