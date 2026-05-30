// Shared shapes used by the prompt generator and AI service. These mirror the
// Prisma models but use already-decoded list/object fields so the generator can
// stay pure and easy to test.

export interface CampaignState {
  id: string;
  name: string;
  genre: string;
  tone: string;
  visualStyle: string;
  contentRating: string;
  styleReferences: string;
}

export interface CharacterState {
  id: string;
  name: string;
  type: string;
  species: string;
  classRole: string;
  physicalAppearance: string;
  clothingArmor: string;
  signatureItems: string[];
  personalityVisualCues: string;
  currentCondition: string;
  secrets: string;
  publicDescription: string;
  privateNotes: string;
  canonicalImageRefs: string[];
  active: boolean;
}

export interface LocationState {
  id: string;
  name: string;
  type: string;
  description: string;
  mood: string;
  landmarks: string;
  lighting: string;
  weather: string;
  hiddenFeatures: string;
  publicDescription: string;
  privateNotes: string;
}

export interface SceneState {
  id: string;
  title: string;
  locationId: string | null;
  presentCharacterIds: string[];
  importantObjects: string;
  mood: string;
  lighting: string;
  cameraPreference: string;
  visibleAction: string;
  referenceImages: string[];
  compositionNote: string;
  hiddenInformation: string;
  revealHidden: boolean;
  notes: string;
}

export interface EventState {
  id: string;
  speaker: string;
  eventType: string;
  rawText: string;
  structuredSummary: string;
  charactersInvolved: string[];
  locationInvolved: string;
  mechanicalResult: Record<string, unknown> | null;
  visualImportance: number;
  spoilerSafe: boolean;
  dmApproved: boolean;
}

export interface CorrectionState {
  id: string;
  correctionType: string;
  target: string;
  correction: string;
  priority: string;
  active: boolean;
}

export interface PromptGenInput {
  campaign: CampaignState;
  scene: SceneState | null;
  location: LocationState | null;
  characters: CharacterState[]; // characters present in the scene
  events: EventState[]; // recent approved events
  corrections: CorrectionState[]; // active corrections
}

export interface PromptGenOutput {
  shortPrompt: string;
  expandedPrompt: string;
  negativePrompt: string;
  continuityNotes: string[];
  spoilerWarnings: string[];
  source: "deterministic" | "ai";
}
