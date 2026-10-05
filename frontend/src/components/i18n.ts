/** Interface labels in the conversation language, and the formatting that depends on it. */

import type { AgentActivity } from "@/lib/voice-agent";
import type { BeautyProfile, Language } from "@/lib/events";

const LABELS = {
  en: {
    advisor: "Beauty advisor",
    begin: "Begin",
    welcomeTitle: "Your beauty advisor,",
    welcomeTitleItalic: "by voice.",
    welcomeBody: "Tell us about your skin. We listen, ask the right questions and suggest what suits you.",
    welcomeNote: "Click to begin. Your voice is not recorded.",
    repliedIn: "Replied in",
    you: "You",
    joins: "joins",
    handsFree: "Hands-free",
    holdToTalk: "Hold to talk",
    holdHint: "or hold the space bar",
    justSpeak: "Listening, just speak",
    talkNow: "Release when you are done",
    waiting: "One moment",
    activity: {
      idle: "Ready",
      listening: "Listening",
      thinking: "Thinking",
      speaking: "Speaking",
    } satisfies Record<AgentActivity, string>,
    selectedForYou: "Selected for you",
    topPick: "Top pick",
    alsoConsider: "Also consider",
    completeRoutine: "Complete your routine",
    yourSelection: "Your selection",
    total: "Total",
    emptyDiscovery: "Products appear here as you talk.",
    earlier: "Earlier suggestions",
    profile: "Your beauty profile",
    profileEmpty: "Builds as you speak",
    savedWithConsent: "Saved with your consent",
    notSaved: "Not saved",
    fragranceFree: "Fragrance-free",
    end: "End",
    // Frost skin
    avgReply: "Avg reply",
    p90: "p90",
    cost: "Cost",
    restart: "Restart",
    camera: "Camera",
    cameraPreview: "Camera preview",
    cameraCaption: "Camera: the expert will look at your skin",
    joined: "joined",
    connecting: "Connecting",
    basketEmpty: "Products you choose appear here.",
    customerRecord: "Customer record",
    recordSubtitle: "What L'Oréal would store",
    of: "of",
    rowFirstName: "First name",
    rowLanguage: "Language",
    rowSkinType: "Skin type",
    rowConcerns: "Concerns",
    rowSensitivity: "Sensitivity",
    rowTexture: "Texture",
    rowBudget: "Budget",
    rowRoutine: "Routine size",
    rowHair: "Hair",
    languageName: { en: "English", fr: "French" } satisfies Record<Language, string>,
    notCaptured: "Not captured yet",
    notReactive: "Not reactive",
    consentPending: "Consent asked before saving",
    tryAgain: "Try again",
    microphoneMode: "Microphone mode",
    errorGeneric: "Something went wrong. Please try again.",
    errorMic: "The microphone is not available.",
  },
  fr: {
    advisor: "Conseil beauté",
    begin: "Commencer",
    welcomeTitle: "Votre conseillère beauté,",
    welcomeTitleItalic: "à la voix.",
    welcomeBody: "Parlez-nous de votre peau. Nous écoutons, posons les bonnes questions et proposons ce qui vous convient.",
    welcomeNote: "Cliquez pour commencer. Votre voix n'est pas enregistrée.",
    repliedIn: "Réponse en",
    you: "Vous",
    joins: "vous rejoint",
    handsFree: "Mains libres",
    holdToTalk: "Maintenir pour parler",
    holdHint: "ou maintenez la barre d'espace",
    justSpeak: "À l'écoute, parlez librement",
    talkNow: "Relâchez quand vous avez fini",
    waiting: "Un instant",
    activity: {
      idle: "Prête",
      listening: "À l'écoute",
      thinking: "Réflexion",
      speaking: "Parle",
    } satisfies Record<AgentActivity, string>,
    selectedForYou: "Sélectionné pour vous",
    topPick: "Notre choix",
    alsoConsider: "À considérer aussi",
    completeRoutine: "Complétez votre routine",
    yourSelection: "Votre sélection",
    total: "Total",
    emptyDiscovery: "Les produits apparaissent ici au fil de la conversation.",
    earlier: "Suggestions précédentes",
    profile: "Votre profil beauté",
    profileEmpty: "Se construit pendant que vous parlez",
    savedWithConsent: "Enregistré avec votre accord",
    notSaved: "Non enregistré",
    fragranceFree: "Sans parfum",
    end: "Terminer",
    // Frost skin
    avgReply: "Réponse moy.",
    p90: "p90",
    cost: "Coût",
    restart: "Recommencer",
    camera: "Caméra",
    cameraPreview: "Aperçu caméra",
    cameraCaption: "Caméra : l'experte va observer votre peau",
    joined: "a rejoint la conversation",
    connecting: "Connexion",
    basketEmpty: "Les produits choisis apparaissent ici.",
    customerRecord: "Fiche client",
    recordSubtitle: "Ce que L'Oréal conserverait",
    of: "sur",
    rowFirstName: "Prénom",
    rowLanguage: "Langue",
    rowSkinType: "Type de peau",
    rowConcerns: "Préoccupations",
    rowSensitivity: "Sensibilité",
    rowTexture: "Texture",
    rowBudget: "Budget",
    rowRoutine: "Routine",
    rowHair: "Cheveux",
    languageName: { en: "Anglais", fr: "Français" } satisfies Record<Language, string>,
    notCaptured: "Pas encore renseigné",
    notReactive: "Non réactive",
    consentPending: "Consentement demandé avant l'enregistrement",
    tryAgain: "Réessayer",
    microphoneMode: "Mode du micro",
    errorGeneric: "Un problème est survenu. Veuillez réessayer.",
    errorMic: "Le micro n'est pas disponible.",
  },
} as const;

export type Labels = (typeof LABELS)[Language];

export function labels(language: Language): Labels {
  return LABELS[language];
}

export function formatPrice(eur: number, language: Language): string {
  return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(eur);
}

export function formatSeconds(ms: number, language: Language): string {
  const seconds = new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ms / 1000);
  return `${seconds} s`;
}

/** The running cost of a conversation, to the tenth of a cent ("€0.031", "0,031 €"). */
export function formatCost(eur: number, language: Language): string {
  return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(eur);
}

const ROUTINE_STEPS: Record<Language, Record<string, string>> = {
  en: { cleanse: "Cleanse", treat: "Treat", moisturise: "Moisturise", protect: "Protect", hair: "Hair" },
  fr: { cleanse: "Nettoyer", treat: "Traiter", moisturise: "Hydrater", protect: "Protéger", hair: "Cheveux" },
};

export function routineStep(step: string, language: Language): string {
  return ROUTINE_STEPS[language][step] ?? step;
}

const PROFILE_WORDS: Record<Language, Record<string, string>> = {
  en: {
    dry: "Dry skin",
    normal: "Normal skin",
    combination: "Combination skin",
    oily: "Oily skin",
    hydration: "Hydration",
    sensitivity: "Sensitivity",
    first_signs_of_ageing: "First signs of ageing",
    firmness_wrinkles: "Firmness",
    radiance: "Radiance",
    blemish_prone: "Blemish-prone",
    dry_hair: "Dry hair",
    frizz: "Frizz",
    damaged_hair: "Damaged hair",
    sensitive: "Reactive skin",
    rich: "Rich textures",
    light: "Light textures",
    under_20: "Under €20",
    "20_to_40": "€20 to €40",
    "40_to_80": "€40 to €80",
    over_80: "Over €80",
    minimal: "Short routine",
    standard: "Standard routine",
    full: "Full routine",
    straight: "Straight hair",
    wavy: "Wavy hair",
    curly: "Curly hair",
    coily: "Coily hair",
  },
  fr: {
    dry: "Peau sèche",
    normal: "Peau normale",
    combination: "Peau mixte",
    oily: "Peau grasse",
    hydration: "Hydratation",
    sensitivity: "Sensibilité",
    first_signs_of_ageing: "Premiers signes de l'âge",
    firmness_wrinkles: "Fermeté",
    radiance: "Éclat",
    blemish_prone: "Imperfections",
    dry_hair: "Cheveux secs",
    frizz: "Frisottis",
    damaged_hair: "Cheveux abîmés",
    sensitive: "Peau réactive",
    rich: "Textures riches",
    light: "Textures légères",
    under_20: "Moins de 20 €",
    "20_to_40": "20 à 40 €",
    "40_to_80": "40 à 80 €",
    over_80: "Plus de 80 €",
    minimal: "Routine courte",
    standard: "Routine classique",
    full: "Routine complète",
    straight: "Cheveux raides",
    wavy: "Cheveux ondulés",
    curly: "Cheveux bouclés",
    coily: "Cheveux crépus",
  },
};

/** One profile value (skin type, concern, budget band...) in words, or null when unset. */
export function profileWord(key: string | null | undefined, language: Language): string | null {
  return key ? (PROFILE_WORDS[language][key] ?? key) : null;
}

/** The profile as human chips, in the order a beauty adviser would read them. */
export function profileChips(profile: BeautyProfile, language: Language): string[] {
  const words = PROFILE_WORDS[language];
  const say = (key: string | null | undefined): string | null => (key ? (words[key] ?? key) : null);
  const chips: (string | null)[] = [
    profile.first_name,
    say(profile.skin_type),
    ...profile.concerns.map(say),
    profile.sensitive ? say("sensitive") : null,
    say(profile.texture_preference),
    say(profile.budget_band),
    say(profile.routine_size),
    profile.fragrance_free ? LABELS[language].fragranceFree : null,
    say(profile.hair_type),
    ...profile.hair_concerns.map(say),
  ];
  return chips.filter((chip, index): chip is string => !!chip && chips.indexOf(chip) === index);
}
