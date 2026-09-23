import http from "node:http";

const MAX_BODY_SIZE = 1e6;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePattern(pattern) {
  const keys = [];
  const source = pattern
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        keys.push(segment.slice(1));
        return "([^/]+)";
      }
      return escapeRegExp(segment);
    })
    .join("/");

  return { keys, regex: new RegExp(`^/?${source}/?$`) };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Corpo da requisição muito grande"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON inválido no corpo da requisição"));
      }
    });
    req.on("error", reject);
  });
}

function augmentResponse(res) {
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.send = function (payload) {
    const body = JSON.stringify(payload, null, 2);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Length", Buffer.byteLength(body));
    res.writeHead(res.statusCode);
    res.end(body);
  };
}

export function createApp() {
  const routes = [];

  function addRoute(method, pattern, handler) {
    routes.push({ method, ...compilePattern(pattern), handler });
  }

  function findRoute(req, pathname) {
    let matched = false;
    for (const route of routes) {
      const match = route.regex.exec(pathname);
      if (!match) continue;
      matched = true;
      if (route.method !== req.method) continue;

      const params = {};
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1] || "");
      });

      return { matched: true, params, handler: route.handler };
    }
    return { matched };
  }

  async function handleRequest(req, res) {
    augmentResponse(res);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const body = req.method === "GET" || req.method === "HEAD" ? {} : await readBody(req);

    const match = findRoute(req, url.pathname);

    if (!match.matched) {
      return res.status(404).send({ error: "Rota não encontrada" });
    }
    if (!match.handler) {
      return res.status(405).send({ error: "Método não permitido" });
    }

    req.params = match.params;
    req.query = Object.fromEntries(url.searchParams);
    req.body = body;

    return match.handler(req, res);
  }

  const app = {
    get(pattern, handler) {
      addRoute("GET", pattern, handler);
      return app;
    },
    post(pattern, handler) {
      addRoute("POST", pattern, handler);
      return app;
    },
    delete(pattern, handler) {
      addRoute("DELETE", pattern, handler);
      return app;
    },
    route(method, pattern, handler) {
      addRoute(method, pattern, handler);
      return app;
    },
    listen(port, host, callback) {
      const server = http.createServer((req, res) => {
        handleRequest(req, res).catch((err) => {
          if (res.headersSent) {
            res.end();
            return;
          }
          const status =
            err.message.includes("JSON inválido") || err.message.includes("grande") ? 400 : 500;
          res.status(status).send({ error: err.message });
        });
      });
      server.listen(port, host, callback);
      return server;
    },
  };

  return app;
}
