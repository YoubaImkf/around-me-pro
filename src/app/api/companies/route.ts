import { NextRequest, NextResponse } from "next/server";
import {
  collectEstablishments,
  geocodeCity,
  type SearchParams
} from "@/lib/companySearch";

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const radiusStr = searchParams.get("radius") || "5";
  const sections = searchParams.get("sections") || "";
  const naf = searchParams.get("naf")?.trim() || "";
  const pageStr = searchParams.get("page") || "1";
  const perPageStr = searchParams.get("per_page") || "25";
  const onlyActiveStr = searchParams.get("only_active") || "true";
  const onlyActive = onlyActiveStr === "true";

  const radius = parseFloat(radiusStr);
  const page = parseInt(pageStr, 10);
  let perPage = parseInt(perPageStr, 10);

  if (perPageStr === "all") {
    perPage = 10000;
  } else if (!ALLOWED_PAGE_SIZES.includes(perPage)) {
    perPage = 25;
  }

  if (isNaN(radius) || radius <= 0 || radius > 50) {
    return NextResponse.json(
      { error: "Le rayon doit être un nombre compris entre 0.1 et 50 km." },
      { status: 400 }
    );
  }

  if (isNaN(page) || page <= 0) {
    return NextResponse.json(
      { error: "Le numéro de page doit être un entier positif." },
      { status: 400 }
    );
  }

  let lat = parseFloat(searchParams.get("lat") || "");
  let lon = parseFloat(searchParams.get("long") || searchParams.get("lon") || "");
  let resolvedCityName = city || "";
  let resolvedPostcode = "";

  if (city && (isNaN(lat) || isNaN(lon))) {
    try {
      const geocoded = await geocodeCity(city);
      lat = geocoded.lat;
      lon = geocoded.lon;
      resolvedCityName = geocoded.name;
      resolvedPostcode = geocoded.postcode;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message === "CITY_NOT_FOUND") {
        return NextResponse.json(
          {
            error: `La ville '${city}' n'a pas pu être géolocalisée. Veuillez vérifier l'orthographe.`
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error:
            "Impossible de joindre le service de géolocalisation de l'Etat français. Veuillez réessayer."
        },
        { status: 502 }
      );
    }
  }

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      {
        error:
          "La ville ou les coordonnées géographiques sont obligatoires pour effectuer la recherche."
      },
      { status: 400 }
    );
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
    const fetchAll = perPage >= 10000;
    const result = await collectEstablishments(searchParams_, {
      establishmentPage: fetchAll ? 1 : page,
      perPage: fetchAll ? Number.MAX_SAFE_INTEGER : perPage,
      fetchAll
    });

    const totalPages = fetchAll
      ? 1
      : Math.max(1, Math.ceil(result.totalEstablishments / perPage));

    const safePage = fetchAll ? 1 : Math.min(page, totalPages);

    return NextResponse.json({
      city: {
        name: resolvedCityName,
        postcode: resolvedPostcode,
        latitude: lat,
        longitude: lon,
        radius
      },
      companies: result.companies,
      establishments: result.establishments,
      pagination: {
        totalCompanies: result.totalCompanies,
        totalEstablishments: result.totalEstablishments,
        page: safePage,
        perPage: fetchAll ? result.establishments.length : perPage,
        totalPages,
        establishmentsOnPage: result.establishments.length,
        isEstablishmentCountExact: result.isEstablishmentCountExact
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("DINUM_ERROR_400")) {
      return NextResponse.json(
        {
          error:
            "Les coordonnées ou filtres transmis sont incorrects pour la recherche géographique."
        },
        { status: 400 }
      );
    }
    console.error("Company search proxy error:", err);
    return NextResponse.json(
      {
        error:
          "Le service public de recherche d'entreprises ne répond pas actuellement. Veuillez réessayer d'ici quelques instants."
      },
      { status: 502 }
    );
  }
}
