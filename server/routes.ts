import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { PDFParse } from "pdf-parse";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/parse-pdf", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Ingen fil uploadet" });
      }
      const parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      const text = result.text;
      await parser.destroy();
      const lines = text.split(/\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);

      const items: { id: string; name: string; group: string }[] = [];
      let currentId = "";
      let currentGroup = "";
      const skipPattern = /^--|^\d{1,2}$|^page\s/i;

      for (const line of lines) {
        // Tab-separated format from PDFParse: "Name\tID\tGroup"
        // e.g. "Doku - Deity DLTX \t24088\tDeity 1"
        if (line.includes('\t')) {
          const parts = line.split('\t').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
          if (parts.length >= 2 && /^\d{3,6}$/.test(parts[1])) {
            items.push({ id: parts[1], name: parts[0], group: parts[2] || '' });
            continue;
          }
        }

        if (/^\d{3,}$/.test(line) || /^[A-Z]{2,}-\d+$/i.test(line)) {
          // If the last item has no ID yet, attach this ID to it (ID-after-name format)
          if (items.length > 0 && !items[items.length - 1].id) {
            items[items.length - 1].id = line;
          } else {
            currentId = line;
          }
        } else if (/^(KIT|SET|GRP|GRUPPE)\s/i.test(line) || /^Kit\s/i.test(line)) {
          currentGroup = line;
        } else if (line.length > 2 && !skipPattern.test(line) && !/^\d+$/.test(line)) {
          items.push({ id: currentId, name: line, group: currentGroup });
          currentId = "";
        }
      }

      // Fix orphaned group lines: if an item has no group and the next item has
      // no id and its name looks like a group token (e.g. "Deity 1"), merge them
      for (let i = 0; i < items.length - 1; i++) {
        if (!items[i].group && !items[i + 1].id && /^[A-Za-z].{0,30}$/.test(items[i + 1].name)) {
          items[i].group = items[i + 1].name;
          items.splice(i + 1, 1);
        }
      }
      // Remove leftover items with no id and no group (noise)
      const filtered = items.filter(it => it.id || it.group || it.name.length > 5);

      res.json({ items: filtered, rawLines: lines });
    } catch (err) {
      console.error("PDF parse error:", err);
      res.status(500).json({ error: "Kunne ikke læse PDF-filen" });
    }
  });

  return httpServer;
}
