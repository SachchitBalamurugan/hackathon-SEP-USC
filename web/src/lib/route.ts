import "server-only";
import { ZodError, type z } from "zod";
import { corsHeaders, json, preflight, resolveUser, unauthorized, type Caller } from "./auth";
import { RefusalError } from "./llm";

type Handler = (req: Request, caller: Caller) => Promise<Response>;

/** Wrap a route: authenticate, apply CORS, and turn known errors into clean JSON responses. */
export function route(allow: Caller["via"][], fn: Handler) {
  return async (req: Request) => {
    const caller = await resolveUser(req, allow);
    if (!caller) return unauthorized();
    try {
      const res = await fn(req, caller);
      for (const [k, v] of Object.entries(corsHeaders(req.headers.get("origin")))) res.headers.set(k, v);
      return res;
    } catch (e) {
      if (e instanceof ZodError) return json(req, { error: "invalid_request", issues: e.issues.slice(0, 5) }, { status: 400 });
      if (e instanceof RefusalError) return json(req, { error: "declined", message: "The tutor couldn't help with this one." }, { status: 422 });
      console.error(e);
      return json(req, { error: "server_error" }, { status: 500 });
    }
  };
}

export async function body<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  return schema.parse(await req.json());
}

export const OPTIONS = preflight;
export { json };
