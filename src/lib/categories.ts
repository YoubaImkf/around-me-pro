export interface CompanyCategory {
  id: string;
  label: string;
  section: string; // NAF Section letter
  description: string;
  nafCodes?: string[]; // Specific APE/NAF codes if we want to filter more deeply
  suggestedJobTitles: string[]; // For future semantic search mapping
  color: string; // Accent color hex or CSS color for pins and UI styling
}

export const COMPANY_CATEGORIES: CompanyCategory[] = [
  {
    id: "tech",
    label: "Information & Communication",
    section: "J",
    description: "Édition de logiciels, programmation, conseil informatique, télécommunications et médias.",
    suggestedJobTitles: [
      "Backend Developer",
      "Frontend Developer",
      "Fullstack Developer",
      "UX Designer",
      "UI Designer",
      "Product Manager",
      "Data Scientist",
      "DevOps Engineer",
      "Développeur",
      "Web Designer",
      "Chef de projet informatique"
    ],
    color: "#2563eb" // Blue
  },
  {
    id: "engineering",
    label: "Ingénierie & Conseil Technique",
    section: "M",
    description: "R&D, activités d'architecture, ingénierie, contrôles et analyses techniques, conseil de gestion.",
    suggestedJobTitles: [
      "UX Designer",
      "UI Designer",
      "Consultant",
      "Ingénieur mécanique",
      "Ingénieur civil",
      "Architecte",
      "Ingénieur R&D",
      "Dessinateur industriel"
    ],
    color: "#0d9488" // Teal
  },
  {
    id: "health_social",
    label: "Santé & Action Sociale",
    section: "Q",
    description: "Activités hospitalières, médicales, aide sociale, crèches et hébergement pour personnes âgées.",
    suggestedJobTitles: [
      "Childcare Assistant",
      "Auxiliaire de puériculture",
      "Infirmier",
      "Médecin",
      "Aide-soignant",
      "Kinésithérapeute",
      "Éducateur spécialisé",
      "Assistant social"
    ],
    color: "#db2777" // Pink
  },
  {
    id: "education",
    label: "Enseignement & Formation",
    section: "P",
    description: "Écoles, universités, centres de formation professionnelle, enseignement de la conduite et artistique.",
    suggestedJobTitles: [
      "Enseignant",
      "Professeur",
      "Formateur",
      "Tuteur",
      "Éducateur",
      "Conseiller d'orientation"
    ],
    color: "#8b5cf6" // Purple
  },
  {
    id: "construction",
    label: "Construction & Bâtiment",
    section: "F",
    description: "Travaux de construction de bâtiments, génie civil, électricité, plomberie et travaux de finition.",
    suggestedJobTitles: [
      "Maçon",
      "Électricien",
      "Plombier",
      "Chef de chantier",
      "Conducteur de travaux",
      "Peintre en bâtiment",
      "Charpentier"
    ],
    color: "#ea580c" // Orange
  },
  {
    id: "hospitality",
    label: "Hébergement & Restauration",
    section: "I",
    description: "Hôtels, campings, restaurants traditionnels, restauration rapide, débits de boissons et traiteurs.",
    suggestedJobTitles: [
      "Serveur",
      "Cuisinier",
      "Chef de cuisine",
      "Barman",
      "Directeur d'hôtel",
      "Réceptionniste",
      "Traiteur"
    ],
    color: "#eab308" // Yellow
  },
  {
    id: "finance_insurance",
    label: "Finance & Assurances",
    section: "K",
    description: "Activités des services financiers, banques, courtage, assurances et gestion de fonds.",
    suggestedJobTitles: [
      "Banquier",
      "Conseiller financier",
      "Analyste financier",
      "Courtier",
      "Agent d'assurances",
      "Comptable"
    ],
    color: "#16a34a" // Green
  },
  {
    id: "industry",
    label: "Industrie & Manufacture",
    section: "C",
    description: "Fabrication de produits alimentaires, textiles, électroniques, machines, et équipements.",
    suggestedJobTitles: [
      "Ingénieur de production",
      "Technicien de maintenance",
      "Opérateur de ligne",
      "Chef d'atelier",
      "Ajusteur-monteur"
    ],
    color: "#4b5563" // Slate
  },
  {
    id: "retail",
    label: "Commerce & Vente",
    section: "G",
    description: "Commerce de gros, commerce de détail, supermarchés, vente de voitures et pièces détachées.",
    suggestedJobTitles: [
      "Vendeur",
      "Responsable de magasin",
      "Commercial",
      "Hôte de caisse",
      "Chef de rayon",
      "Assistant commercial"
    ],
    color: "#6366f1" // Indigo
  },
  {
    id: "arts_recreation",
    label: "Arts, Spectacles & Loisirs",
    section: "R",
    description: "Activités créatives, artistiques, spectacles, musées, parcs d'attractions, sport et loisirs.",
    suggestedJobTitles: [
      "Artiste",
      "Graphiste",
      "Organisateur d'événements",
      "Animateur",
      "Coach sportif",
      "Médiateur culturel"
    ],
    color: "#ec4899" // Rose
  }
];

export const getCategoryBySection = (section: string): CompanyCategory | undefined => {
  return COMPANY_CATEGORIES.find(c => c.section === section);
};

export const getCategoryById = (id: string): CompanyCategory | undefined => {
  return COMPANY_CATEGORIES.find(c => c.id === id);
};
