const apikey = Deno.env.get("APIKEY");
const githubUser = Deno.env.get("GITHUB_USER");

class FmtResponse<T> {
  private code: number = 200;
  private success: boolean = true;
  private message: string = "success";
  private data: T | null = null;

  constructor(opts: { code?: number; message?: string; data?: T }) {
    if (opts.code && opts.code >= 400) {
      this.success = false;
    }
    this.message = opts.message || "success";
    this.data = opts.data || null;
  }

  public json() {
    const resObj = {
      success: this.success,
      message: this.message,
      data: this.data,
    };

    return new Response(JSON.stringify(resObj), {
      status: this.code,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

const handler = async (req: Request) => {
  const pathname = new URL(req.url).pathname;

  const kv = await Deno.openKv();

  const now = new Date();

  if (pathname == "/") {
    const githubRes = await fetch(
      `https://api.github.com/users/${githubUser}/events`
    );
    const githubData = await githubRes.json();
    const githubEventTime = new Date(githubData[0].created_at);
    const githubEventTimeDiff = now.getTime() - githubEventTime.getTime();

    const latestReMonitorEventTimeStr = (
      await kv.get(["latestReMonitorEventTime"])
    ).value as string;

    if (latestReMonitorEventTimeStr == null) {
      kv.set(["latestReMonitorEventTime"], now);
    }

    const latestReMonitorEventTime = new Date(latestReMonitorEventTimeStr);
    const latestReMonitorEventTimeDiff =
      now.getTime() - latestReMonitorEventTime.getTime();

    return new FmtResponse({
      data: {
        githubEventTimeDiff,
        latestReMonitorEventTimeDiff,
      },
    }).json();
  }

  if (pathname == "/remonitor") {
    const reqApikey = req.headers.get("apikey");
    if (reqApikey == null || reqApikey !== apikey) {
      return new FmtResponse({
        code: 401,
        message: "Unauthorized",
      }).json();
    }

    kv.set(["latestReMonitorEventTime"], now);

    return new FmtResponse({}).json();
  }

  return new FmtResponse({
    code: 404,
    message: "Not Found",
  }).json();
};

Deno.serve(handler);
