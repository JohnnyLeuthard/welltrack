// Augment Express's Request type so req.user is available on protected routes.
export {};

declare module 'express-serve-static-core' {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}
