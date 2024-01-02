
import { Application, Router } from "https://deno.land/x/oak/mod.ts";

function envInt (key: string, def: number): number {
  const value = Deno.env.get(key);
  if (value === undefined) return def;

  const nv = parseInt(value);
  if (Number.isNaN(nv)) return def;
  return nv;
}

const HSCALE_PORT = envInt("HSCALE_PORT", 10209);
const MARMOT_PORT = envInt("MARMOT_PORT", 4221);
const POCKET_PORT = envInt("POCKET_PORT", 8090);

function log(...args: any[]) {
  console.log("[hscale][log]", ...args);
}

//MAKE CONTAINER STOPPING FASTER / NORMAL
const handleExitSignals = () => {
  log("Aborting for SIGTERM|SIGINT");
  Deno.exit(0);
};
Deno.addSignalListener("SIGTERM", handleExitSignals);
Deno.addSignalListener("SIGINT", handleExitSignals);

const pb_cmd = new Deno.Command("/pb/pocketbase", {
  args: [
    "serve",
    `--http=0.0.0.0:${POCKET_PORT}`,
    '--dir="/persist/pocketbase/pb_data"',
  ],
  stdout: "piped",
  stderr: "piped",
});
let pb_proc: Deno.ChildProcess | undefined;

let marmot_proc: Deno.ChildProcess | undefined;

function pb_toggle() {
  if (pb_proc) {
    log("Stopping pocketbase");
    pb_proc.kill("SIGINT");
    pb_proc = undefined;
  } else {
    log("Starting pocketbase");
    pb_proc = pb_cmd.spawn();
    const opts = {
      preventClose: true,
      preventAbort: true,
      preventCancel: true,
    };
    pb_proc.stdout.pipeTo(Deno.stdout.writable, opts);
    pb_proc.stderr.pipeTo(Deno.stderr.writable, opts);
  }
}

async function main() {
  log("starting");

  const port = HSCALE_PORT;

  const app = new Application();
  const router = new Router();

  //handle HTTP issues without crashing
  app.use(async (context, next) => {
    try {
      await next();
    } catch (err) {
      console.log(err);
    }
  });

  //handle /ui web console
  app.use(async (ctx, next) => {
    let fpath = ctx.request.url.pathname;

    if (fpath.startsWith("/ui")) {
      fpath = fpath.substring("/ui".length);

      if (
        fpath === "" ||
        fpath === "/" ||
        fpath === "/index"
      ) {
        fpath = "/index.html";
      }

      await ctx.send({
        path: fpath,
        root: "/hscale/dist",
      }).catch((reason) => {
        console.warn("Couldn't send", fpath, reason);
      });
    } else {
      await next();
    }
  });

  router.get("/api/:action/:target", (ctx) => {
    const { action, target } = ctx.params;
    const res = {
      status: "success",
      action,
      target,
      result: {
        target,
        status: "" as any,
      },
    };

    // console.log(action, target);
    switch (action) {
      case "toggle":
        switch (target) {
          case "pb":
            pb_toggle();
            res.result.status = pb_proc ? "online" : "offline";
            break;
          case "marmot":
            if (!marmot_proc) {
              marmot_proc = true as any;
            } else {
              marmot_proc = undefined as any;
            }
            res.result.status = marmot_proc ? "online" : "offline";
            break;
          default:
            console.warn("Unhandled target", target, "ignoring");
            res.status = "failed";
            break;
        }

        break;
      case "status":
        switch (target) {
          case "pb":
            res.result.status = pb_proc ? "online" : "offline";
            break;
          case "marmot":
            res.result.status = marmot_proc ? "online" : "offline";
            break;
          case "all":
            res.result.status = {
              marmot: marmot_proc ? "online" : "offline",
              pb: pb_proc ? "online" : "offline",
            }
            break;
          default:
            console.warn("Unhandled target", target, "ignoring");
            res.status = "failed";
            break;
        }
        break;
      default:
        console.warn("Unhandle action", action, "ignoring");
        res.status = "failed";
        break;
    }
    ctx.response.body = res;
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen({ port });

  log(`Web Console: http://localhost:${port}/`);
}

main();
