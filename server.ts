import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Google Gemini Connected VIN Decoder
  app.post("/api/vin/decode", async (req, res) => {
    try {
      const { vin } = req.body;
      const cleanVin = (vin || "").trim().toUpperCase();

      if (!cleanVin || cleanVin.length !== 17) {
        return res.status(400).json({ error: "رقم الشاسيه (VIN) يجب أن يتكون من 17 رمزًا دقيقًا" });
      }

      // If GEMINI_API_KEY is present, query Google Gemini for precision Mercedes EPC decoding
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = getAI();
          const prompt = `You are a world-class Mercedes-Benz Electronic Parts Catalog (EPC) and VIN decoding specialist for AH.Libya Store.
Decode the following 17-character VIN accurately: "${cleanVin}".

Return a strict JSON object with these exact fields:
{
  "vin": "${cleanVin}",
  "make": "Mercedes-Benz",
  "model": "<Exact Model Name, e.g. Mercedes-Benz S 500 4MATIC Sedan>",
  "modelYear": <Year as Integer, e.g. 2022>,
  "chassis": "<Exact Chassis code, e.g. W223, W222, W213, W205, W206, W167, W463, X253, C238, etc.>",
  "engineModel": "<Exact Engine Code, e.g. M256.930 3.0L Inline-6 Turbo EQ Boost, M274, OM654, M177, etc.>",
  "displacementL": "<e.g. 3.0L>",
  "cylinders": "<e.g. 6 Cylinders>",
  "fuelType": "<e.g. Gasoline Mild Hybrid / Diesel>",
  "bodyClass": "<e.g. Luxury Sedan, SUV, Coupe>",
  "driveType": "<e.g. 4MATIC AWD / RWD>",
  "plantCountry": "<e.g. Germany (Sindelfingen / Bremen / Rastatt)>",
  "series": "<e.g. S-Class / E-Class / C-Class / GLE>",
  "transmission": "<e.g. 9G-TRONIC Automatic>",
  "notes": "<Arabic summary of vehicle specifications and engineering notes>",
  "suggestedOemParts": [
    {
      "nameAr": "<Arabic part name, e.g. تيل فرامل أمامي>",
      "nameEn": "<English part name, e.g. Front Brake Pad Set>",
      "partNumber": "<Genuine Mercedes OEM part number, e.g. A0004208000>",
      "category": "<Category code, e.g. BRAKES, ENGINE, FILTERS, SUSPENSION>"
    }
  ]
}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });

          const rawText = response.text || "";
          const decoded = JSON.parse(rawText);
          return res.json({
            success: true,
            source: "GOOGLE_GEMINI_AI",
            data: {
              ...decoded,
              decodedAt: new Date().toISOString(),
              isValid: true
            }
          });
        } catch (geminiError) {
          console.warn("Gemini VIN decode error, falling back:", geminiError);
        }
      }

      // Fallback: Query NHTSA vPIC API
      try {
        const nhtsaResp = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${cleanVin}?format=json`
        );
        if (nhtsaResp.ok) {
          const data = await nhtsaResp.json();
          const r = data?.Results?.[0];
          if (r && r.Make) {
            return res.json({
              success: true,
              source: "NHTSA_API",
              data: {
                vin: cleanVin,
                make: r.Make || "Mercedes-Benz",
                model: r.Model ? `Mercedes-Benz ${r.Model}` : "Mercedes-Benz Vehicle",
                modelYear: parseInt(r.ModelYear, 10) || 2022,
                chassis: r.Series || "W223",
                engineModel: r.EngineModel || "Mercedes Turbo Engine",
                displacementL: r.DisplacementL ? `${r.DisplacementL}L` : "3.0L",
                cylinders: r.EngineCylinders ? `${r.EngineCylinders} Cylinders` : "6 Cylinders",
                fuelType: r.FuelTypePrimary || "Gasoline",
                bodyClass: r.BodyClass || "Sedan",
                driveType: r.DriveType || "4MATIC AWD",
                plantCountry: r.PlantCountry || "Germany",
                series: r.Series || "Mercedes-Benz",
                decodedAt: new Date().toISOString(),
                isValid: true
              }
            });
          }
        }
      } catch (nhtsaError) {
        console.warn("NHTSA API error:", nhtsaError);
      }

      return res.status(500).json({ error: "فشل التحليل عبر خوادم Google و NHTSA" });
    } catch (err: any) {
      console.error("VIN decode error:", err);
      res.status(500).json({ error: err?.message || "خطأ أثناء فك الشاسيه" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AH.Libya ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
