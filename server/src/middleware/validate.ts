import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from './errorHandler';

export const validateBody = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return next(new AppError(400, 'Validation failed', r.error.flatten().fieldErrors));
  req.body = r.data;
  next();
};

export const validateQuery = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const r = schema.safeParse(req.query);
  if (!r.success) return next(new AppError(400, 'Invalid query', r.error.flatten().fieldErrors));
  req.query = r.data;
  next();
};

export const validateParams = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const r = schema.safeParse(req.params);
  if (!r.success) return next(new AppError(400, 'Invalid params', r.error.flatten().fieldErrors));
  req.params = r.data;
  next();
};
