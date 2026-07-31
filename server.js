import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import getRawBody from "raw-body";
import { fetchAllHazards } from "./hazards-source.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Capture raw request body for POST, PUT, and PATCH requests
app.use(async (req, res, next) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      req.rawBody = await getRawBody(req);
    }
  } catch (err) {
    console.error("Raw body error:", err);
  }
  next();
});

// Aggregated multi-source hazards endpoint (USGS / NASA EONET / GDACS).
// Register before the generic /api proxy so this route is handled locally.
app.get("/api/hazards", async (req, res) => {
  try {
    const sourcesParam = req.query.source ?? req.query.sources;
    const sources =
      typeof sourcesParam === "string" && sourcesParam.trim().length > 0
        ? sourcesParam.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

    const typeParam = req.query.type;
    const typeFilter =
      typeof typeParam === "string" && typeParam.trim().length > 0
        ? new Set(typeParam.split(",").map((s) => s.trim().toUpperCase()))
        : null;

    const { hazards, meta } = await fetchAllHazards({ sources });
    const filtered = typeFilter
      ? hazards.filter((h) => typeFilter.has(String(h.type).toUpperCase()))
      : hazards;

    res.status(200).json({
      success: true,
      data: filtered,
      meta: { ...meta, returned: filtered.length },
    });
  } catch (err) {
    console.error("/api/hazards error:", err);
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Proxy all /api requests to the DisasterAware API
app.use("/api", async (req, res) => {
  const targetUrl = "https://api.disasteraware.com" + req.url;

  console.log("===== Incoming Proxy Request =====");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Proxying to:", targetUrl);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  if (req.rawBody) {
    console.log("Raw Body Length:", req.rawBody.length);
    const preview =
      req.rawBody.length > 600
        ? req.rawBody.toString("utf8", 0, 600) + "...[truncated]"
        : req.rawBody.toString("utf8");
    console.log("Raw Body Preview:", preview);
  } else {
    console.log("No raw body attached to request.");
  }

  try {
    // Prepare headers for forwarding (remove host to avoid rejection)
    const headers = { ...req.headers };
    delete headers.host;

    const fetchOptions = {
      method: req.method,
      headers,
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? req.rawBody
          : undefined,
    };

    console.log("===== Outgoing Fetch Options =====");
    console.log("Fetch Method:", fetchOptions.method);
    console.log("Fetch Headers:", JSON.stringify(fetchOptions.headers, null, 2));
    console.log("Fetch Body Present:", !!fetchOptions.body);

    const response = await fetch(targetUrl, fetchOptions);

    console.log("===== Proxy Response =====");
    console.log("Status:", response.status, response.statusText);

    const resHeadersObj = {};
    response.headers.forEach((v, k) => (resHeadersObj[k] = v));
    console.log("Response Headers:", JSON.stringify(resHeadersObj, null, 2));

    const text = await response.text();
    const preview =
      text.length > 1200 ? text.slice(0, 1200) + "...[truncated]" : text;
    console.log("Response Body Preview:", preview);

    res.status(response.status).send(text);
  } catch (err) {
    console.error("===== Proxy Error =====");
    console.error(err);
    if (err instanceof Error) {
      console.error("Message:", err.message);
      console.error("Stack:", err.stack);
    }
    res.status(500).json({ error: err.message });
  }
});

// Serve static files generated in /dist
app.use(express.static(path.join(__dirname, "dist")));

// Fallback for SPA routing: always return index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));