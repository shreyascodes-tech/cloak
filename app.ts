import {
  Application,
  Middleware,
  State,
  Context,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import {
  ApplicationListenEvent,
  ApplicationOptions,
  ListenOptions,
} from "https://deno.land/x/oak@v11.1.0/application.ts";
import { resToCtx } from "./utils.ts";
import { RouterOptions as OakRouterOptions } from "https://deno.land/x/oak@v11.1.0/router.ts";
import { ServerRequest } from "https://deno.land/x/oak@v11.1.0/types.d.ts";
import { Router } from "./router.ts";

function defaultOnListenHandler({ hostname, port }: ApplicationListenEvent) {
  const host = hostname === "0.0.0.0" ? "localhost" : hostname;
  console.log(`server running on http://${host}:${port}`);
}

export interface RouterOptions extends OakRouterOptions {
  autoRegister?: boolean;
}

export interface Server<T extends State = State, L extends State = State> {
  get oakApp(): Application<T>;
  use(
    middleware: Middleware<T, Context<T, T>>,
    ...middlewares: Middleware<T, Context<T, T>>[]
  ): Server<T>;
  createRouter(options?: RouterOptions): Router<T>;
  serveStatic(options: StaticOptions): void;
  listen(
    options?: ListenOptions,
    onListen?: (e: ApplicationListenEvent) => Promise<void> | void
  ): Promise<void>;
}

// deno-lint-ignore no-explicit-any
export function createServer<T extends Record<string, any>>(
  options?: ApplicationOptions<T, ServerRequest>
): Server<T> {
  const app = new Application<T>(options);
  const routers: Router<T>[] = [];

  app.use(async (ctx: Context<T, T>, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof Response) {
        resToCtx(error, ctx);
      } else {
        throw error;
      }
    }
  });

  return {
    get oakApp() {
      return app;
    },
    use(
      middleware: Middleware<T, Context<T, T>>,
      ...middlewares: Middleware<T, Context<T, T>>[]
    ) {
      app.use(middleware, ...middlewares);
      return this;
    },
    createRouter(options?: RouterOptions) {
      const router = new Router<T>(options);
      if (!options || options.autoRegister !== false) {
        routers.push(router);
      }
      return router;
    },
    serveStatic(options: StaticOptions) {
      app.use(async (ctx, next) => {
        try {
          await ctx.send(options);
        } catch {
          await next();
        }
      });
    },
    listen(
      options?: ListenOptions,
      onListen: (
        e: ApplicationListenEvent
      ) => Promise<void> | void = defaultOnListenHandler
    ) {
      for (const router of routers) {
        app.use(router.routes());
        app.use(router.allowedMethods());
      }

      app.addEventListener("listen", onListen);
      return app.listen(options);
    },
  };
}

export interface StaticOptions {
  /** Try to serve the brotli version of a file automatically when brotli is
   * supported by a client and if the requested file with `.br` extension
   * exists. (defaults to `true`) */
  brotli?: boolean;

  /** A record of extensions and content types that should be used when
   * determining the content of a file being served. By default, the
   * [`media_type`](https://github.com/oakserver/media_types/) database is used
   * to map an extension to the served content-type. The keys of the map are
   * extensions, and values are the content types to use. The content type can
   * be a partial content type, which will be resolved to a full content type
   * header.
   *
   * Any extensions matched will override the default behavior. Key should
   * include the leading dot (e.g. `.ext` instead of just `ext`).
   *
   * ### Example
   *
   * ```ts
   * app.use((ctx) => {
   *   return send(ctx, ctx.request.url.pathname, {
   *     contentTypes: {
   *       ".importmap": "application/importmap+json"
   *     },
   *     root: ".",
   *   })
   * });
   * ```
   */
  contentTypes?: Record<string, string>;

  /** Try to match extensions from passed array to search for file when no
   * extension is sufficed in URL. First found is served. (defaults to
   * `undefined`) */
  extensions?: string[];

  /** If `true`, format the path to serve static file servers and not require a
   * trailing slash for directories, so that you can do both `/directory` and
   * `/directory/`. (defaults to `true`) */
  format?: boolean;

  /** Try to serve the gzipped version of a file automatically when gzip is
   * supported by a client and if the requested file with `.gz` extension
   * exists. (defaults to `true`). */
  gzip?: boolean;

  /** Allow transfer of hidden files. (defaults to `false`) */
  hidden?: boolean;

  /** Tell the browser the resource is immutable and can be cached
   * indefinitely. (defaults to `false`) */
  immutable?: boolean;

  /** Name of the index file to serve automatically when visiting the root
   * location. (defaults to none) */
  index?: string;

  /** Browser cache max-age in milliseconds. (defaults to `0`) */
  maxage?: number;

  /** A size in bytes where if the file is less than this size, the file will
   * be read into memory by send instead of returning a file handle.  Files less
   * than the byte size will send an "strong" `ETag` header while those larger
   * than the bytes size will only be able to send a "weak" `ETag` header (as
   * they cannot hash the contents of the file). (defaults to 1MiB)
   */
  maxbuffer?: number;

  /** Root directory to restrict file access. */
  root: string;

  /** The filename to send, which will be resolved based on the other options.
   * If this property is omitted, the current context's `.request.url.pathname`
   * will be used. */
  path?: string;
}
