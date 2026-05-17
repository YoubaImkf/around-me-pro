import { NextRequest, NextResponse } from "next/server";
import {
  collectEstablishments,
  geocodeCity,
  MAX_COMPANY_PAGES,
  type SearchParams
} from "@/lib/companySearch";
import { toExportRow } from "@/lib/establishments";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const radiusStr = searchParams.get("radius") || "5";
  const sections = searchParams.get("sections") || "";
  const naf = searchParams.get("naf")?.trim() || "";
  const onlyActive = (searchParams.get("only_active") || "true") === "true";

  const radius = parseFloat(radiusStr);
  if (isNaN(radius) || radius <= 0 || radius > 50) {
    return NextResponse.json({ error: "Rayon invalide." }, { status: 400 });
  }

  let lat = parseFloat(searchParams.get("lat") || "");
  let lon = parseFloat(searchParams.get("long") || searchParams.get("lon") || "");

  if (city && (isNaN(lat) || isNaN(lon))) {
    try {
      const geocoded = await geocodeCity(city);
      lat = geocoded.lat;
      lon = geocoded.lon;
    } catch {
      return NextResponse.json({ error: "Ville introuvable." }, { status: 404 });
    }
  }

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Coordonnées requises." }, { status: 400 });
  }

  const searchParams_: SearchParams = {
    lat,
    lon,
    radius,
    sections,
    naf,
    onlyActive
  };

  try {
    const result = await collectEstablishments(searchParams_, {
      establishmentPage: 1,
      perPage: Number.MAX_SAFE_INTEGER,
      fetchAll: true
    });

    const rows = result.establishments.map((row, index) => toExportRow(row, index));
    const truncated = !result.isEstablishmentCountExact;

    return NextResponse.json({
      rows,
      meta: {
        totalEstablishments: rows.length,
        totalCompanies: result.totalCompanies,
        truncated,
        maxPages: MAX_COMPANY_PAGES,
        exportedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Export impossible pour le moment. Réessayez plus tard." },
      { status: 502 }
    );
  }
}
