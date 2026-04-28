import { NextRequest, NextResponse } from "next/server";

const MELD_BASE_URL = "https://api-sb.meld.io";

async function proxyToMeld(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const apiKey = process.env.MELD_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "MELD_API_KEY not configured" }, { status: 500 });
  }

  const { path } = await params;
  const meldPath = path.join("/");
  const url = new URL(`${MELD_BASE_URL}/${meldPath}`);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Authorization": `BASIC ${apiKey}`,
  };

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    fetchOptions.body = await req.text();
  }

  const res = await fetch(url.toString(), fetchOptions);
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export const GET = proxyToMeld;
export const POST = proxyToMeld;
