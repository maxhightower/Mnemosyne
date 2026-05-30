import type {
  Campaign,
  Character,
  Location,
  Scene,
  SessionEvent,
  Correction,
} from "@prisma/client";
import { parseList, parseObject } from "./json";
import type {
  CampaignState,
  CharacterState,
  LocationState,
  SceneState,
  EventState,
  CorrectionState,
} from "./types";

export function toCampaignState(c: Campaign): CampaignState {
  return {
    id: c.id,
    name: c.name,
    genre: c.genre,
    tone: c.tone,
    visualStyle: c.visualStyle,
    contentRating: c.contentRating,
    styleReferences: c.styleReferences,
  };
}

export function toCharacterState(c: Character): CharacterState {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    species: c.species,
    classRole: c.classRole,
    physicalAppearance: c.physicalAppearance,
    clothingArmor: c.clothingArmor,
    signatureItems: parseList(c.signatureItems),
    personalityVisualCues: c.personalityVisualCues,
    currentCondition: c.currentCondition,
    secrets: c.secrets,
    publicDescription: c.publicDescription,
    privateNotes: c.privateNotes,
    active: c.active,
  };
}

export function toLocationState(l: Location): LocationState {
  return {
    id: l.id,
    name: l.name,
    type: l.type,
    description: l.description,
    mood: l.mood,
    landmarks: l.landmarks,
    lighting: l.lighting,
    weather: l.weather,
    hiddenFeatures: l.hiddenFeatures,
    publicDescription: l.publicDescription,
    privateNotes: l.privateNotes,
  };
}

export function toSceneState(s: Scene): SceneState {
  return {
    id: s.id,
    title: s.title,
    locationId: s.locationId,
    presentCharacterIds: parseList(s.presentCharacterIds),
    importantObjects: s.importantObjects,
    mood: s.mood,
    lighting: s.lighting,
    cameraPreference: s.cameraPreference,
    visibleAction: s.visibleAction,
    hiddenInformation: s.hiddenInformation,
    revealHidden: s.revealHidden,
    notes: s.notes,
  };
}

export function toEventState(e: SessionEvent): EventState {
  return {
    id: e.id,
    speaker: e.speaker,
    eventType: e.eventType,
    rawText: e.rawText,
    structuredSummary: e.structuredSummary,
    charactersInvolved: parseList(e.charactersInvolved),
    locationInvolved: e.locationInvolved,
    mechanicalResult: parseObject(e.mechanicalResult),
    visualImportance: e.visualImportance,
    spoilerSafe: e.spoilerSafe,
    dmApproved: e.dmApproved,
  };
}

export function toCorrectionState(c: Correction): CorrectionState {
  return {
    id: c.id,
    correctionType: c.correctionType,
    target: c.target,
    correction: c.correction,
    priority: c.priority,
    active: c.active,
  };
}
