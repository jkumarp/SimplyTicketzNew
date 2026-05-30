import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
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
      .from('merchant-docs')
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
      message: 'File uploaded successfully',
      data: {
        path: data.path,
        fullPath: `merchant-docs/${data.path}`
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};