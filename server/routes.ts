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
        if (/^\d{3,}$/.test(line) || /^[A-Z]{2,}-\d+$/i.test(line)) {
          currentId = line;
        } else if (/^(KIT|SET|GRP|GRUPPE)\s/i.test(line)) {
          currentGroup = line;
        } else if (line.length > 2 && !skipPattern.test(line) && !/^\d+$/.test(line)) {
          let name = line;
          let group = currentGroup;
          const tabMatch = line.match(/^(.+?)\t+(.+)$/);
          if (tabMatch) {
            name = tabMatch[1].trim();
            group = tabMatch[2].trim();
          }
          items.push({ id: currentId, name, group });
          currentId = "";
        }
      }

      res.json({ items, rawLines: lines });
    } catch (err) {
      console.error("PDF parse error:", err);
      res.status(500).json({ error: "Kunne ikke læse PDF-filen" });
    }
  });

  return httpServer;
}
