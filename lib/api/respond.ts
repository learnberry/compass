/**
 * Response helpers for Compass API routes.
 *
 * Every route returns JSON. Error bodies are always `{ error: string }`.
 * `handle` wraps an async handler so route bodies stay free of try/catch:
 * a thrown ZodError becomes a 400, anything else becomes a 500.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** 200 (or any 2xx) with a JSON body. */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** 201 Created with the new entity. */
export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/** 204 No Content (for successful DELETEs). */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** 400 Bad Request with an error message. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** 404 Not Found with an error message. */
export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** 500 Internal Server Error. Logs the underlying error. */
export function serverError(error: unknown): NextResponse {
  console.error("[api] unhandled error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Format a ZodError into a single human-readable line. */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join("; ");
}

/**
 * Runs an async route handler, converting thrown errors into responses:
 *   - ZodError       -> 400 with the formatted validation message
 *   - anything else  -> 500
 */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(formatZodError(error));
    }
    return serverError(error);
  }
}
