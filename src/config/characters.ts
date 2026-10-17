/**
 * ============================================================================
 * PARTY CHARACTER PASSCODES & PROFILES CONFIGURATION
 * ============================================================================
 * You can easily modify, add, or remove character codes and names here!
 *
 * Each character has:
 *  - id: Unique identifier
 *  - code: The secret passcode the guest/host enters at the login screen (case-insensitive)
 *  - name: Display name of the guest or host
 *  - title: Iconic role / party title
 *  - color: Custom avatar/badge theme color (Hex code)
 *  - role: 'host' (can add/edit/delete cards & manage party) or 'member' (can rate & comment)
 * ============================================================================
 */

export interface CharacterProfile {
  id: string;
  code: string;
  name: string;
  title: string;
  color: string;
  role: "host" | "member";
}

export const CHARACTER_CODES: CharacterProfile[] = [
  {
    id: "char-host",
    code: "HOST-OMEGA-99",
    name: "The Grand Archivist",
    title: "Party Host & Chronicler",
    color: "#FFC46B",
    role: "host",
  },
  {
    id: "char-1",
    code: "VALKYRIE-01",
    name: "Seraphina Vale",
    title: "Vanguard Commander",
    color: "#f43f5e",
    role: "member",
  },
  {
    id: "char-2",
    code: "SHADOW-02",
    name: "Kaelen Voss",
    title: "Nightblade Envoy",
    color: "#8b5cf6",
    role: "member",
  },
  {
    id: "char-3",
    code: "AEGIS-03",
    name: "Thorne Ironheart",
    title: "Bastion Defender",
    color: "#3b82f6",
    role: "member",
  },
  {
    id: "char-4",
    code: "SOLARIS-04",
    name: "Lyra Dawnbringer",
    title: "Oracle of Light",
    color: "#10b981",
    role: "member",
  },
  {
    id: "char-5",
    code: "CHRONO-05",
    name: "Orin Vance",
    title: "Timeweaver Scholar",
    color: "#f59e0b",
    role: "member",
  },
];

const LOCAL_CHARACTERS_KEY = "party_custom_characters_v1";

/**
 * Returns the active character list (merging any host-created characters in local storage).
 */
export function getActiveCharacters(): CharacterProfile[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_CHARACTERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return CHARACTER_CODES;
}

/**
 * Saves updated character list (allows host to add or change codes from the UI).
 */
export function saveActiveCharacters(characters: CharacterProfile[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_CHARACTERS_KEY, JSON.stringify(characters));
    } catch {}
  }
}

/**
 * Validates a user-entered code and returns their character profile, or null if invalid.
 */
export function findCharacterByCode(inputCode: string): CharacterProfile | null {
  const normalized = String(inputCode || "").trim().toUpperCase();
  const list = getActiveCharacters();
  return list.find((c) => c.code.toUpperCase() === normalized) ?? null;
}
