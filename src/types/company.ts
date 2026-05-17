export interface Etablissement {
  siret: string;
  /** Trade / operational name (liste_enseignes, nom_commercial, etc.) */
  nomEtablissement: string;
  enseigne?: string;
  adresse: string;
  codePostal: string;
  commune: string;
  latitude: number;
  longitude: number;
  estSiege: boolean;
  statut: string;
  codeNaf: string;
  libelleNaf?: string;
  effectifSalarie: string;
  telephone: string;
  email: string;
  siteWeb: string;
  distance?: number;
}

export interface Company {
  siren: string;
  nomComplet: string;
  secteur: string;
  codeNaf: string;
  libelleNaf?: string;
  categorie: string;
  effectifSalarie: string;
  etablissements: Etablissement[];
  siegeSocial: {
    siret: string;
    adresse: string;
    codePostal: string;
    commune: string;
  };
}

export interface SearchPagination {
  totalCompanies: number;
  totalEstablishments: number;
  page: number;
  perPage: number;
  totalPages: number;
  establishmentsOnPage: number;
  isEstablishmentCountExact: boolean;
}
