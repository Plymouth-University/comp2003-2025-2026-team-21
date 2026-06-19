import { Request, Response, NextFunction } from "express";

/** Build a minimal mock Express request */
export function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    user: undefined,
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

/** Build a chainable mock Express response */
export function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
}

export const mockNext: NextFunction = jest.fn();
