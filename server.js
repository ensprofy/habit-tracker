#!/usr/bin/env node
/* Habit Tracker server: serves the app and stores its data in habits.csv.
 *
 *   node server.js            then open http://localhost:3000
 *
 * Environment variables:
 *   PORT         port to listen on (default 3000; 0 picks a free one)
 *   HABITS_FILE  where to keep the data (default: habits.csv next to this file)
 *
 * No dependencies, Node 18 or newer. Listens on 127.0.0.1 only, so nothing on
 * your network can reach it.
 *
 * API (used by storage.js):
 *   GET /api/data   -> the CSV file (just the header row if it is empty)
 *   PUT /api/data   -> replaces the file with the request body (text/csv)
 */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var ROOT = __dirname;
var PORT = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);
var DATA_FILE = path.resolve(process.env.HABITS_FILE || path.join(ROOT, "habits.csv"));
var HEADER = "habit,created,date";
var MAX_BODY_BYTES = 5 * 1024 * 1024;

// Only these files are ever served. habits.csv is reachable through /api/data only.
var STATIC_FILES = {
  "/": "index.html",
  "/index.html": "index.html",
  "/style.css": "style.css",
  "/storage.js": "storage.js",
  "/csv.js": "csv.js",
  "/dates.js": "dates.js",
  "/charts.js": "charts.js",
  "/app.js": "app.js"
};
var CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  console.error("PORT must be a whole number between 0 and 65535.");
  process.exit(1);
}

// ---- Data file ---------------------------------------------------------

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, HEADER + "\r\n", "utf8");
  }
}

function readData() {
  var text;
  try {
    text = fs.readFileSync(DATA_FILE, "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    text = "";
  }
  return text.replace(/^﻿/, "").trim() === "" ? HEADER + "\r\n" : text;
}

// Writes to a temporary file, then renames it over the real one, so a crash
// can never leave a half-written habits.csv. The previous version is kept as
// habits.csv.bak (one step of undo).
function writeData(text) {
  var tmp = DATA_FILE + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, text, "utf8");
  try {
    if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_FILE + ".bak");
  } catch (e) {
    console.warn("Could not update the .bak copy:", e.message);
  }
  fs.renameSync(tmp, DATA_FILE);
}

// The body must look like a Habit Tracker CSV: right header, text only.
function validateBody(text) {
  if (text.indexOf("\u0000") !== -1) return "The body is not text.";
  var firstLine = text.replace(/^﻿/, "").split(/\r\n|\n|\r/)[0];
  if (firstLine.replace(/\s+/g, "").toLowerCase() !== HEADER) {
    return "The first line must be: " + HEADER;
  }
  return null;
}

// ---- HTTP helpers --------------------------------------------------------

var BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'"
};

function send(res, status, body, type, extra) {
  var headers = Object.assign({}, BASE_HEADERS, extra || {});
  if (body !== undefined && body !== null) {
    headers["Content-Type"] = type || "text/plain; charset=utf-8";
    headers["Content-Length"] = Buffer.byteLength(body);
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? undefined : body);
}

function allowedHosts() {
  var port = server.address() && server.address().port;
  return ["localhost:" + port, "127.0.0.1:" + port];
}

// Blocks DNS-rebinding (a foreign site pointed at 127.0.0.1) and requests
// made from other websites in the browser.
function originAllowed(origin) {
  if (!origin) return true; // same-origin GET requests and non-browser clients send none
  var hosts = allowedHosts();
  return hosts.some(function (h) { return origin.toLowerCase() === "http://" + h; });
}

function handleApi(req, res) {
  if (req.method === "GET") {
    try {
      return send(res, 200, readData(), "text/csv; charset=utf-8");
    } catch (e) {
      console.error("Read failed:", e.message);
      return send(res, 500, "Could not read the data file.");
    }
  }

  if (req.method !== "PUT") {
    return send(res, 405, "Method not allowed.", null, { Allow: "GET, PUT" });
  }
  if (!originAllowed(req.headers.origin)) return send(res, 403, "Forbidden origin.");
  // text/csv is not a "simple" content type, so browsers send a CORS preflight
  // first for cross-site requests, and we never answer it. This closes that door.
  if (!/^text\/csv\b/i.test(req.headers["content-type"] || "")) {
    return send(res, 415, "Send the data as text/csv.");
  }
  var declared = Number(req.headers["content-length"]);
  if (declared > MAX_BODY_BYTES) return tooLarge(req, res);

  var chunks = [], size = 0, aborted = false;
  req.on("data", function (chunk) {
    if (aborted) return;
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      aborted = true;
      tooLarge(req, res);
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", function () {
    if (aborted) return;
    var text = Buffer.concat(chunks).toString("utf8");
    var problem = validateBody(text);
    if (problem) return send(res, 400, problem);
    try {
      writeData(text);
    } catch (e) {
      console.error("Write failed:", e.message);
      return send(res, 500, "Could not write the data file.");
    }
    res.writeHead(204, BASE_HEADERS);
    res.end();
  });
  req.on("error", function () { aborted = true; });
}

function tooLarge(req, res) {
  res.writeHead(413, Object.assign({ Connection: "close", "Content-Type": "text/plain; charset=utf-8" }, BASE_HEADERS));
  res.end("That file is too large.", function () { req.destroy(); });
}

function handleRequest(req, res) {
  var host = String(req.headers.host || "").toLowerCase();
  if (allowedHosts().indexOf(host) === -1) return send(res, 403, "Forbidden host.");

  var pathname;
  try {
    pathname = new URL(req.url, "http://localhost").pathname;
  } catch (e) {
    return send(res, 400, "Bad request.");
  }

  if (pathname === "/api/data") return handleApi(req, res);

  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "Method not allowed.", null, { Allow: "GET, HEAD" });
  }
  if (pathname === "/favicon.ico") return send(res, 204);

  var file = Object.prototype.hasOwnProperty.call(STATIC_FILES, pathname) ? STATIC_FILES[pathname] : null;
  if (!file) return send(res, 404, "Not found.");

  fs.readFile(path.join(ROOT, file), function (err, data) {
    if (err) return send(res, 404, "Not found.");
    var headers = Object.assign({}, BASE_HEADERS, {
      "Content-Type": CONTENT_TYPES[path.extname(file)] || "application/octet-stream",
      "Content-Length": data.length
    });
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : data);
  });
}

// ---- Start -------------------------------------------------------------------

var server = http.createServer(handleRequest);

server.on("error", function (err) {
  if (err.code === "EADDRINUSE") {
    console.error("Port " + PORT + " is already in use. Is Habit Tracker already running?");
    console.error("Try another port, e.g.  PORT=3001 node server.js");
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});

try {
  ensureDataFile();
} catch (e) {
  console.error("Cannot create the data file " + DATA_FILE + ": " + e.message);
  process.exit(1);
}

server.listen(PORT, "127.0.0.1", function () {
  console.log("Habit Tracker is running at http://localhost:" + server.address().port);
  console.log("Your data is stored in " + DATA_FILE);
  console.log("Press Ctrl+C to stop.");
});

process.on("SIGINT", function () { process.exit(0); });
process.on("SIGTERM", function () { process.exit(0); });
