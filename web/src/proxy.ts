import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refresh the Supabase session cookie on dashboard requests and send signed-out visitors to
// /login. This is an optimistic check only; every route and page re-verifies the user.

export async function proxy(request: NextRequest) {
  // Demo fixtures (development only): signed in when the demo cookie is present.
  if (process.env.DEMO_FIXTURES === "1" && process.env.NODE_ENV !== "production") {
    return request.cookies.get("sl_demo_user") ? NextResponse.next({ request }) : NextResponse.redirect(new URL("/login", request.url));
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = { matcher: ["/dashboard/:path*"] };
