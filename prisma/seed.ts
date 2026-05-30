import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Idempotent-ish: wipe the demo campaign if it already exists so re-seeding
  // produces a clean, predictable demo.
  const existing = await prisma.campaign.findFirst({
    where: { name: "The Stolen Sun" },
  });
  if (existing) {
    await prisma.campaign.delete({ where: { id: existing.id } });
    console.log("Removed previous 'The Stolen Sun' campaign.");
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: "The Stolen Sun",
      genre: "dark medieval fantasy",
      tone: "mysterious, dangerous, mythic",
      visualStyle:
        "dark medieval oil painting, dramatic torchlight, painterly textures, grounded fantasy design, not anime, not photorealistic",
      contentRating: "PG-13 fantasy violence",
      styleReferences:
        "Frank Frazetta lighting, Zdzisław Beksiński atmosphere, grounded armor like a historical reenactment",
    },
  });

  // --- Characters ---------------------------------------------------------
  const thorne = await prisma.character.create({
    data: {
      campaignId: campaign.id,
      name: "Thorne",
      type: "player character",
      species: "human",
      classRole: "paladin",
      physicalAppearance: "broad-shouldered, weathered face, short dark hair",
      clothingArmor: "dented silver plate armor",
      signatureItems: JSON.stringify(["round shield with faded sun emblem", "silver longsword"]),
      publicDescription:
        "A broad-shouldered human paladin in dented silver armor, carrying a round shield with a faded sun emblem and a silver longsword.",
      currentCondition: "bloodied but standing",
      privateNotes:
        "His divine power is connected to a dying solar deity, but this should not be visually obvious yet.",
      secrets: "Channeling power from a dying sun god.",
    },
  });

  const mira = await prisma.character.create({
    data: {
      campaignId: campaign.id,
      name: "Mira",
      type: "player character",
      species: "elf",
      classRole: "wizard",
      physicalAppearance: "sharp-eyed, slender, silver hair tied back",
      clothingArmor: "layered blue-gray robes",
      signatureItems: JSON.stringify(["blackwood staff", "satchel of scrolls"]),
      publicDescription:
        "A sharp-eyed elven wizard in layered blue-gray robes, carrying a blackwood staff and a satchel of scrolls.",
      currentCondition: "focused and unharmed",
    },
  });

  const knight = await prisma.character.create({
    data: {
      campaignId: campaign.id,
      name: "Skeletal Knight",
      type: "monster",
      species: "undead",
      classRole: "knight",
      clothingArmor: "rusted armor, cracked helm",
      signatureItems: JSON.stringify(["corroded greatsword"]),
      publicDescription:
        "A tall undead knight in rusted armor, with a cracked helm and a corroded greatsword.",
      currentCondition: "damaged",
    },
  });

  // --- Location -----------------------------------------------------------
  const crypt = await prisma.location.create({
    data: {
      campaignId: campaign.id,
      name: "The Flooded Crypt",
      type: "dungeon chamber",
      description:
        "A half-flooded underground crypt with black stone walls, cracked sarcophagi, ankle-deep water, old bronze lanterns, and a broken altar.",
      publicDescription:
        "A half-flooded underground crypt with black stone walls, cracked sarcophagi, ankle-deep water, old bronze lanterns, and a broken altar.",
      lighting: "dim blue-gray crypt light with warm torch accents",
      mood: "cold, sacred, abandoned",
      landmarks: "broken altar, cracked sarcophagi, bronze lanterns",
      privateNotes:
        "A vampire spawn is hiding inside the eastern sarcophagus. Do not show it unless revealed.",
      hiddenFeatures: "Vampire spawn hidden in the eastern sarcophagus.",
    },
  });

  // --- Scene --------------------------------------------------------------
  const scene = await prisma.scene.create({
    data: {
      campaignId: campaign.id,
      locationId: crypt.id,
      title: "Battle at the Broken Altar",
      presentCharacterIds: JSON.stringify([thorne.id, mira.id, knight.id]),
      importantObjects: "broken altar, glowing longsword",
      mood: "cold, sacred, dangerous",
      lighting: "dim blue-gray crypt light with warm torch accents",
      cameraPreference: "cinematic wide shot",
      visibleAction:
        "Thorne drives his glowing silver longsword into the skeletal knight while Mira readies a spell near the broken altar.",
      compositionNote:
        "low dramatic angle, Thorne lunging left-to-right center-frame, the skeletal knight reeling back to the right, Mira framed on the left near the altar, strong diagonal action lines",
      hiddenInformation:
        "A vampire spawn watches from the eastern sarcophagus, not yet revealed.",
      revealHidden: false,
      isActive: true,
    },
  });

  // --- Events -------------------------------------------------------------
  await prisma.sessionEvent.create({
    data: {
      campaignId: campaign.id,
      sceneId: scene.id,
      speaker: "DM",
      eventType: "scene change",
      rawText: "The party enters a half-flooded crypt beneath the ruined chapel.",
      structuredSummary:
        "The party descends into a half-flooded crypt beneath the ruined chapel.",
      charactersInvolved: JSON.stringify(["Thorne", "Mira"]),
      locationInvolved: "The Flooded Crypt",
      visualImportance: 3,
      spoilerSafe: true,
      dmApproved: true,
    },
  });

  await prisma.sessionEvent.create({
    data: {
      campaignId: campaign.id,
      sceneId: scene.id,
      speaker: "DM",
      eventType: "combat state change",
      rawText: "A skeletal knight rises from the water near the broken altar.",
      structuredSummary:
        "A skeletal knight rises from the dark water beside the broken altar, raising a corroded greatsword.",
      charactersInvolved: JSON.stringify(["Skeletal Knight"]),
      locationInvolved: "The Flooded Crypt",
      visualImportance: 4,
      spoilerSafe: true,
      dmApproved: true,
    },
  });

  await prisma.sessionEvent.create({
    data: {
      campaignId: campaign.id,
      sceneId: scene.id,
      speaker: "Max",
      eventType: "attack",
      rawText:
        "Thorne charges the skeletal knight and hits with a 17, dealing 11 radiant damage.",
      structuredSummary:
        "Thorne strikes the skeletal knight with his longsword, cracking its helm with radiant energy.",
      charactersInvolved: JSON.stringify(["Thorne", "Skeletal Knight"]),
      locationInvolved: "The Flooded Crypt",
      mechanicalResult: JSON.stringify({
        roll: 17,
        result: "hit",
        damage: 11,
        damageType: "radiant",
      }),
      visualImportance: 5,
      spoilerSafe: true,
      dmApproved: true,
    },
  });

  // --- A starter correction ----------------------------------------------
  await prisma.correction.create({
    data: {
      campaignId: campaign.id,
      correctionType: "character",
      target: "Thorne",
      correction: "Thorne's armor is dented silver plate, never black armor.",
      priority: "high",
    },
  });

  console.log("Seeded demo campaign 'The Stolen Sun':");
  console.log(`  campaign:   ${campaign.id}`);
  console.log(`  characters: Thorne, Mira, Skeletal Knight`);
  console.log(`  location:   The Flooded Crypt`);
  console.log(`  scene:      ${scene.title} (active)`);
  console.log(`  events:     3`);
  console.log(`  corrections:1`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
