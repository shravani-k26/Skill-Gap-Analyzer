import type { Request, Response, NextFunction } from "express";

const notFound = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

export default notFound;