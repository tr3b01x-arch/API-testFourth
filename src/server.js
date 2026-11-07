import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, "../data/db.json");
const app = express();
const PORT = Number(process.env.PORT || 4010);
const USER = process.env.FOURTH_USERNAME || "demo";
const PASS = process.env.FOURTH_PASSWORD || "demo123";

app.use(express.json());
const allowedOrigins = (process.env.CORS_ORIGIN || "*").split(",").map(s => s.trim());
app.use(cors({ origin: allowedOrigins.includes("*") ? true : allowedOrigins }));

function readDb() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function writeDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
function basicAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Fourth simulator"');
    return res.status(401).json({ error: "Unauthorized", message: "Basic authentication required" });
  }
  let decoded = "";
  try { decoded = Buffer.from(header.slice(6), "base64").toString("utf8"); } catch {}
  const split = decoded.indexOf(":");
  const username = split >= 0 ? decoded.slice(0, split) : "";
  const password = split >= 0 ? decoded.slice(split + 1) : "";
  if (username !== USER || password !== PASS) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
  }
  next();
}
app.use("/api", basicAuth);

const asDate = value => {
  if (!/^\d{8}$/.test(value || "")) return null;
  const d = new Date(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const dateKey = d => d.toISOString().slice(0,10);
function dateInRange(value, from, to) {
  const day = String(value || "").slice(0,10);
  return day >= dateKey(from) && day <= dateKey(to);
}
function collection(req, res, key) {
  const db = readDb();
  return res.json(db[key] || []);
}
function requireRange(req, res, next) {
  const fromRaw = req.query.fromDate;
  const toRaw = req.query.toDate;
  if (!fromRaw || !toRaw) return res.status(400).json({ error: "Bad Request", message: "fromDate and toDate are required together (YYYYMMDD)" });
  const from = asDate(String(fromRaw));
  const to = asDate(String(toRaw));
  if (!from || !to || from > to) return res.status(400).json({ error: "Bad Request", message: "Dates must be valid YYYYMMDD values and fromDate must not be after toDate" });
  req.dateRange = { from, to };
  next();
}

// Health and discovery endpoints are intentionally unauthenticated.
app.get("/health", (_req, res) => res.json({ status: "ok", service: "fourth-compatible-api-simulator", version: "1.0.0" }));
app.get("/", (_req, res) => res.json({
  name: "Fourth-compatible API simulator",
  mode: "mock",
  docs: "/docs",
  health: "/health",
  note: "A development simulator. Only response fields confirmed by public documentation should be treated as contract-accurate."
}));
app.get("/docs", (_req, res) => res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><title>Fourth Simulator</title>
<style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.5}code{background:#eee;padding:2px 5px}pre{background:#f5f5f5;padding:14px;overflow:auto}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body>
<h1>Fourth-compatible API simulator</h1><p>Base URL: <code>http://localhost:${PORT}/api</code></p>
<p>Authentication: HTTP Basic. Demo credentials are configured in <code>.env</code>.</p>
<h2>Documented-style schedule endpoint</h2><pre>GET /api/shifts?fromDate=20261101&toDate=20261107</pre>
<h2>Additional simulator endpoints</h2><table><tr><th>Method</th><th>Path</th><th>Purpose</th></tr>
<tr><td>GET</td><td>/organisations/:orgId/Employees</td><td>Employees</td></tr>
<tr><td>GET</td><td>/organisations/:orgId/Employees/Employments</td><td>Employment records</td></tr>
<tr><td>GET</td><td>/organisations/:orgId/Employees/Absences</td><td>Absences</td></tr>
<tr><td>GET</td><td>/organisations/:orgId/Employees/PayParts</td><td>Pay parts</td></tr>
<tr><td>GET</td><td>/organisations/:orgId/Locations</td><td>Locations</td></tr>
<tr><td>GET</td><td>/organisations/:orgId/Divisions</td><td>Divisions/departments</td></tr>
<tr><td>GET</td><td>/time-attendance</td><td>Clock records (simulator extension)</td></tr></table>
<h2>Query options</h2><p>Collection endpoints support <code>page</code>, <code>pageSize</code>, and where relevant <code>fromDate</code>/<code>toDate</code>. Use <code>?all=true</code> to disable pagination.</p>
<p><strong>Important:</strong> The schedules response keys are based on publicly documented Fourth Schedules API examples. Employee, absence, location, division and pay-part payloads here are useful mock schemas, not a guarantee of exact production Fourth schemas. Confirm these against your provisioned Fourth API documentation before switching to live.</p>
</body></html>`));

function paginate(items, req, res) {
  if (req.query.all === "true") return res.json(items);
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10) || 1);
  const pageSize = Math.min(500, Math.max(1, Number.parseInt(req.query.pageSize || "100", 10) || 100));
  const start = (page - 1) * pageSize;
  res.set("X-Total-Count", String(items.length));
  res.set("X-Page", String(page));
  res.set("X-Page-Size", String(pageSize));
  return res.json(items.slice(start, start + pageSize));
}

// Fourth Schedules API-style endpoint. Date filters use YYYYMMDD.
app.get("/api/shifts", requireRange, (req, res) => {
  const db = readDb();
  const shifts = db.shifts.filter(s => dateInRange(s.workDate, req.dateRange.from, req.dateRange.to));
  res.json(shifts);
});

const orgRoutes = [
  ["/Employees", "employees"],
  ["/Employees/Employments", "employments"],
  ["/Employees/Absences", "absences"],
  ["/Employees/PayParts", "payParts"],
  ["/Locations", "locations"],
  ["/Divisions", "divisions"]
];
for (const [suffix, key] of orgRoutes) {
  app.get(`/api/organisations/:orgId${suffix}`, (req, res) => {
    const db = readDb();
    let items = (db[key] || []).filter(item => !item.organisationId || item.organisationId === req.params.orgId);
    if (req.query.employeeId) items = items.filter(x => x.employeeId === req.query.employeeId);
    if (req.query.locationId) items = items.filter(x => x.locationId === req.query.locationId);
    if (req.query.fromDate || req.query.toDate) {
      const from = req.query.fromDate ? asDate(String(req.query.fromDate)) : new Date("2000-01-01T00:00:00Z");
      const to = req.query.toDate ? asDate(String(req.query.toDate)) : new Date("2100-01-01T00:00:00Z");
      if (!from || !to || from > to) return res.status(400).json({ error: "Bad Request", message: "Use valid fromDate/toDate values in YYYYMMDD format" });
      items = items.filter(x => {
        const d = x.workDate || x.startDate || x.date || x.effectiveFrom || "";
        return dateInRange(d, from, to);
      });
    }
    return paginate(items, req, res);
  });
}

// Optional development extensions, not asserted to be official Fourth routes.
app.get("/api/time-attendance", (req, res) => {
  const db = readDb();
  let rows = db.timeAttendance;
  if (req.query.employeeId) rows = rows.filter(x => x.employeeId === req.query.employeeId);
  if (req.query.fromDate) rows = rows.filter(x => x.date >= req.query.fromDate);
  if (req.query.toDate) rows = rows.filter(x => x.date <= req.query.toDate);
  paginate(rows, req, res);
});

app.get("/api/organisations/:orgId", (req, res) => {
  const db = readDb();
  const org = db.organisations.find(x => x.id === req.params.orgId);
  if (!org) return res.status(404).json({ error: "Not Found", message: "Organisation not found" });
  res.json(org);
});

// Mock-only data mutation endpoint to make front-end testing easier.
app.post("/api/_mock/reset", (_req, res) => {
  const seed = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/seed.json"), "utf8"));
  writeDb(seed);
  res.json({ status: "reset", counts: Object.fromEntries(Object.entries(seed).filter(([,v]) => Array.isArray(v)).map(([k,v]) => [k,v.length])) });
});
app.use((req, res) => res.status(404).json({ error: "Not Found", message: `No route for ${req.method} ${req.path}` }));

app.listen(PORT, () => console.log(`Fourth simulator listening at http://localhost:${PORT}`));
