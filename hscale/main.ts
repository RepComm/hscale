import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import {
  Peer,
  req,
  ReqJson,
  ReqMap,
  ReqPeerAdd,
  ResJson,
  ResPeerId,
  ResSchemaGet,
  ResStateGet,
  SSEJson,
  SSEMap,
  State,
} from "./webconsole/src/pages/api.ts";
import { ServerSentEventTarget } from "https://deno.land/x/oak@v12.6.1/deps.ts";
import { ensureDirSync } from "https://deno.land/std@0.211.0/fs/ensure_dir.ts";

function envInt(key: string, def: number): number {
  const value = Deno.env.get(key);
  if (value === undefined) return def;

  const nv = parseInt(value);
  if (Number.isNaN(nv)) return def;
  return nv;
}

const POCKET_PORT = envInt("POCKET_PORT", 8090);
const MARMOT_PORT = envInt("MARMOT_PORT", 8091);
const HSCALE_PORT = envInt("HSCALE_PORT", 8092);

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

const pb_data_dir = "/persist/pocketbase/pb_data";
const pb_data_db = `${pb_data_dir}/data.db`;

const marmot_config = "/marmot/config.toml";

const pb_cmd = new Deno.Command("/pb/pocketbase", {
  args: [
    "serve",
    `--http=0.0.0.0:${POCKET_PORT}`,
    `--dir=${pb_data_dir}`,
  ],
  stdout: "piped",
  stderr: "piped",
});
let pb_proc: Deno.ChildProcess | undefined;

let marmot_proc: Deno.ChildProcess | undefined;

const td = new TextDecoder();

const schema_get_cmd = new Deno.Command("sqlite3", {
  args: [pb_data_db, "-readonly", ".schema"],
});

function schema_get_sync(): string[] {
  const res = schema_get_cmd.outputSync();
  if (!res.success) {
    const err = td.decode(res.stderr);
    return ["", err];
  }

  const schema = td.decode(res.stdout);
  return [schema, ""];
}

function schema_set_sync(s: string) {
  Deno.writeTextFileSync(pb_data_db, s);
}
function pb_is_on() {
  return pb_proc !== undefined;
}
function pb_on() {
  if (pb_is_on()) return;
  log("Starting pocketbase");
  pb_proc = pb_cmd.spawn();
  const opts = {
    preventClose: true,
    preventAbort: true,
    preventCancel: true,
  };
  pb_proc.stdout.pipeTo(Deno.stdout.writable, opts);
  pb_proc.stderr.pipeTo(Deno.stderr.writable, opts);
  state.pb = true;

  sseSendAll({
    type: "state",
    msg: {
      pb: state.pb
    }
  });
}
function pb_off() {
  if (!pb_is_on()) return;
  log("Stopping pocketbase");
  //@ts-expect-error
  pb_proc.kill("SIGINT");
  pb_proc = undefined;
  state.pb = false;
  sseSendAll({
    type: "state",
    msg: {
      pb: state.pb
    }
  });
}
function pb_toggle() {
  if (pb_is_on()) {
    pb_off();
  } else {
    pb_on();
  }
}

const state_fpath = "/persist/hscale/state.json";

function set_saved_state(s: State) {
  const str = JSON.stringify(s);
  ensureDirSync("/persist/hscale");
  Deno.writeTextFileSync(state_fpath, str, {
    create: true
  });
}
function get_saved_state(): State {
  let str: string;

  let result: State;
  try {
    str = Deno.readTextFileSync(state_fpath);
    result = JSON.parse(str);
  } catch (ex) {
    result = {
      peers: [],
      bootstrapSource: "",
      isBootstrapAllowed: false,
      isBootstrapping: false,
      isReplicateAllowed: false,
      isSeedAllowed: false,
      pb: false,
      marmot: false,
    };
    set_saved_state(result);
  }
  return result;
}
const state = get_saved_state();
state.pb = false;
state.marmot = false;

function peerToNatsUrl(peer: Peer) {
  return `nats://${peer.hostname}:${peer.marmotPort}/`;
}
function peersToNatsUrls(peers: Peer[]) {
  const peerAddrs = [];
  for (const peer of peers) {
    peerAddrs.push(peerToNatsUrl(peer));
  }
  return peerAddrs.join(",");
}
function marmot_toggle() {
  if (marmot_proc) {
    marmot_off();
  } else {
    marmot_on();
  }
}
function marmot_on () {
  log("Starting marmot");

  const cmd = new Deno.Command("/marmot/marmot", {
    args: [
      `-cluster-addr localhost:${MARMOT_PORT}`,
      `-cluster-peers '${peersToNatsUrls(state.peers)}'`,
      `-config ${marmot_config}`,
    ],
  });

  marmot_proc = cmd.spawn();
  const opts = {
    preventClose: true,
    preventAbort: true,
    preventCancel: true,
  };
  marmot_proc.stdout.pipeTo(Deno.stdout.writable, opts);
  marmot_proc.stderr.pipeTo(Deno.stderr.writable, opts);

  state.marmot = true;

  sseSendAll({
    type: "state",
    msg: {
      marmot: state.marmot
    }
  });
}
function marmot_off () {
  log("Stopping marmot");
  //@ts-expect-error
  marmot_proc.kill("SIGINT");
  marmot_proc = undefined;
  state.marmot = false;
  sseSendAll({
    type: "state",
    msg: {
      marmot: state.marmot
    }
  });
}

function find_seed_peer() {
  for (const peer of state.peers) {
    if (peer.isSeedAllowed) {
      return peer;
    }
  }
  return undefined;
}

let bootstrapInterval: number;
async function try_bootstrap() {
  if (!state.isBootstrapAllowed) return;

  if (!state.isBootstrapping) {
    state.isBootstrapping = true;

    const seeder = find_seed_peer();
    if (!seeder) {
      state.isBootstrapping = false;
      return;
    }

    const res = await req("schema_get");

    // const res: ResJson<SchemaGet> = await (await fetch(`http://${seeder.hostname}:${seeder.hscalePort}/api/schema`)).json();

    if (res.success) {
      const pb_was_on = pb_is_on();
      pb_off();
      console.log("got schema from seed node", res.schema);
      try {
        schema_set_sync(res.schema);
      } catch (ex) {
        console.warn("Failed bootstrap attempt", ex);
        return;
      }
      setBootstrapEnabled(false);
      if (pb_was_on) pb_on();
      console.log("Bootstrap complete");
    }
  }
}

function setBootstrapEnabled(enabled: boolean = true) {
  state.isBootstrapAllowed = enabled;
  set_saved_state(state);

  if (state.isBootstrapAllowed) {
    if (!bootstrapInterval) {
      bootstrapInterval = setInterval(try_bootstrap, 5000);
    }
  } else {
    state.isBootstrapping = false;
    clearInterval(bootstrapInterval);
  }
}

function addPeer (peer: Peer) {
  state.peers.push(peer);
  sseSendAll({
    type: "state",
    msg: {
      peers: state.peers
    }
  });
}
function removePeer (peer: Peer) {
  const idx = state.peers.indexOf(peer);
  if (idx === -1) {
    throw "Peer is not present in state.peers, cannot remove!";
  }
  state.peers.splice(idx, 1);
  sseSendAll({
    type: "state",
    msg: {
      peers: state.peers
    }
  });
}

function ssu(update: Partial<State>, k: keyof State | undefined) {
  if (k === undefined) return false;
  if (update[k] === undefined) return false;
  if (state[k] !== update) return true;
}

const sseListeners = new Set<ServerSentEventTarget>();
function sseSendAll<K extends keyof SSEMap> (msg: SSEJson<K>) {
  for (const target of sseListeners) {
    target.dispatchMessage(msg);
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

  //static file server to handle /ui web console
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

  // "" redirect to /ui
  router.get("", (ctx) => {
    ctx.response.redirect("/ui");
  });

  // / redirect to /ui
  router.get("/", (ctx) => {
    ctx.response.redirect("/ui");
  });

  // /pb redirect to pocketbase admin webconsole
  router.get("/pb", (ctx) => {
    const { hostname, protocol } = new URL(ctx.request.url);
    ctx.response.redirect(`${protocol}//${hostname}:${POCKET_PORT}/_`);
  });

  //server sent events
  router.get("/sse", (ctx) => {
    const target = ctx.sendEvents();
    sseListeners.add(target);
    target.addEventListener("close", ()=>{
      sseListeners.delete(target);
    });
  });

  router.all("/api/:type", async (ctx) => {
    const type = ctx.params.type as keyof ReqMap;
    const body = ctx.request.body({ type: "json" });
    const query = await body.value as ReqJson;

    const res: ResJson = {
      success: true,
    };

    // console.log(action, target);
    switch (type) {
      case "state_set":
        {
          const qs = query as ReqMap["state_set"];
          console.log("qs", qs);
          if (ssu(qs, "pb")) {
            pb_toggle();
          }
          if (ssu(qs, "marmot")) {
            marmot_toggle();
          }
          if (ssu(qs, "isBootstrapAllowed")) {
            if (state.isBootstrapping) {
              res.success = false;
              res.error = "already bootstrapping from a node";
            } else {
              setBootstrapEnabled(qs.isBootstrapAllowed);
            }
          }
        }
        break;
      case "state_get":
        {
          const r = res as ResStateGet;
          r.state = state; //TODO - transform to censor data depending on context
        }
        break;
      case "schema_get":
        {
          const r = res as ResSchemaGet;
          const [schema, error] = schema_get_sync();
          if (error) {
            res.success = false;
            res.error = error;
          } else {
            r.schema = schema;
          }
        }
        break;
      case "peer_id":
        {
          const r = res as ResPeerId;
          r.peer = {
            hostname: "localhost",
            hscalePort: HSCALE_PORT,
            isSeedAllowed: state.isSeedAllowed,
            marmotPort: MARMOT_PORT,
          };
        }
        break;
      case "peer_add":
        {
          const q = query as ReqPeerAdd;
          
          let host = q.host;
          if (!host.startsWith("http://")) {
            host = `http://${host}`;
          }

          req("peer_id", undefined, host).then((res) => {
            const r = res as ResPeerId;
            const { hostname, port } = new URL(q.host);
            //fix hostname, we already know it
            r.peer.hostname = hostname;
            addPeer(r.peer);
            console.log("successfully added peer");
          }).catch((reason)=>{
            console.warn("Failed to add peer, couldn't contact peer", reason);
          });
        }
        break;
      default:
        console.warn("Unhandle action", type, "ignoring");
        res.success = false;
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
