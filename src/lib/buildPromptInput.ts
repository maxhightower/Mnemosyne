import { prisma } from "./db";
import {
  toCampaignState,
  toCharacterState,
  toLocationState,
  toSceneState,
  toEventState,
  toCorrectionState,
} from "./mappers";
import type { PromptGenInput } from "./types";

/**
 * Assemble the full PromptGenInput for a campaign's active (or specified)
 * scene by reading current state from the database.
 *
 * Characters included = those marked present on the scene; if the scene lists
 * none, fall back to all active characters in the campaign.
 */
export async function buildPromptInput(
  campaignId: string,
  sceneId?: string
): Promise<PromptGenInput | null> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return null;

  const scene = sceneId
    ? await prisma.scene.findFirst({ where: { id: sceneId, campaignId } })
    : await prisma.scene.findFirst({
        where: { campaignId, isActive: true },
        orderBy: { updatedAt: "desc" },
      });

  const sceneState = scene ? toSceneState(scene) : null;

  const location = scene?.locationId
    ? await prisma.location.findUnique({ where: { id: scene.locationId } })
    : null;

  const allChars = await prisma.character.findMany({
    where: { campaignId },
    orderBy: { name: "asc" },
  });

  const presentIds = new Set(sceneState?.presentCharacterIds ?? []);
  const characters = (
    presentIds.size > 0
      ? allChars.filter((c) => presentIds.has(c.id))
      : allChars.filter((c) => c.active)
  ).map(toCharacterState);

  const events = (
    await prisma.sessionEvent.findMany({
      where: {
        campaignId,
        ...(scene ? { OR: [{ sceneId: scene.id }, { sceneId: null }] } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: 25,
    })
  ).map(toEventState);

  const corrections = (
    await prisma.correction.findMany({
      where: { campaignId, active: true },
      orderBy: { createdAt: "desc" },
    })
  ).map(toCorrectionState);

  return {
    campaign: toCampaignState(campaign),
    scene: sceneState,
    location: location ? toLocationState(location) : null,
    characters,
    events,
    corrections,
  };
}
