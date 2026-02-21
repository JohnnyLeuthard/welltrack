// Augment Express's Request type so req.user is available on protected routes.
declare namespace Express {
  interface Request {
    user?: { userId: string; email: string };
  }
}
