import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeSeed } from "./seed-data.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.resolve(__dirname, "../data/seed.json"), JSON.stringify(makeSeed(), null, 2));
fs.writeFileSync(path.resolve(__dirname, "../data/db.json"), JSON.stringify(makeSeed(), null, 2));
console.log("Seed data written.");
