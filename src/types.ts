// --- Links (HATEOAS) ---

export interface HateoasLink {
  rel: string;
  href: string;
}

// --- Search ---

export interface SearchResult {
  kvkNummer: string;
  handelsnaam: string;
  straatnaam?: string;
  huisnummer?: number;
  huisnummerToevoeging?: string;
  postcode?: string;
  plaats?: string;
  type?: string;
  actief?: boolean;
  vestigingsnummer?: string;
  links?: HateoasLink[];
}

export interface SearchResponse {
  resultaten: SearchResult[];
  totaal: number;
  pagina: number;
  resultatenPerPagina: number;
}

// --- SBI Activiteiten ---

export interface SbiActiviteit {
  sbiCode: string;
  sbiOmschrijving: string;
  indHoofdactiviteit: boolean;
}

// --- Handelsnaam ---

export interface Handelsnaam {
  naam: string;
  volgorde: number;
}

// --- Adres ---

export interface Adres {
  type?: string;
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode?: string;
  plaats?: string;
  land?: string;
}

// --- Basisprofiel ---

export interface Basisprofiel {
  kvkNummer: string;
  indNonMailing?: boolean;
  naam: string;
  formeleRegistratiedatum?: string;
  materieleRegistratie?: Record<string, unknown>;
  totaalWerkzamePersonen?: number;
  statutaireNaam?: string;
  handelsnamen?: Handelsnaam[];
  sbiActiviteiten?: SbiActiviteit[];
  links?: HateoasLink[];
}

// --- Vestigingsprofiel ---

export interface Vestigingsprofiel {
  vestigingsnummer: string;
  kvkNummer: string;
  eersteHandelsnaam?: string;
  indHoofdvestiging?: boolean;
  indCommercieleVestiging?: boolean;
  totaalWerkzamePersonen?: number;
  adressen?: Adres[];
  websites?: string[];
  sbiActiviteiten?: SbiActiviteit[];
  handelsnamen?: Handelsnaam[];
  links?: HateoasLink[];
}

// --- Naamgeving ---

export interface Naamgeving {
  kvkNummer: string;
  naam?: string;
  statutaireNaam?: string;
  handelsnamen?: Handelsnaam[];
  links?: HateoasLink[];
}

// --- Search Parameters ---

export interface SearchParams {
  handelsnaam?: string;
  kvkNummer?: string;
  vestigingsnummer?: string;
  straatnaam?: string;
  plaats?: string;
  postcode?: string;
  type?: string;
  pagina?: number;
  resultatenPerPagina?: number;
}
