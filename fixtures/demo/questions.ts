/**
 * Reference questions for the search evaluation, on the demo protocol
 * (fixtures/demo/protocole-imagerie.md). Shared by `npm run eval:search` and
 * `npm run test:search-quality`.
 *
 * - `expected: { section, phrase }`: the FIRST result must come from the demo document and
 *   contain `phrase` (a sentence fragment found only in that section).
 * - `expected: null`: off-topic question, search must return no passage at all, so the bot
 *   refuses without calling the LLM.
 */
export type ReferenceQuestion = {
  id: string;
  question: string;
  /** What makes it hard, in plain words (shown in the evaluation table). */
  difficulty: string;
  expected: { section: string; phrase: string } | null;
};

export const REFERENCE_QUESTIONS: ReferenceQuestion[] = [
  {
    id: "Q1",
    question: "Quel est le délai de compte rendu pour un examen urgent ?",
    difficulty: "mots présents dans le document",
    expected: { section: "Délais de compte rendu", phrase: "compte rendu dans l'heure" },
  },
  {
    id: "Q2",
    question: "Que faire si le patient a un pacemaker avant une IRM ?",
    difficulty: "synonyme : pacemaker = stimulateur cardiaque",
    expected: { section: "IRM et stimulateur cardiaque", phrase: "stimulateur cardiaque" },
  },
  {
    id: "Q3",
    question: "Conduite à tenir face à un IDM ?",
    difficulty: "abréviation : IDM = infarctus du myocarde",
    expected: { section: "Suspicion d'infarctus du myocarde", phrase: "infarctus du myocarde" },
  },
  {
    id: "Q4",
    question: "Faut-il vérifier les reins du patient ?",
    difficulty: "synonyme : reins = fonction rénale",
    expected: { section: "Produit de contraste iodé et fonction rénale", phrase: "fonction rénale" },
  },
  {
    id: "Q5",
    question: "Une femme enceinte peut-elle passer une radio ?",
    difficulty: "synonymes : enceinte = grossesse, radio = examen irradiant",
    expected: { section: "Grossesse et examens irradiants", phrase: "éventuelle grossesse" },
  },
  {
    id: "Q6",
    question: "Quels sont les horaires de la cafétéria ?",
    difficulty: "hors sujet",
    expected: null,
  },
  {
    id: "Q7",
    question: "Mon patient a peur d'être enfermé dans la machine, que faire ?",
    difficulty: "paraphrase : peur d'être enfermé = claustrophobie",
    expected: { section: "Claustrophobie en IRM", phrase: "claustrophobie sévère" },
  },
  {
    id: "Q8",
    question: "Comment être certain d'examiner la bonne personne ?",
    difficulty: "paraphrase : bonne personne = identité du patient",
    expected: { section: "Identitovigilance", phrase: "bracelet d'identification" },
  },
  {
    id: "Q9",
    question: "Comment protéger les soignants contre les rayons X ?",
    difficulty: "synonymes : rayons X = rayonnements ionisants, soignants = équipe",
    expected: { section: "Radioprotection de l'équipe", phrase: "dosimètre nominatif" },
  },
  {
    id: "Q10",
    question: "Quel est le mot de passe du wifi pour les visiteurs ?",
    difficulty: "hors sujet",
    expected: null,
  },
  // Off-topic but close to the hospital domain: the hardest case for a similarity threshold.
  {
    id: "Q11",
    question: "Où peut-on se garer sur le parking de l'hôpital ?",
    difficulty: "hors sujet, domaine hospitalier",
    expected: null,
  },
  {
    id: "Q12",
    question: "Quel est le tarif d'une consultation ?",
    difficulty: "hors sujet, domaine hospitalier",
    expected: null,
  },
  {
    id: "Q13",
    question: "Quels sont les horaires des visites pour les proches ?",
    difficulty: "hors sujet, domaine hospitalier",
    expected: null,
  },
  {
    id: "Q14",
    question: "Comment prendre un rendez-vous ?",
    difficulty: "hors sujet, domaine hospitalier",
    expected: null,
  },
  {
    id: "Q15",
    question: "Peut-on payer par carte bancaire ?",
    difficulty: "hors sujet, domaine hospitalier",
    expected: null,
  },
  {
    id: "Q16",
    question: "La cantine propose-t-elle des repas sans gluten ?",
    difficulty: "hors sujet, domaine hospitalier",
    expected: null,
  },
  {
    id: "Q17",
    question: "Où se trouve la chambre de mon père ?",
    difficulty: "hors sujet, domaine hospitalier",
    expected: null,
  },
];
