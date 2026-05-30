// Client-facing shapes for API JSON responses (dates serialize to strings).

export interface CampaignDTO {
  id: string;
  name: string;
  genre: string;
  tone: string;
  visualStyle: string;
  contentRating: string;
  styleReferences: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    characters: number;
    locations: number;
    scenes: number;
    events: number;
    prompts?: number;
    corrections?: number;
    visualReferences?: number;
  };
}

export interface CharacterDTO {
  id: string;
  campaignId: string;
  name: string;
  type: string;
  species: string;
  classRole: string;
  physicalAppearance: string;
  clothingArmor: string;
  signatureItems: string; // JSON string[]
  personalityVisualCues: string;
  currentCondition: string;
  secrets: string;
  publicDescription: string;
  privateNotes: string;
  canonicalImageRefs: string;
  active: boolean;
}

export interface LocationDTO {
  id: string;
  campaignId: string;
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
  canonicalImageRefs: string;
}

export interface SceneDTO {
  id: string;
  campaignId: string;
  locationId: string | null;
  title: string;
  presentCharacterIds: string; // JSON string[]
  importantObjects: string;
  mood: string;
  lighting: string;
  cameraPreference: string;
  visibleAction: string;
  referenceImages: string; // JSON string[]
  compositionNote: string;
  hiddenInformation: string;
  revealHidden: boolean;
  notes: string;
  isActive: boolean;
}

export interface EventDTO {
  id: string;
  campaignId: string;
  sceneId: string | null;
  timestamp: string;
  speaker: string;
  eventType: string;
  rawText: string;
  structuredSummary: string;
  charactersInvolved: string; // JSON string[]
  locationInvolved: string;
  mechanicalResult: string; // JSON object string
  visualImportance: number;
  spoilerSafe: boolean;
  dmApproved: boolean;
}

export interface PromptDTO {
  id: string;
  campaignId: string;
  sceneId: string | null;
  shortPrompt: string;
  expandedPrompt: string;
  negativePrompt: string;
  continuityNotes: string; // JSON string[]
  spoilerWarnings: string; // JSON string[]
  source: string;
  createdAt: string;
}

export interface ReferenceDTO {
  id: string;
  campaignId: string;
  sceneId: string | null;
  promptText: string;
  imageUrl: string;
  relatedCharacters: string;
  relatedLocation: string;
  approvedByDm: boolean;
  notes: string;
  createdAt: string;
}

export interface CorrectionDTO {
  id: string;
  campaignId: string;
  correctionType: string;
  target: string;
  correction: string;
  priority: string;
  active: boolean;
  createdAt: string;
}

export interface GenerateResult {
  shortPrompt: string;
  expandedPrompt: string;
  negativePrompt: string;
  continuityNotes: string[];
  spoilerWarnings: string[];
  source: string;
  aiAvailable: boolean;
  sceneId: string | null;
}

export interface StructuredEventResult {
  eventType: string;
  structuredSummary: string;
  charactersInvolved: string[];
  locationInvolved: string;
  mechanicalResult: Record<string, unknown> | null;
  visualImportance: number;
  possibleSpoilers: string[];
  suggestedSceneUpdate: string;
  source: string;
}

export const EVENT_TYPES = [
  "DM narration",
  "player action",
  "dice roll",
  "attack",
  "spell cast",
  "dialogue",
  "discovery",
  "travel",
  "scene change",
  "combat state change",
  "character condition update",
  "DM correction",
];

export const CHARACTER_TYPES = [
  "player character",
  "NPC",
  "monster",
  "villain",
  "companion",
];
