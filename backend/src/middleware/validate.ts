import { z } from "zod";

export const validate =
  (schema: z.ZodTypeAny) =>
  (req: any, res: any, next: any) => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      next();
    } catch (err) {
      next(err);
    }
  };