const adjectives = [
  "Petit",
  "Grand",
  "Fou",
  "Triste",
  "Heureux",
  "Coquin",
  "Sombre",
  "Drôle",
  "Curieux",
  "Rapide",
  "Lent",
  "Rusé",
  "Ailé",
  "Gourmand",
  "Tchateur",
  "DOrEtDePlatine",
  "Légendaire",
];

const nouns = [
  "Lapin",
  "Pigeon",
  "Hérisson",
  "Licorne",
  "Canard",
  "Chat",
  "Chien",
  "Panda",
  "Renard",
  "Mouton",
  "Cochon",
  "Gazo",
  "Macron",
  "Modric",
  "Sinner",
  "Wembanyama",
];

function pickRandom<T>(array: T[], seed: string): T {
  if (array.length === 0) {
    throw new Error("Cannot pick from an empty array");
  }

  // Create a simple deterministic hash from the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // force 32-bit int
  }

  const index = Math.abs(hash) % array.length;

  // TypeScript now knows this is safe
  const value = array[index];
  if (value === undefined) {
    throw new Error("Unexpected undefined value");
  }
  return value;
}

export function generateFunnyFrenchName(seed?: string): string {
  const randomSeed = seed ?? crypto.randomUUID();
  const adj1 = pickRandom(adjectives, randomSeed);
  const noun = pickRandom(nouns, randomSeed + "noun");
  let adj2 = pickRandom(adjectives, randomSeed + "adj2");

  // Avoid same adjective twice
  while (adj1 === adj2) {
    adj2 = pickRandom(adjectives, randomSeed + "adj2" + Math.random());
  }

  return `${adj1}${noun}${adj2}`;
}

export function generateFunnyPicture(seed?: string): string {
  const randomSeed = seed ?? crypto.randomUUID();
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${randomSeed}`;
}

// Helper function to generate consistent anonymized data for a user
export function generateUserAnonymizedData(userId: string) {
  return {
    usernameAnonymized: generateFunnyFrenchName(userId),
    pictureAnonymized: generateFunnyPicture(userId),
  };
}
