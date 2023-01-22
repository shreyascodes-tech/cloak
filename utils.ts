// deno-lint-ignore-file no-explicit-any
// import { getQuery } from "https://deno.land/x/oak@v11.1.0/helpers.ts";
import {
  Context,
  RouterMiddleware,
  RouteParams,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.20.2/mod.ts";

type PromiseOr<T> = T | Promise<T>;

export function resToCtx(response: Response, ctx: Context) {
  ctx.response.type = response.type;
  ctx.response.body = response.body;
  ctx.response.status = response.status;
  ctx.response.headers = response.headers;
}

export function json<T extends unknown>(data: T, init?: ResponseInit): never {
  throw Response.json(data, init);
}

export function success<T extends unknown>(data: T, init?: ResponseInit) {
  return json(
    {
      hasError: false,
      error: null,
      data,
    },
    init
  );
}

export function fail<T extends unknown>(error?: T, init?: ResponseInit) {
  return json(
    {
      hasError: true,
      error,
      data: null,
    },
    {
      status: init?.status ?? 400,
      headers: init?.headers,
      statusText: init?.statusText,
    }
  );
}

export function redirect(url: string | URL, status?: number | undefined) {
  throw Response.redirect(url, status);
}

export async function getJSONBody<
  T,
  S extends Record<string, any> = Record<string, any>
>(
  ctx: Context<S>,
  onErr?: (err: any) => PromiseOr<Response | null | undefined | void>
) {
  const { type, value } = ctx.request.body();

  try {
    if (type === "json") {
      return (await value) as T;
    }
  } catch (e) {
    console.error(e);
    if (!onErr) fail("Internal Server Error", { status: 500 });
    const maybeRes = await onErr!(e);
    if (maybeRes) {
      throw maybeRes;
    }
    fail("Internal Server Error", { status: 500 });
  }
}

export interface ValidationOptions {
  readerFn?: (ctx: Context) => unknown;
  onErr?: (error: z.ZodError) => PromiseOr<Response | null | undefined | void>;
}

export function validateBody<
  T extends z.ZodTypeAny,
  R extends string,
  P extends RouteParams<R> = RouteParams<R>
>(
  schema: T,
  { readerFn, onErr }: ValidationOptions = {}
): RouterMiddleware<R, P, { body: z.infer<T> }> {
  return async (ctx, next) => {
    const body = await (readerFn ? readerFn(ctx) : getJSONBody(ctx));

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      const zodError = parsed.error;
      const maybeRes = onErr?.(zodError);
      if (maybeRes) throw maybeRes;
      fail(zodError.flatten().fieldErrors);
    } else {
      ctx.state.body = { ...ctx.state.body, ...parsed.data };
      await next();
    }
  };
}

export const fromQueryOrFail: ValidationOptions = {
  readerFn: (ctx) => Object.fromEntries(ctx.request.url.searchParams),
};
