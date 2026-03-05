// --- Links (HATEOAS) ---

export interface HateoasLink {
  rel: string;
  href: string;
  title?: string;
}

// --- Search ---

/** Address as returned in search results (nested under adres) */
export interface BinnenlandsAdres {
  type?: string;
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  postbusnummer?: number;
  postcode?: string;
  plaats?: string;
}

export interface BuitenlandsAdres {
  type?: string;
  straatHuisnummer?: string;
  postcodeWoonplaats?: string;
  land?: string;
}

export interface SearchResultAdres {
  binnenlandsAdres?: BinnenlandsAdres;
  buitenlandsAdres?: BuitenlandsAdres;
}

export interface SearchResult {
  kvkNummer: string;
  rsin?: string;
  vestigingsnummer?: string;
  naam: string;
  adres?: SearchResultAdres;
  type?: string;
  actief?: string;
  vervallenNaam?: string;
  links?: HateoasLink[];
}

export interface SearchResponse {
  pagina: number;
  resultatenPerPagina: number;
  totaal: number;
  vorige?: string;
  volgende?: string;
  resultaten: SearchResult[];
}

// --- SBI Activiteiten ---

export interface SbiActiviteit {
  sbiCode: string;
  sbiOmschrijving: string;
  indHoofdactiviteit: string;
}

// --- Handelsnaam ---

export interface Handelsnaam {
  naam: string;
  volgorde: number;
}

// --- Adres ---

export interface Adres {
  type?: string;
  indAfgeschermd?: string;
  volledigAdres?: string;
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huisnummerToevoeging?: string;
  toevoegingAdres?: string;
  postcode?: string;
  postbusnummer?: number;
  plaats?: string;
  straatHuisnummer?: string;
  postcodeWoonplaats?: string;
  regio?: string;
  land?: string;
  geoData?: GeoData;
}

export interface GeoData {
  addresseerbaarObjectId?: string;
  nummerAanduidingId?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  rijksdriehoekX?: number;
  rijksdriehoekY?: number;
  rijksdriehoekZ?: number;
}

// --- Basisprofiel ---

export interface Basisprofiel {
  kvkNummer: string;
  indNonMailing?: string;
  naam: string;
  formeleRegistratiedatum?: string;
  materieleRegistratie?: MaterieleRegistratie;
  totaalWerkzamePersonen?: number;
  statutaireNaam?: string;
  handelsnamen?: Handelsnaam[];
  sbiActiviteiten?: SbiActiviteit[];
  links?: HateoasLink[];
  _embedded?: BasisprofielEmbedded;
}

export interface MaterieleRegistratie {
  datumAanvang?: string;
  datumEinde?: string;
}

export interface BasisprofielEmbedded {
  hoofdvestiging?: Vestigingsprofiel;
  eigenaar?: Eigenaar;
}

export interface Eigenaar {
  rsin?: string;
  rechtsvorm?: string;
  uitgebreideRechtsvorm?: string;
  adressen?: Adres[];
  websites?: string[];
  links?: HateoasLink[];
}

// --- Vestigingsprofiel ---

export interface Vestigingsprofiel {
  vestigingsnummer: string;
  kvkNummer: string;
  rsin?: string;
  indNonMailing?: string;
  formeleRegistratiedatum?: string;
  materieleRegistratie?: MaterieleRegistratie;
  eersteHandelsnaam?: string;
  indHoofdvestiging?: string;
  indCommercieleVestiging?: string;
  voltijdWerkzamePersonen?: number;
  totaalWerkzamePersonen?: number;
  deeltijdWerkzamePersonen?: number;
  statutaireNaam?: string;
  handelsnamen?: Handelsnaam[];
  adressen?: Adres[];
  websites?: string[];
  sbiActiviteiten?: SbiActiviteit[];
  links?: HateoasLink[];
}

// --- Naamgeving ---

export interface NaamgevingVestigingCommercieel {
  vestigingsnummer: string;
  eersteHandelsnaam?: string;
  handelsnamen?: Handelsnaam[];
  links?: HateoasLink[];
}

export interface NaamgevingVestigingNietCommercieel {
  vestigingsnummer: string;
  naam?: string;
  ookGenoemd?: string;
  links?: HateoasLink[];
}

export type NaamgevingVestiging = NaamgevingVestigingCommercieel | NaamgevingVestigingNietCommercieel;

export interface Naamgeving {
  kvkNummer: string;
  rsin?: string;
  statutaireNaam?: string;
  naam?: string;
  ookGenoemd?: string;
  startdatum?: string;
  einddatum?: string;
  vestigingen?: NaamgevingVestiging[];
  links?: HateoasLink[];
}

// --- Vestiging List ---

export interface VestigingBasisInfo {
  vestigingsnummer: string;
  kvkNummer: string;
  eersteHandelsnaam?: string;
  indHoofdvestiging?: string;
  indCommercieleVestiging?: string;
  links?: HateoasLink[];
}

export interface VestigingList {
  kvkNummer: string;
  aantalCommercieleVestigingen: number;
  aantalNietCommercieleVestigingen: number;
  totaalAantalVestigingen: number;
  vestigingen: VestigingBasisInfo[];
  links?: HateoasLink[];
}

// --- Mutatieservice ---

export interface Abonnement {
  abonnementId: string;
  naam?: string;
  beschrijving?: string;
  links?: HateoasLink[];
}

export interface AbonnementenResponse {
  abonnementen: Abonnement[];
  links?: HateoasLink[];
}

export interface Signaal {
  signaalId: string;
  abonnementId: string;
  kvkNummer?: string;
  vestigingsnummer?: string;
  type?: string;
  registratietijdstip?: string;
  signaalTijdstip?: string;
  omschrijving?: string;
  details?: Record<string, unknown>;
  links?: HateoasLink[];
}

export interface PagedSignalen {
  pagina: number;
  aantal: number;
  totaal: number;
  signalen: Signaal[];
  links?: HateoasLink[];
}

export interface MutatieSearchParams {
  abonnementId: string;
  vanaf?: string;
  tot?: string;
  pagina?: number;
  aantal?: number;
}

// --- Search Parameters ---

export interface SearchParams {
  naam?: string;
  kvkNummer?: string;
  rsin?: string;
  vestigingsnummer?: string;
  straatnaam?: string;
  plaats?: string;
  postcode?: string;
  huisnummer?: number;
  huisletter?: string;
  postbusnummer?: number;
  type?: string[];
  inclusiefInactieveRegistraties?: boolean;
  pagina?: number;
  resultatenPerPagina?: number;
}
