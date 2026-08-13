import type { IncomingMessage, ServerResponse } from 'node:http';

export type ApiRequest = IncomingMessage & {
  body?: unknown;
  cookies?: Record<string, string | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

export type ApiResponse = ServerResponse;
