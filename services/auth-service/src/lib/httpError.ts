import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "HTTP_ERROR"
  ) {
    super(message);
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
}

