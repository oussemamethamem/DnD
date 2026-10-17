import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Force Vercel & Next.js to NEVER cache this route or its underlying fetch calls
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// ============================================================================
// EASY ACCESS CODES & NAMES ROSTER (Editable here OR inside the Host Web UI!)
// ============================================================================
export interface CharacterProfile {
  id: string;
  code: string;
  name: string;
  title: string;
  color: string;
  secondaryColor?: string;
  role: "host" | "member";
}

const DEFAULT_ROSTER: CharacterProfile[] = [
  {
    id: "char-host",
    code: "DeadRick",
    name: "Night",
    title: "Party Host & Creator",
    color: "#ffb347",
    secondaryColor: "#78350f",
    role: "host",
  },
  {
    id: "char-1",
    code: "Astralsea",
    name: "Constantine",
    title: "Party Guest",
    color: "#38bdf8",
    secondaryColor: "#0369a1",
    role: "member",
  },
  {
    id: "char-2",
    code: "Fred+Erica",
    name: "Fredrick(ex)",
    title: "Party Guest",
    color: "#22c55e",
    secondaryColor: "#051205",
    role: "member",
  },
  {
    id: "char-3",
    code: "Tharizdun",
    name: "Chaos",
    title: "Party Guest",
    color: "#ff2200",
    secondaryColor: "#7f1d1d",
    role: "member",
  },
  {
    id: "char-4",
    code: "Baz3a",
    name: "Plasmoid",
    title: "Party Guest",
    color: "#fbbf24",
    secondaryColor: "#34d399",
    role: "member",
  },
  {
    id: "char-5",
    code: "EnemyCrit",
    name: "Kailos",
    title: "Party Guest",
    color: "#6366f1",
    secondaryColor: "#312e81",
    role: "member",
  },
];

export interface ReviewEntry {
  characterId: string;
  characterName: string;
  characterColor: string;
  rating: number; // 1 to 5 stars
  comment: string; // Max 7 words
  updatedAt: string;
}

export interface PartyEventItem {
  id: string;
  title: string;
  date: string;
  description: string;
  image: string;
  holoPreset?:
    | "none"
    | "bursts"
    | "stars"
    | "shards"
    | "cosmos"
    | "rainbow"
    | "swirl"
    | "glitter"
    | "gold";
  cropPosition?: string;
  reviews: ReviewEntry[];
}

interface DatabaseState {
  roster: CharacterProfile[];
  events: PartyEventItem[];
}

const PICSUM_IDS = [
  1015, 1025, 1039, 1043, 1044, 1050, 1062, 1069, 1074, 1080, 1084, 106, 110,
  133, 164,
];

const INITIAL_EVENTS: PartyEventItem[] = PICSUM_IDS.map((picId, i) => {
  const num = i + 1;
  const presets = [
    "bursts",
    "stars",
    "shards",
    "cosmos",
    "rainbow",
    "swirl",
    "glitter",
    "gold",
  ] as const;
  return {
    id: `card-${num}`,
    title: `Chronicle Card #${num}`,
    date: `Era ${2010 + num}`,
    description: `Through the shifting tides of our history, this moment stood as an unbreakable vow among everyone gathered at the table.`,
    image: `https://picsum.photos/id/${picId}/700/900`,
    holoPreset: presets[i % presets.length],
    reviews: [],
  };
});

const DATA_FILE = path.join(process.cwd(), "data", "party-driftwall-db.json");

function getSupabaseCredentials() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  return { url: url.trim(), key: key.trim() };
}

export function getStorageInfo() {
  const { url, key } = getSupabaseCredentials();
  const isConnected = Boolean(url && key);
  return {
    isSupabaseConfigured: isConnected,
    storageType: isConnected ? "supabase" : "ephemeral",
    previewUrl: url ? url.replace(/^(https?:\/\/[^.]+).*/, "\$1...") : null,
  };
}

function getSupabase() {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Force every Supabase REST call to bypass Next.js / Vercel fetch cache
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

async function readDB(): Promise<DatabaseState> {
  const fallback: DatabaseState = {
    roster: DEFAULT_ROSTER,
    events: INITIAL_EVENTS,
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("party_state")
      .select("payload")
      .eq("id", "driftwall_v1")
      .maybeSingle();

    if (error) {
      console.error("Supabase readDB error:", error);
      // Do NOT overwrite the database on a read error! Throw so we don't wipe user data.
      throw new Error(
        `Supabase Read Error (${error.code}): ${error.message}. Make sure the 'party_state' table exists and RLS allows SELECT.`
      );
    }

    // If the row exists and has payload data, return it
    if (data && data.payload) {
      const payload = data.payload as DatabaseState;
      return {
        roster:
          Array.isArray(payload.roster) && payload.roster.length
            ? payload.roster
            : DEFAULT_ROSTER,
        events: Array.isArray(payload.events)
          ? payload.events
          : INITIAL_EVENTS,
      };
    }

    // ONLY seed the database if `data` is null (meaning the row 'driftwall_v1' truly does not exist yet)
    let seedData = fallback;
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        seedData = {
          roster:
            Array.isArray(raw.roster) && raw.roster.length
              ? raw.roster
              : DEFAULT_ROSTER,
          events:
            Array.isArray(raw.events) && raw.events.length
              ? raw.events
              : INITIAL_EVENTS,
        };
      }
    } catch {}

    const { error: seedErr } = await supabase.from("party_state").upsert(
      {
        id: "driftwall_v1",
        payload: seedData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (seedErr) {
      console.error("Supabase initial seed error:", seedErr);
    }
    return seedData;
  }

  // Fallback for local offline development only
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      return {
        roster:
          Array.isArray(raw.roster) && raw.roster.length
            ? raw.roster
            : DEFAULT_ROSTER,
        events:
          Array.isArray(raw.events) && raw.events.length
            ? raw.events
            : INITIAL_EVENTS,
      };
    }
  } catch (e) {
    console.error("Local DB read error:", e);
  }
  return fallback;
}

async function writeDB(state: DatabaseState) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("party_state").upsert(
      {
        id: "driftwall_v1",
        payload: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Supabase writeDB error:", error);
      throw new Error(
        `Supabase Save Failed (${error.code}): ${error.message}`
      );
    }
    return;
  }

  // Local development file fallback
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e: any) {
    throw new Error(
      "Supabase environment variables are not active on this server, and local filesystem is read-only."
    );
  }
}

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export async function GET() {
  try {
    const state = await readDB();
    const storageInfo = getStorageInfo();
    return NextResponse.json(
      { ...state, storageInfo },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/state error:", err);
    return NextResponse.json(
      {
        roster: DEFAULT_ROSTER,
        events: INITIAL_EVENTS,
        storageInfo: getStorageInfo(),
        error: err?.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, code, eventId, rating, comment, eventData, rosterData } =
      body;

    const state = await readDB();
    const cleanCode = String(code || "")
      .trim()
      .toUpperCase();
    const character = state.roster.find(
      (c) =>
        c.code.toUpperCase() === cleanCode ||
        c.name.toUpperCase() === cleanCode ||
        c.name.toUpperCase().replace(/\s*\(EX\)\s*/i, "") === cleanCode
    );

    const storageInfo = getStorageInfo();

    // Allow LOGIN_VERIFY without mutating state
    if (action === "LOGIN_VERIFY") {
      if (!character) {
        return NextResponse.json(
          {
            error:
              "Invalid access code. Only codes generated by the Host are allowed.",
          },
          { status: 401 }
        );
      }
      return NextResponse.json({ character, ...state, storageInfo });
    }

    if (!character) {
      return NextResponse.json(
        { error: "Unauthorized access code." },
        { status: 401 }
      );
    }

    // 1. GUEST / PLAYER UPSERT RATING & COMMENT
    if (action === "UPSERT_REVIEW") {
      const cleanComment = String(comment || "").trim();
      const words = countWords(cleanComment);
      if (words === 0 || words > 7) {
        return NextResponse.json(
          {
            error: `Comments cannot be longer than 7 words (yours is ${words} words).`,
          },
          { status: 400 }
        );
      }

      const numRating = Math.min(5, Math.max(1, Number(rating) || 5));
      const idx = state.events.findIndex((e) => e.id === eventId);
      if (idx === -1) {
        return NextResponse.json({ error: "Card not found." }, { status: 404 });
      }

      const card = state.events[idx];
      const existingIdx = card.reviews.findIndex(
        (r) => r.characterId === character.id
      );

      const reviewEntry: ReviewEntry = {
        characterId: character.id,
        characterName: character.name,
        characterColor: character.color,
        rating: numRating,
        comment: cleanComment,
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        card.reviews[existingIdx] = reviewEntry;
      } else {
        card.reviews.push(reviewEntry);
      }

      state.events[idx] = card;
      await writeDB(state);
      return NextResponse.json({ ...state, storageInfo });
    }

    // 2. HOST-ONLY: ADD OR EDIT CARD
    if (action === "HOST_SAVE_EVENT") {
      if (character.role !== "host") {
        return NextResponse.json(
          { error: "Only the Host can edit or add cards." },
          { status: 403 }
        );
      }

      const existingIdx = state.events.findIndex((e) => e.id === eventData.id);
      if (existingIdx >= 0) {
        state.events[existingIdx] = {
          ...state.events[existingIdx],
          title: eventData.title,
          date: eventData.date,
          description: eventData.description,
          image: eventData.image,
          holoPreset:
            eventData.holoPreset || state.events[existingIdx].holoPreset,
          cropPosition:
            eventData.cropPosition ||
            state.events[existingIdx].cropPosition ||
            "50% 30%",
        };
      } else {
        const nextNum = state.events.length + 1;
        state.events.unshift({
          id: `card-${Date.now()}`,
          title: eventData.title || `Chronicle Card #${nextNum}`,
          date: eventData.date || `Era ${2010 + nextNum}`,
          description:
            eventData.description ||
            "A newly recorded memory in the party's drifting archive.",
          image:
            eventData.image ||
            `https://picsum.photos/seed/drift-card-${nextNum}/700/900`,
          holoPreset: eventData.holoPreset || "bursts",
          cropPosition: eventData.cropPosition || "50% 30%",
          reviews: [],
        });
      }

      await writeDB(state);
      return NextResponse.json({ ...state, storageInfo });
    }

    // 3. HOST-ONLY: DELETE CARD
    if (action === "HOST_DELETE_EVENT") {
      if (character.role !== "host") {
        return NextResponse.json(
          { error: "Only the Host can delete cards." },
          { status: 403 }
        );
      }
      state.events = state.events.filter((e) => e.id !== eventId);
      await writeDB(state);
      return NextResponse.json({ ...state, storageInfo });
    }

    // 4. HOST-ONLY: UPDATE PLAYER ACCESS CODES & NAMES
    if (action === "HOST_UPDATE_ROSTER") {
      if (character.role !== "host") {
        return NextResponse.json(
          { error: "Only the Host can modify player codes and names." },
          { status: 403 }
        );
      }
      if (Array.isArray(rosterData) && rosterData.length > 0) {
        state.roster = rosterData;
        await writeDB(state);
      }
      return NextResponse.json({ ...state, storageInfo });
    }

    // 5. HOST-ONLY: BATCH SAVE/REPLACE ALL EVENTS FROM CONTROL CENTER / DISPLAY ALL
    if (action === "HOST_BATCH_UPDATE_EVENTS") {
      if (character.role !== "host") {
        return NextResponse.json(
          { error: "Only the Host can batch update cards in the Control Center." },
          { status: 403 }
        );
      }
      if (Array.isArray(body.eventsData)) {
        state.events = body.eventsData.map((e: PartyEventItem, idx: number) => {
          const existing = state.events.find((old) => old.id === e.id);
          return {
            id: e.id || `card-${Date.now()}-${idx}`,
            title: String(e.title || "").trim() || `Chronicle Card #${idx + 1}`,
            date: String(e.date || "").trim() || `Era ${2010 + idx + 1}`,
            description:
              String(e.description || "").trim() ||
              "A moment recorded in the drifting archive.",
            image:
              String(e.image || "").trim() ||
              `https://picsum.photos/seed/drift-card-${idx + 1}/700/900`,
            holoPreset: e.holoPreset || "bursts",
            cropPosition: e.cropPosition || existing?.cropPosition || "50% 30%",
            reviews: Array.isArray(e.reviews)
              ? e.reviews
              : existing?.reviews || [],
          };
        });
        await writeDB(state);
      }
      return NextResponse.json({ ...state, storageInfo });
    }

    // 6. HOST-ONLY: IMPORT FULL DATABASE BACKUP
    if (action === "HOST_IMPORT_DATA") {
      if (character.role !== "host") {
        return NextResponse.json(
          { error: "Only the Host can restore database backups." },
          { status: 403 }
        );
      }
      if (body.importedState && Array.isArray(body.importedState.events)) {
        state.events = body.importedState.events;
        if (
          Array.isArray(body.importedState.roster) &&
          body.importedState.roster.length > 0
        ) {
          state.roster = body.importedState.roster;
        }
        await writeDB(state);
      }
      return NextResponse.json({ ...state, storageInfo });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error processing request." },
      { status: 500 }
    );
  }
}
