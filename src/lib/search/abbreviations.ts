/**
 * Medical abbreviations dictionary (query expansion), versioned with the code.
 *
 * Small embedding models and full-text search do not know that « IDM » means « infarctus du
 * myocarde ». Before searching, each known abbreviation of the question gets its long form
 * added next to it (the abbreviation is kept, so documents using it still match).
 *
 * Abbreviations are matched as whole words, in CAPITALS only: « IRA » (insuffisance rénale
 * aiguë) must not alter the verb « ira ». General medical / imaging vocabulary only — no entry
 * exists for a particular test question.
 */
export const MEDICAL_ABBREVIATIONS: Readonly<Record<string, string>> = {
  AINS: "anti-inflammatoire non stéroïdien",
  AIT: "accident ischémique transitoire",
  ATCD: "antécédents",
  AVC: "accident vasculaire cérébral",
  BPCO: "bronchopneumopathie chronique obstructive",
  CRP: "protéine C réactive",
  DFG: "débit de filtration glomérulaire",
  ECG: "électrocardiogramme",
  EEG: "électroencéphalogramme",
  HTA: "hypertension artérielle",
  IDM: "infarctus du myocarde",
  IMC: "indice de masse corporelle",
  INR: "rapport normalisé international",
  IRA: "insuffisance rénale aiguë",
  IRC: "insuffisance rénale chronique",
  IRM: "imagerie par résonance magnétique",
  OAP: "œdème aigu du poumon",
  PDC: "produit de contraste",
  SCA: "syndrome coronarien aigu",
  TDM: "tomodensitométrie, scanner",
  TEP: "tomographie par émission de positons",
  TVP: "thrombose veineuse profonde",
  USI: "unité de soins intensifs",
  VIH: "virus de l'immunodéficience humaine",
};

/** Whole words in capitals (letters and digits), e.g. « IDM », « DT2 ». */
const TOKEN = /(?<![\p{L}\p{N}])\p{Lu}[\p{Lu}\p{N}]+(?![\p{L}\p{N}])/gu;

/**
 * Adds the long form after each known abbreviation: « Conduite à tenir face à un IDM ? »
 * → « Conduite à tenir face à un IDM (infarctus du myocarde) ? ». Each abbreviation is
 * expanded once; unknown words and lower-case text are left untouched.
 */
export function expandAbbreviations(
  question: string,
  dictionary: Readonly<Record<string, string>> = MEDICAL_ABBREVIATIONS,
): string {
  const seen = new Set<string>();
  return question.replace(TOKEN, (token) => {
    const long = Object.hasOwn(dictionary, token) ? dictionary[token] : undefined;
    if (!long || seen.has(token)) return token;
    seen.add(token);
    return `${token} (${long})`;
  });
}
