import { NextFunction, Request, Response } from "express";
import { z } from "zod";

/**
 * Validates req.body / req.params / req.query against the provided zod
 * schema (shaped as z.object({ body, params, query })).
 *
 * On success, the (possibly coerced/transformed) parsed values are written
 * back onto the request in place. Because zod's z.object() strips unknown
 * keys by default, this also closes off mass-assignment: only fields the
 * schema explicitly declares make it through to the controller, so a caller
 * can no longer sneak extra columns (e.g. status flags, foreign keys) into
 * an insert/update payload just by adding them to the JSON body.
 *
 * We mutate the existing body/params/query objects in place (clear + copy)
 * rather than reassigning req.body/req.params/req.query, since Express 5
 * exposes req.query as a getter-only property and reassignment would throw.
 */
const mutateInPlace = (target: any, source: any) => {
  if (!target || !source || typeof target !== "object") return;
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, source);
};

export const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const issues =
        typeof (result.error as any).issues !== "undefined"
          ? (result.error as any).issues
          : (result.error as any).errors;

      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: (issues || []).map((issue: any) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    const parsed = result.data as {
      body?: any;
      params?: any;
      query?: any;
    };

    if (parsed.body !== undefined) mutateInPlace(req.body, parsed.body);
    if (parsed.params !== undefined) mutateInPlace(req.params, parsed.params);
    if (parsed.query !== undefined) mutateInPlace(req.query, parsed.query);

    next();
  };
