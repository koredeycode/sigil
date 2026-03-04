import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../../lib/Logger.js';

/**
 * Validates req.body against a Zod schema.
 * Sends a 400 Bad Request if validation fails.
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request body validation failed', { path: req.path, errors: error.errors });
        // Format the Zod errors into a single readable string
        const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        
        // Use standard error response format
        res.status(400).json({
          message: `Validation Error: ${errorMessages}`,
          data: null,
          error: errorMessages
        });
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validates req.query against a Zod schema.
 * Sends a 400 Bad Request if validation fails.
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request query validation failed', { path: req.path, errors: error.errors });
        const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        
        res.status(400).json({
          message: `Query Parameter Validation Error: ${errorMessages}`,
          data: null,
          error: errorMessages
        });
      } else {
        next(error);
      }
    }
  };
};
