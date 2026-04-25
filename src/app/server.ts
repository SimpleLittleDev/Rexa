import { createServer } from "node:http";
import type { MainAgent } from "../agent/main-agent";

export function startServer(agent: MainAgent, port = Number(process.env.REXA_API_PORT ?? 8786)): Promise<void> {
  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, name: "Rexa" }));
      return;
    }

    if (req.method === "POST" && req.url === "/chat") {
      const body = JSON.parse(await readBody(req)) as { message?: string; userId?: string };
      const result = await agent.run(body.message ?? "", { userId: body.userId ?? "api" });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
}

function readBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
