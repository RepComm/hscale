
// import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { serveDir, serveFile } from "https://deno.land/std@0.207.0/http/file_server.ts";
import { extname } from "https://deno.land/std@0.207.0/path/extname.ts";

import { contentType } from "https://deno.land/std@0.210.0/media_types/mod.ts";

const controller = new AbortController();

Deno.addSignalListener('SIGTERM', () => {
  console.log('Aborting for SIGTERM')
  // controller.abort();
  Deno.exit(0);
});

Deno.addSignalListener('SIGINT', () => {
  console.log('Aborting for SIGINT')
  // controller.abort();
  Deno.exit(0);
});

async function handleHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    // Use the request pathname as filepath
    const url = new URL(requestEvent.request.url);
    let filepath = decodeURIComponent(url.pathname);

    if (filepath === "/") {
      filepath = "/index.html";
    }
    let file;
    try {
      file = await Deno.open("/hscale/dist/" + filepath, { read: true });
    } catch {
      // If the file cannot be opened, return a "404 Not Found" response
      const notFoundResponse = new Response("404 Not Found", { status: 404 });
      await requestEvent.respondWith(notFoundResponse);
      continue;
    }
    
    const ext = extname(filepath);
    const mimeType = contentType(ext);
    
    //stream the file instead of loading into ram
    const readableStream = file.readable;

    // Build and send the response
    const response = new Response(readableStream);
    if (mimeType !== undefined) {
      response.headers.append("Content-Type", mimeType);
    }
    await requestEvent.respondWith(response);
  }
}

async function main () {
  console.log("hscale deno app starting");

  const port = 10209;

  const server = Deno.listen({ port });

  console.log(`Web Console: http://localhost:${port}/`);

  for await (const conn of server) {
    handleHttp(conn).catch(console.error);
  }
}

main();
