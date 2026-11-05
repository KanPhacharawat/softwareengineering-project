export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'Your role cannot perform this operation');
export const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please log in');
