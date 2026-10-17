import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

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
  description: string; // Displayed in quotes under the half-cropped image when flipped
  image: string;
  holoPreset?:
    | "bursts"
    | "stars"
    | "shards"
    | "cosmos"
    | "rainbow"
    | "swirl"
    | "glitter"
    | "gold";
  cropPosition?: string; // e.g. "50% 30%" for custom focal crop on flipped back banner
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

let pgPoolInstance: Pool | null = null;
function getPgPool(): Pool | null {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) return null;
  if (!pgPoolInstance) {
    pgPoolInstance = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
    });
  }
  return pgPoolInstance;
}

let tableEnsured = false;
async function ensureTable(pool: Pool) {
  if (tableEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS party_state (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    tableEnsured = true;
  } catch (err) {
    console.warn("Could not auto-create party_state table in Postgres:", err);
  }
}

export function getStorageInfo() {
  const pgUrl =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  const supaUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supaKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  const isConnected = Boolean(pgUrl || (supaUrl && supaKey));
  return {
    isSupabaseConfigured: isConnected,
    storageType: pgUrl ? "postgres" : isConnected ? "supabase" : "ephemeral",
    previewUrl: supaUrl
      ? supaUrl.replace(/^(https?:\/\/[^.]+).*/, "$1...")
      : null,
  };
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (url && key) return createClient(url, key);
  return null;
}

async function readDB(): Promise<DatabaseState> {
  const fallback: DatabaseState = {
    roster: DEFAULT_ROSTER,
    events: INITIAL_EVENTS,
  };

  // 1. Try Direct Postgres (from Vercel's POSTGRES_URL environment variables)
  const pool = getPgPool();
  if (pool) {
    try {
      await ensureTable(pool);
      const res = await pool.query(
        "SELECT payload FROM party_state WHERE id = 'driftwall_v1' LIMIT 1"
      );
      if (res.rows.length > 0 && res.rows[0].payload) {
        const payload = res.rows[0].payload as DatabaseState;
        return {
          roster:
            Array.isArray(payload.roster) && payload.roster.length
              ? payload.roster
              : DEFAULT_ROSTER,
          events:
            Array.isArray(payload.events) && payload.events.length
              ? payload.events
              : INITIAL_EVENTS,
        };
      }

      // If database table is empty, seed it with fallback/local data
      let seedData = fallback;
      if (fs.existsSync(DATA_FILE)) {
        try {
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
        } catch {}
      }

      await pool.query(
        "INSERT INTO party_state (id, payload, updated_at) VALUES ('driftwall_v1', $1, now()) ON CONFLICT (id) DO UPDATE SET payload = $1, updated_at = now()",
        [JSON.stringify(seedData)]
      );
      return seedData;
    } catch (pgErr) {
      console.warn("Direct Postgres read error, falling back to REST / local:", pgErr);
    }
  }

  // 2. Try Supabase REST Client
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("party_state")
        .select("payload")
        .eq("id", "driftwall_v1")
        .single();
      if (!error && data?.payload) {
        const payload = data.payload as DatabaseState;
        return {
          roster:
            Array.isArray(payload.roster) && payload.roster.length
              ? payload.roster
              : DEFAULT_ROSTER,
          events:
            Array.isArray(payload.events) && payload.events.length
              ? payload.events
              : INITIAL_EVENTS,
        };
      }

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
      } catch (e) {
        console.warn(
          "Could not read local DB file for seeding, using fallback defaults:",
          e
        );
      }

      await supabase
        .from("party_state")
        .upsert({ id: "driftwall_v1", payload: seedData });
      return seedData;
    } catch (e) {
      console.warn("Supabase REST read error, falling back to local file:", e);
    }
  }

  // 3. Fallback: Local filesystem
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
  // 1. Try Direct Postgres
  const pool = getPgPool();
  if (pool) {
    try {
      await ensureTable(pool);
      await pool.query(
        "INSERT INTO party_state (id, payload, updated_at) VALUES ('driftwall_v1', $1, now()) ON CONFLICT (id) DO UPDATE SET payload = $1, updated_at = now()",
        [JSON.stringify(state)]
      );
      return;
    } catch (pgErr) {
      console.error("Direct Postgres write error:", pgErr);
    }
  }

  // 2. Try Supabase REST Client
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("party_state")
      .upsert({ id: "driftwall_v1", payload: state });
    if (!error) return;
    console.error("Supabase REST upsert error:", error);
  }

  // 3. Safety net: Local File
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.error("Local DB write error:", e);
  }
}

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export async function GET() {
  const state = await readDB();
  const storageInfo = getStorageInfo();
  return NextResponse.json({ ...state, storageInfo });
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

    // 1. GUEST / PLAYER UPSERT RATING & COMMENT (Max 7 words, 1 per user per card, cannot delete)
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
      return NextResponse.json(state);
    }

    // 2. HOST-ONLY: ADD OR EDIT CARD (Dynamically fits into DriftWall)
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
      return NextResponse.json(state);
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
      return NextResponse.json(state);
    }

    // 4. HOST-ONLY: UPDATE PLAYER ACCESS CODES & NAMES WITHOUT TOUCHING CODE
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
      return NextResponse.json(state);
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
