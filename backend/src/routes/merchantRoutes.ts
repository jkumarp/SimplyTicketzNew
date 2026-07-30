import { Router } from 'express';
import { z } from 'zod';
import { getMerchants, setMerchants, updateMerchant } from '../controllers/merchantController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const merchantFields = {
  contact_person_name: z.string().min(1).max(200),
  organization_name: z.string().min(1).max(200),
  email: z.string().trim().email(),
  phone_country_code: z.string().max(5).optional(),
  phone: z.string().min(6).max(15).optional(),
  pan_number: z.string().max(10).optional(),
  addressline1: z.string().max(255).optional(),
  addressline2: z.string().max(255).optional().nullable(),
  state: z.union([z.string(), z.number()]).optional(),
  pincode: z.string().max(10).optional(),
  country: z.union([z.string(), z.number()]).optional(),
  gstn_state: z.union([z.string(), z.number()]).optional(),
  kyc_completed_sw: z.boolean().optional(),
  kyc_completed_date: z.string().optional().nullable(),
  aadhaar_number: z.string().max(20).optional(),
  agreement_signed_sw: z.boolean().optional(),
  agreement_signed_date: z.string().optional().nullable(),
  db_connection: z.string().optional().nullable(),
  update_by: z.number().optional(),
  status_sw: z.boolean().optional(),
  gstn: z.string().max(20).optional(),
  pan_docid: z.string().optional().nullable(),
  aadhaar_docid: z.string().optional().nullable(),
  gstn_docid: z.string().optional().nullable(),
  organization_sw: z.boolean().optional(),
  city: z.string().max(100).optional(),
  brand_name: z.string().max(200).optional(),
  contact_phone: z.string().max(15).optional(),
  contact_email: z.string().trim().email().optional().or(z.literal('')),
  sin_number: z.string().max(20).optional(),
  sin_docid: z.string().optional().nullable(),
  tin_number: z.string().max(20).optional(),
  tin_docid: z.string().optional().nullable(),
  moa_docid: z.string().optional().nullable(),
  aoa_docid: z.string().optional().nullable(),
  trading_certificate_docid: z.string().optional().nullable(),
  director_information_docid: z.string().optional().nullable(),
  partnership_agreement_docid: z.string().optional().nullable(),
};

const createMerchantSchema = z.object({
  body: z.object(merchantFields),
});

const updateMerchantSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object(
    Object.fromEntries(
      Object.entries(merchantFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ),
  ),
});

const getMerchantsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

router.get('/merchants', authorizeRoles(1,2,3,4,5,6), validate(getMerchantsSchema), apiRateLimiter(), getMerchants);
router.post('/merchants', authorizeRoles(1,2,3,4,5), validate(createMerchantSchema),apiRateLimiter(), setMerchants);
router.put('/merchants/:id', authorizeRoles(1,2,3,4,5), validate(updateMerchantSchema),apiRateLimiter(), updateMerchant);

export default router;
