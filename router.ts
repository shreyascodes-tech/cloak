// deno-lint-ignore-file no-explicit-any
import {
  Router as OakRouter,
  RouterOptions,
  RouterMiddleware,
  RouteParams,
} from "https://deno.land/x/oak@v11.1.0/router.ts";
import {
  State,
  RedirectStatus,
  Status,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.20.2/mod.ts";
import { validateBody, ValidationOptions } from "./utils.ts";

export class Router<RS extends State = State> {
  private router: OakRouter<RS>;

  constructor(options?: RouterOptions) {
    this.router = new OakRouter(options);
  }

  input<T extends z.ZodTypeAny>(schema: T, options?: ValidationOptions) {
    return new ValidatedRoute<RS, z.infer<T>>(
      this,
      validateBody(schema, options) as any
    );
  }

  use<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S>,
    ...middlewares: RouterMiddleware<R, P, S>[]
  ): this;
  use<
    P extends RouteParams<string> = RouteParams<string>,
    S extends State = RS
  >(
    middleware: RouterMiddleware<string, P, S>,
    ...middlewares: RouterMiddleware<string, P, S>[]
  ): this;
  use(
    pathOrMiddleware: string | RouterMiddleware<string>,
    ...middlewares: RouterMiddleware<string>[]
  ): this {
    this.router.use(pathOrMiddleware as any, ...middlewares);
    return this;
  }

  all<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S extends RS ? S & RS : S>,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): this {
    this.router.all(path, middleware, ...middlewares);
    return this;
  }

  get<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S extends RS ? S & RS : S>,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): this {
    this.router.get(path, middleware, ...middlewares);
    return this;
  }

  post<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S extends RS ? S & RS : S>,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): this {
    this.router.post(path, middleware, ...middlewares);
    return this;
  }

  put<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S extends RS ? S & RS : S>,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): this {
    this.router.put(path, middleware, ...middlewares);
    return this;
  }

  patch<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S extends RS ? S & RS : S>,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): this {
    this.router.patch(path, middleware, ...middlewares);
    return this;
  }

  delete<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S extends RS ? S & RS : S>,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): this {
    this.router.delete(path, middleware, ...middlewares);
    return this;
  }

  options<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S extends RS ? S & RS : S>,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): this {
    this.router.options(path, middleware, ...middlewares);
    return this;
  }

  head<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<R, P, S extends RS ? S & RS : S>,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): this {
    this.router.head(path, middleware, ...middlewares);
    return this;
  }

  redirect(
    source: string,
    destination: string | URL,
    status: RedirectStatus = Status.Found
  ): this {
    this.router.redirect(source, destination, status);

    return this;
  }

  routes() {
    return this.router.routes();
  }
  allowedMethods() {
    return this.router.allowedMethods();
  }
}

class ValidatedRoute<RS extends State, V> {
  constructor(
    private parent: Router<RS>,
    private validator: RouterMiddleware<string>
  ) {}

  private apply(
    method:
      | "get"
      | "post"
      | "put"
      | "patch"
      | "delete"
      | "options"
      | "head"
      | "all",
    path: string,
    middleware: any,
    middlewares: any[]
  ): Router<RS> {
    return this.parent[method](
      path,
      this.validator,
      middleware,
      ...middlewares
    );
  }

  input<N extends z.ZodTypeAny>(schema: N, options: ValidationOptions) {
    const validatorMw = validateBody(schema, options);
    return new ValidatedRoute<RS, V & z.infer<N>>(this.parent, (ctx, next) => {
      return this.validator(ctx as any, async () => {
        await validatorMw(ctx as any, next);
      });
    });
  }

  all<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<
      R,
      P,
      S extends RS
        ? S & RS & { body: V & RS["body"] }
        : S & { body: V & RS["body"] }
    >,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): Router<RS> {
    return this.apply("all", path, middleware, middlewares);
  }
  get<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<
      R,
      P,
      S extends RS
        ? S & RS & { body: V & RS["body"] }
        : S & { body: V & RS["body"] }
    >,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): Router<RS> {
    return this.apply("get", path, middleware, middlewares);
  }
  post<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<
      R,
      P,
      S extends RS
        ? S & RS & { body: V & RS["body"] }
        : S & { body: V & RS["body"] }
    >,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): Router<RS> {
    return this.apply("post", path, middleware, middlewares);
  }
  put<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<
      R,
      P,
      S extends RS
        ? S & RS & { body: V & RS["body"] }
        : S & { body: V & RS["body"] }
    >,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): Router<RS> {
    return this.apply("put", path, middleware, middlewares);
  }
  patch<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<
      R,
      P,
      S extends RS
        ? S & RS & { body: V & RS["body"] }
        : S & { body: V & RS["body"] }
    >,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): Router<RS> {
    return this.apply("patch", path, middleware, middlewares);
  }
  delete<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<
      R,
      P,
      S extends RS
        ? S & RS & { body: V & RS["body"] }
        : S & { body: V & RS["body"] }
    >,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): Router<RS> {
    return this.apply("delete", path, middleware, middlewares);
  }
  options<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<
      R,
      P,
      S extends RS
        ? S & RS & { body: V & RS["body"] }
        : S & { body: V & RS["body"] }
    >,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): Router<RS> {
    return this.apply("options", path, middleware, middlewares);
  }
  head<
    R extends string,
    P extends RouteParams<R> = RouteParams<R>,
    S extends State = RS
  >(
    path: R,
    middleware: RouterMiddleware<
      R,
      P,
      S extends RS
        ? S & RS & { body: V & RS["body"] }
        : S & { body: V & RS["body"] }
    >,
    ...middlewares: RouterMiddleware<R, P, RS>[]
  ): Router<RS> {
    return this.apply("head", path, middleware, middlewares);
  }
}
