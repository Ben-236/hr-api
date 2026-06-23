const codes = {
  success: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  unAuthorized: 401,
  paymentRequired: 402,
  forbidden: 403,
  notFound: 404,
  methodNotAllowed: 405,
  RequestTimeout: 408,
  conflict: 409,
  locked: 423,
  tooManyRequests: 429,
  expired: 498,
  internalServerError: 500,
  gatewayTimeout: 504,
  serviceUnavailable: 503,
  insufficientStorage: 507,
} as const;

export default codes;
export type TCodes = (typeof codes)[keyof typeof codes];
