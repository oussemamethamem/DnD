"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import DriftWall from "@/components/ui/DriftWall";
import FlipCard from "@/components/ui/FlipCard";
import HoloCard from "@/components/ui/HoloCard";
import SideRays from "@/components/ui/SideRays";
import LatticeLoader from "@/components/ui/LatticeLoader";
import GlowCursor from "@/components/ui/GlowCursor";
import type {
  CharacterProfile,
  PartyEventItem,
} from "@/app/api/state/route";
import {
  Star,
  Sparkles,
  RotateCw,
  ShieldCheck,
  KeyRound,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  Database,
  Quote,
  SlidersHorizontal,
  Menu,
  ChevronUp,
  ChevronDown,
  Copy,
  Search,
  Layers,
  RefreshCw,
  ExternalLink,
  Crop,
  Crosshair,
  Grid,
  List,
  LayoutGrid,
} from "lucide-react";

const SESSION_CODE_KEY = "party_driftwall_access_code_v1";

export const CHARACTER_CURSOR_THEMES: Record<
  string,
  { color: string; secondaryColor: string }
> = {
  Chaos: { color: "#ff2200", secondaryColor: "#7f1d1d" },
  Constantine: { color: "#38bdf8", secondaryColor: "#0369a1" },
  Plasmoid: { color: "#fbbf24", secondaryColor: "#34d399" },
  "Fredrick(ex)": { color: "#22c55e", secondaryColor: "#051205" },
  Fredrick: { color: "#22c55e", secondaryColor: "#051205" },
  Kailos: { color: "#6366f1", secondaryColor: "#312e81" },
  Night: { color: "#ffb347", secondaryColor: "#78350f" },
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function WorksWheelDemo() {
  const [events, setEvents] = React.useState<PartyEventItem[]>([]);
  const [roster, setRoster] = React.useState<CharacterProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Auth State
  const [accessCode, setAccessCode] = React.useState("");
  const [codeInput, setCodeInput] = React.useState("");
  const [loginError, setLoginError] = React.useState("");
  const [loginStatus, setLoginStatus] = React.useState<
    "idle" | "working" | "done" | "error"
  >("idle");
  const [character, setCharacter] = React.useState<CharacterProfile | null>(
    null
  );

  // Dynamic Cursor & Ambient Dual-Color Theming per Character Entry
  const currentCursorTheme = React.useMemo(() => {
    if (character) {
      if (CHARACTER_CURSOR_THEMES[character.name]) {
        return CHARACTER_CURSOR_THEMES[character.name];
      }
      if (character.color) {
        return {
          color: character.color,
          secondaryColor: character.secondaryColor || character.color,
        };
      }
    }
    return { color: "#ffb347", secondaryColor: "#78350f" };
  }, [character]);

  const previewTheme = React.useMemo(() => {
    if (character) return currentCursorTheme;
    if (codeInput.trim()) {
      const match = roster.find(
        (r) =>
          r.code.toLowerCase() === codeInput.trim().toLowerCase() ||
          r.name.toLowerCase() === codeInput.trim().toLowerCase()
      );
      if (match) {
        return (
          CHARACTER_CURSOR_THEMES[match.name] || {
            color: match.color,
            secondaryColor: match.secondaryColor || match.color,
          }
        );
      }
    }
    return { color: "#ffb347", secondaryColor: "#78350f" };
  }, [character, currentCursorTheme, codeInput, roster]);

  // Zoomed Card & Flip State
  const [activeEventId, setActiveEventId] = React.useState<string | null>(null);
  const [isCardFlipped, setIsCardFlipped] = React.useState(false);

  // Left-Side Rating & 7-Word Comment State
  const [myRating, setMyRating] = React.useState<number>(5);
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);
  const [myComment, setMyComment] = React.useState<string>("");
  const [reviewStatus, setReviewStatus] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  // Host Modals: Edit/Add Card, Manage Codes/Names, & Database Ledger
  const [hostCardModalOpen, setHostCardModalOpen] = React.useState(false);
  const [hostRosterModalOpen, setHostRosterModalOpen] = React.useState(false);
  const [hostDbModalOpen, setHostDbModalOpen] = React.useState(false);
  const [newPlayerName, setNewPlayerName] = React.useState("");
  const [newPlayerCode, setNewPlayerCode] = React.useState("");
  const [newPlayerTitle, setNewPlayerTitle] = React.useState("");

  const [editingEvent, setEditingEvent] = React.useState<
    Partial<PartyEventItem>
  >({
    title: "",
    date: "",
    description: "",
    image: "",
    holoPreset: "bursts",
  });

  // Mobile Responsiveness & Adaptive Viewport State
  const [windowWidth, setWindowWidth] = React.useState(1200);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSize = () => setWindowWidth(window.innerWidth);
    updateSize();
    window.addEventListener("resize", updateSize, { passive: true });
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const wallColumns = isMobile ? 3 : isTablet ? 4 : 5;
  const wallTileWidth = isMobile ? 122 : isTablet ? 175 : 220;
  const wallTileHeight = isMobile ? 88 : isTablet ? 122 : 148;
  const wallGap = isMobile ? 10 : isTablet ? 14 : 18;
  const wallTilt = isMobile ? 10 : 16;
  const wallTurn = isMobile ? -8 : -14;

  const flipWidth = isMobile ? Math.min(320, windowWidth - 32) : 360;
  const flipHeight = Math.round(flipWidth * (500 / 360));
  const holoWidth = flipWidth - 24;

  // "Display All" View Mode: 'grid' (multi-card grid) or 'list' (detailed rows)
  const [displayViewMode, setDisplayViewMode] = React.useState<"grid" | "list">("grid");

  // Visual Image Cropping Tool State
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [croppingCardId, setCroppingCardId] = React.useState<string | null>(null);
  const [cropX, setCropX] = React.useState<number>(50);
  const [cropY, setCropY] = React.useState<number>(30);
  const cropContainerRef = React.useRef<HTMLDivElement>(null);

  // Control Center (Batch Editor) State
  const [controlCenterOpen, setControlCenterOpen] = React.useState(false);
  const [batchEvents, setBatchEvents] = React.useState<PartyEventItem[]>([]);
  const [batchSearchQuery, setBatchSearchQuery] = React.useState("");
  const [batchSaveStatus, setBatchSaveStatus] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [batchSaveMessage, setBatchSaveMessage] = React.useState("");

  const handleOpenControlCenter = () => {
    setBatchEvents(JSON.parse(JSON.stringify(events)));
    setBatchSearchQuery("");
    setBatchSaveStatus("idle");
    setBatchSaveMessage("");
    setControlCenterOpen(true);
    setMobileMenuOpen(false);
  };

  const handleCreateCardInBatch = () => {
    const nextNum = batchEvents.length + 1;
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
    const newCard: PartyEventItem = {
      id: `card-${Date.now()}`,
      title: `Chronicle Card #${nextNum}`,
      date: `Era ${2010 + nextNum}`,
      description: "A newly recorded memory in the party's drifting archive.",
      image: `https://picsum.photos/seed/batch-${Date.now() % 1000}/700/900`,
      holoPreset: presets[nextNum % presets.length],
      cropPosition: "50% 30%",
      reviews: [],
    };
    setBatchEvents((prev) => [newCard, ...prev]);
  };

  const handleDeleteCardFromBatch = (cardId: string) => {
    setBatchEvents((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleDuplicateCardInBatch = (card: PartyEventItem) => {
    const clone: PartyEventItem = {
      ...card,
      id: `card-${Date.now()}`,
      title: `${card.title} (Copy)`,
      reviews: [],
    };
    setBatchEvents((prev) => [clone, ...prev]);
  };

  const handleMoveCardInBatch = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= batchEvents.length) return;
    setBatchEvents((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleUpdateCardField = (
    cardId: string,
    field: keyof PartyEventItem,
    value: any
  ) => {
    setBatchEvents((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, [field]: value } : c))
    );
  };

  const handleBatchCardFileUpload = (
    cardId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        handleUpdateCardField(cardId, "image", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const croppingCard = React.useMemo(() => {
    if (!croppingCardId) return null;
    return (
      batchEvents.find((c) => c.id === croppingCardId) ||
      events.find((c) => c.id === croppingCardId) ||
      (editingEvent?.id === croppingCardId
        ? (editingEvent as PartyEventItem)
        : null)
    );
  }, [croppingCardId, batchEvents, events, editingEvent]);

  const handleOpenCropTool = (cardId: string) => {
    const card =
      batchEvents.find((c) => c.id === cardId) ||
      events.find((c) => c.id === cardId) ||
      (editingEvent?.id === cardId ? editingEvent : null);
    if (!card) return;
    setCroppingCardId(cardId);
    if (card.cropPosition) {
      const parts = card.cropPosition.split(" ");
      if (parts.length === 2) {
        const px = parseFloat(parts[0]);
        const py = parseFloat(parts[1]);
        if (!isNaN(px)) setCropX(px);
        if (!isNaN(py)) setCropY(py);
      }
    } else {
      setCropX(50);
      setCropY(30);
    }
    setCropModalOpen(true);
  };

  const handleApplyCrop = () => {
    if (!croppingCardId) return;
    const formatted = `${Math.round(cropX)}% ${Math.round(cropY)}%`;
    handleUpdateCardField(croppingCardId, "cropPosition", formatted);
    if (editingEvent && editingEvent.id === croppingCardId) {
      setEditingEvent((prev) => ({ ...prev, cropPosition: formatted }));
    }
    setCropModalOpen(false);
  };

  const handleCropPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setCropX(Math.round(x));
    setCropY(Math.round(y));
  };

  const handleSaveBatchEvents = async () => {
    if (!character || character.role !== "host") {
      setBatchSaveStatus("error");
      setBatchSaveMessage("Only the Host (Night) has permissions to batch save cards.");
      return;
    }
    setBatchSaveStatus("saving");
    setBatchSaveMessage("");
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HOST_BATCH_UPDATE_EVENTS",
          code: accessCode,
          eventsData: batchEvents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBatchSaveStatus("error");
        setBatchSaveMessage(data.error || "Failed to batch save cards.");
      } else {
        setEvents(data.events);
        setBatchEvents(data.events);
        setBatchSaveStatus("saved");
        setBatchSaveMessage(
          `Successfully saved all ${data.events.length} cards to database!`
        );
        setTimeout(() => setBatchSaveStatus("idle"), 3500);
      }
    } catch {
      setBatchSaveStatus("error");
      setBatchSaveMessage("Network error while batch saving.");
    }
  };

  const fetchState = React.useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.events)) setEvents(data.events);
      if (Array.isArray(data.roster)) {
        setRoster(data.roster);
        const savedCode = localStorage.getItem(SESSION_CODE_KEY);
        if (savedCode) {
          const found = data.roster.find(
            (c: CharacterProfile) =>
              c.code.toUpperCase() === savedCode.toUpperCase()
          );
          if (found) {
            setAccessCode(savedCode);
            setCharacter(found);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch state", e);
    } finally {
      setTimeout(() => setLoading(false), 900);
    }
  }, []);

  React.useEffect(() => {
    fetchState();
  }, [fetchState]);

  const activeEvent = React.useMemo(
    () => events.find((e) => e.id === activeEventId) || null,
    [events, activeEventId]
  );

  // Pre-fill existing rating & comment when selecting a card
  React.useEffect(() => {
    if (!activeEvent || !character) return;
    const existing = activeEvent.reviews.find(
      (r) => r.characterId === character.id
    );
    if (existing) {
      setMyRating(existing.rating);
      setMyComment(existing.comment);
    } else {
      setMyRating(5);
      setMyComment("");
    }
    setReviewStatus("");
  }, [activeEvent, character]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const clean = codeInput.trim().toUpperCase();
    if (!clean) {
      setLoginError("Please enter your password to unlock the archive.");
      return;
    }
    setLoginStatus("working");
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "LOGIN_VERIFY", code: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.character) {
        setLoginStatus("error");
        setLoginError(
          data.error || "Incorrect password. Please try again."
        );
        setTimeout(() => setLoginStatus("idle"), 1800);
        return;
      }
      setLoginStatus("done");
      localStorage.setItem(SESSION_CODE_KEY, clean);
      setAccessCode(clean);
      if (Array.isArray(data.events)) setEvents(data.events);
      if (Array.isArray(data.roster)) setRoster(data.roster);
      setTimeout(() => {
        setCharacter(data.character);
        setLoginStatus("idle");
      }, 700);
    } catch {
      setLoginStatus("error");
      setLoginError("Could not verify password.");
      setTimeout(() => setLoginStatus("idle"), 1800);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_CODE_KEY);
    setCharacter(null);
    setAccessCode("");
    setCodeInput("");
    setActiveEventId(null);
  };

  const wordCount = countWords(myComment);
  const isOverWordLimit = wordCount > 7;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !character || isOverWordLimit || wordCount === 0) return;
    setSubmitting(true);
    setReviewStatus("");

    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPSERT_REVIEW",
          code: accessCode,
          eventId: activeEvent.id,
          rating: myRating,
          comment: myComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewStatus(data.error || "Failed to save rating.");
      } else {
        setEvents(data.events);
        setReviewStatus("Saved to database! You can edit anytime.");
      }
    } catch {
      setReviewStatus("Network error while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHostSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!character || character.role !== "host") return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HOST_SAVE_EVENT",
          code: accessCode,
          eventData: editingEvent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.events) {
        setEvents(data.events);
        setHostCardModalOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleHostDeleteEvent = async (eventId: string) => {
    if (!character || character.role !== "host") return;
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "HOST_DELETE_EVENT",
        code: accessCode,
        eventId,
      }),
    });
    const data = await res.json();
    if (res.ok && data.events) {
      setEvents(data.events);
      setActiveEventId(null);
    }
  };

  const handleSaveRoster = async (updatedRoster: CharacterProfile[]) => {
    setRoster(updatedRoster);
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "HOST_UPDATE_ROSTER",
        code: accessCode,
        rosterData: updatedRoster,
      }),
    });
  };

  const handleAddPlayerCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !newPlayerCode.trim()) return;
    const palette = [
      "#f43f5e",
      "#a855f7",
      "#38bdf8",
      "#34d399",
      "#fbbf24",
      "#ec4899",
      "#60a5fa",
    ];
    const themeDefault = CHARACTER_CURSOR_THEMES[newPlayerName.trim()];
    const nextChar: CharacterProfile = {
      id: `char-${Date.now()}`,
      name: newPlayerName.trim(),
      code: newPlayerCode.trim().toUpperCase(),
      title: newPlayerTitle.trim() || "Party Guest",
      color: themeDefault
        ? themeDefault.color
        : palette[roster.length % palette.length],
      secondaryColor: themeDefault ? themeDefault.secondaryColor : undefined,
      role: "member",
    };
    const updated = [...roster, nextChar];
    await handleSaveRoster(updated);
    setNewPlayerName("");
    setNewPlayerCode("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setEditingEvent((prev) => ({
          ...prev,
          image: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // =========================================================================
  // INITIAL SITE LOAD: GATHERING MEMORIES
  // =========================================================================
  if (loading) {
    return (
      <GlowCursor
        color="#ffb347"
        secondaryColor="#78350f"
        intensity={1.3}
        trailWidth={3.5}
        linger={1}
        glow={3}
        clickBurst
        theme="dark"
        className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#060010]"
      >
        <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden">
          <SideRays
            density={6}
            dust={0.45}
            followMouse={true}
            intensity={2.1}
            origin="top-right"
            rayColor1="#ffb347"
            rayColor2="#78350f"
            speed={2.2}
            spread={2.8}
            falloff={1.1}
          />
        </div>
        <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden opacity-70">
          <SideRays
            density={5}
            dust={0.35}
            followMouse={true}
            intensity={1.8}
            origin="bottom-left"
            rayColor1="#38bdf8"
            rayColor2="#0369a1"
            speed={1.8}
            spread={2.5}
            falloff={1.1}
          />
        </div>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center gap-4 rounded-3xl border border-white/15 bg-zinc-900/85 px-8 py-6 shadow-2xl backdrop-blur-xl"
          >
            <LatticeLoader
              status="working"
              label="gathering memories. . ."
              doneLabel="Done in"
              errorLabel="Failed after"
              pattern="orbit"
              grid={3}
              shape="round"
              color="#FFC46B"
              doneColor="#22c55e"
              errorColor="#ef4444"
              cellSize={6}
              gap={2}
              fontSize={14}
              step={90}
              idleOpacity={0.15}
              glow={false}
              glowColor=""
              showTimer={true}
            />
          </motion.div>
        </div>
      </GlowCursor>
    );
  }

  // =========================================================================
  // LOGIN SCREEN (Password or Name required)
  // =========================================================================
  if (!character) {
    return (
      <GlowCursor
        color={previewTheme.color}
        secondaryColor={previewTheme.secondaryColor}
        intensity={1.3}
        trailWidth={3.5}
        linger={1}
        glow={3}
        clickBurst
        theme="dark"
        className="fixed inset-0 h-screen w-screen overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 15% 85%, rgba(56, 189, 248, 0.22) 0%, transparent 60%), radial-gradient(ellipse at 85% 15%, rgba(251, 191, 36, 0.2) 0%, transparent 65%), #060010",
        }}
      >
        {/* Holographic Wall background forced to fill 100% of viewport with high clarity */}
        <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden opacity-85">
          <DriftWall
            items={events}
            columns={wallColumns}
            tileWidth={wallTileWidth}
            tileHeight={wallTileHeight}
            gap={wallGap}
            tilt={wallTilt}
            turn={wallTurn}
            perspective={1200}
            depth={120}
            speed={30}
            direction="up"
            variance={0.45}
            parallax={0.6}
            lift={0}
            fade={0.2}
            dim={0.75}
            overlayColor="#060010"
          />
        </div>

        {/* Dual Volumetric Light */}
        <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden">
          <SideRays
            density={6}
            dust={0.45}
            followMouse={true}
            intensity={2.1}
            origin="top-right"
            rayColor1={previewTheme.color}
            rayColor2={previewTheme.secondaryColor}
            speed={2.2}
            spread={2.8}
            falloff={1.1}
          />
        </div>
        <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden opacity-75">
          <SideRays
            density={5}
            dust={0.35}
            followMouse={true}
            intensity={1.9}
            origin="bottom-left"
            rayColor1="#38bdf8"
            rayColor2="#a855f7"
            speed={1.8}
            spread={2.6}
            falloff={1.1}
          />
        </div>

        {/* Outer Wrapper around Password Modal: fixed full-screen overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative z-10 w-full max-w-[92vw] sm:max-w-md rounded-3xl border border-white/25 bg-black/35 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] backdrop-blur-md"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/15 text-amber-300 backdrop-blur-sm">
                <KeyRound className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Chronicle DriftWall
                </h1>
                <p className="text-xs text-zinc-300">
                  Enter your password to unlock the archive
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-200">
                  Password
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter your password..."
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                    setLoginError("");
                  }}
                  className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 font-mono text-base sm:text-sm tracking-widest text-white placeholder-zinc-500 outline-none backdrop-blur-sm transition focus:border-amber-400 focus:bg-black/55"
                />
              </div>

              {loginError && (
                <p className="flex items-center gap-1.5 text-xs text-rose-400">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginStatus === "working" || loginStatus === "done"}
                className="group relative flex w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 py-3.5 px-6 font-mono text-xs font-bold tracking-wider text-zinc-950 uppercase shadow-[0_0_25px_rgba(251,191,36,0.35)] transition-all duration-300 hover:border-amber-300 hover:from-amber-300 hover:to-amber-400 hover:shadow-[0_0_35px_rgba(251,191,36,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 min-h-[48px]"
              >
                {/* Specular shimmer highlight animation */}
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                {loginStatus !== "idle" ? (
                  <LatticeLoader
                    status={loginStatus}
                    label="gathering memories. . ."
                    doneLabel="Access Granted"
                    errorLabel="Access Denied"
                    pattern="orbit"
                    grid={3}
                    shape="round"
                    color="#09090b"
                    doneColor="#15803d"
                    errorColor="#b91c1c"
                    cellSize={5}
                    gap={2}
                    fontSize={12}
                    step={90}
                    idleOpacity={0.25}
                    glow={false}
                    glowColor=""
                    showTimer={true}
                  />
                ) : (
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <Sparkles className="size-4 shrink-0 text-zinc-950 transition-transform group-hover:rotate-12 group-hover:scale-110" />
                    <span>Enter Holographic Wall</span>
                  </div>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </GlowCursor>
    );
  }

  const existingUserReview = activeEvent?.reviews.find(
    (r) => r.characterId === character.id
  );
  const avgRating =
    activeEvent && activeEvent.reviews.length > 0
      ? (
          activeEvent.reviews.reduce((acc, r) => acc + r.rating, 0) /
          activeEvent.reviews.length
        ).toFixed(1)
      : "—";

  const displayedStars = hoverRating ?? myRating;

  return (
    <GlowCursor
      color={currentCursorTheme.color}
      secondaryColor={currentCursorTheme.secondaryColor}
      intensity={1.3}
      trailWidth={3.5}
      linger={1}
      glow={3}
      clickBurst
      theme="dark"
      className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#060010]"
    >
      <div className="relative h-screen w-screen overflow-hidden text-zinc-100 select-none">
      {/* SideRays Volumetric Light Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden">
        <SideRays
          density={5}
          dust={0.35}
          followMouse={true}
          intensity={1.9}
          origin="top-right"
          rayColor1={currentCursorTheme.color}
          rayColor2={currentCursorTheme.secondaryColor}
          speed={2.2}
          spread={2}
        />
      </div>

      {/* Top Navigation & Host Admin Bar */}
      <header className="pointer-events-none fixed top-0 right-0 left-0 z-30 flex items-center justify-between gap-2 px-3.5 py-3 sm:px-6 sm:py-4">
        {/* User Character Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-zinc-900/85 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-md">
          <span
            className="size-2.5 rounded-full shrink-0 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${currentCursorTheme.color}, ${currentCursorTheme.secondaryColor})`,
              boxShadow: `0 0 10px ${currentCursorTheme.color}`,
            }}
          />
          <div className="text-xs">
            <span className="font-bold text-white">{character.name}</span>
            <span className="ml-1.5 text-zinc-400 hidden sm:inline">({character.title})</span>
          </div>
          {character.role === "host" && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
              <ShieldCheck className="size-3" /> Host
            </span>
          )}
        </div>

        {/* Desktop Buttons */}
        <div className="pointer-events-auto hidden md:flex flex-wrap items-center gap-2">
          {/* Prominent Display All Cards (Host Master Editor) Button */}
          <button
            type="button"
            onClick={handleOpenControlCenter}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-amber-400/80 bg-gradient-to-r from-amber-400/30 via-amber-300/25 to-amber-500/30 px-4 py-2 text-xs font-black text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.35)] backdrop-blur-md transition hover:scale-105 hover:border-amber-300 hover:from-amber-400/40 hover:to-amber-500/40"
            title="Display All Cards: View and edit all cards simultaneously on one big screen"
          >
            <LayoutGrid className="size-4 text-amber-400" />
            <span>Display All Cards</span>
            <span className="rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] font-extrabold text-amber-200">
              {events.length}
            </span>
          </button>

          {character.role === "host" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingEvent({
                    title: "",
                    date: `Era ${new Date().getFullYear()}`,
                    description: "",
                    image: "",
                    holoPreset: "bursts",
                    cropPosition: "50% 30%",
                  });
                  setHostCardModalOpen(true);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md transition hover:bg-amber-300"
              >
                <Plus className="size-4" />
                Add Card
              </button>

              <button
                type="button"
                onClick={() => setHostRosterModalOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400/40 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-amber-300 backdrop-blur-md transition hover:bg-zinc-800"
              >
                <Users className="size-3.5" />
                Manage Codes & Names
              </button>

              <button
                type="button"
                onClick={() => setHostDbModalOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-400/40 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-sky-300 backdrop-blur-md transition hover:bg-zinc-800"
              >
                <Database className="size-3.5" />
                Ratings Database
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-zinc-900/85 px-3.5 py-2 text-xs font-medium text-zinc-300 backdrop-blur-md transition hover:bg-zinc-800"
          >
            <LogOut className="size-3.5" />
            Switch User
          </button>
        </div>

        {/* Mobile Header Buttons */}
        <div className="pointer-events-auto flex md:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={handleOpenControlCenter}
            className="flex items-center gap-1.5 rounded-full border border-amber-400/70 bg-amber-400/25 px-3 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-md"
          >
            <LayoutGrid className="size-3.5" />
            <span>Display All</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-zinc-900/90 text-white backdrop-blur-md"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </header>

      {/* Main 3D Holographic DriftWall Menu */}
      <div className="fixed inset-0 z-10 h-screen w-screen overflow-hidden">
        {!loading && (
          <DriftWall
            items={events}
            columns={wallColumns}
            tileWidth={wallTileWidth}
            tileHeight={wallTileHeight}
            gap={wallGap}
            tilt={wallTilt}
            turn={wallTurn}
            perspective={1200}
            depth={120}
            speed={38}
            direction="up"
            variance={0.45}
            parallax={0.6}
            lift={64}
            fade={0.65}
            dim={0.75}
            overlayColor="#060010"
            onSelectItem={(item) => {
              setActiveEventId(item.id);
              setIsCardFlipped(false);
            }}
          />
        )}
      </div>

      {/* Bottom Helper Hint */}
      <div className="pointer-events-none fixed bottom-4 left-6 z-20 hidden sm:block rounded-full border border-white/10 bg-zinc-900/75 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur-md">
        Click any card to select · <strong className="text-amber-300">Second click makes it the focus</strong> & flip for lore
      </div>

      {/* =================================================================== */}
      {/* ZOOMED & ENLARGED CENTER STAGE OVER BLURRED BACKGROUND              */}
      {/* =================================================================== */}
      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveEventId(null)}
            className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 p-3 sm:p-6 backdrop-blur-xl"
          >
            {/* Close "X" Button in Top-Right Corner */}
            <button
              type="button"
              onClick={() => setActiveEventId(null)}
              aria-label="Close selected card"
              className="fixed top-3 right-3 sm:top-6 sm:right-6 z-50 flex size-9 sm:size-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-zinc-900/90 text-white shadow-xl transition hover:scale-110 hover:bg-zinc-800"
            >
              <X className="size-5" />
            </button>

            <div className="relative mx-auto my-auto grid w-full max-w-6xl grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8 py-8 sm:py-0">
              {/* ============================================================= */}
              {/* LEFT OF CARD: "ICONIC COMMENT" & SMOOTH 1-5 STAR RATING       */}
              {/* ============================================================= */}
              <motion.div
                initial={{ opacity: 0, x: -35 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -35 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
                className="order-2 lg:order-1 col-span-12 lg:col-span-4 flex flex-col gap-4 rounded-3xl border border-white/20 bg-zinc-950/75 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest text-amber-300 uppercase">
                      Player Verdict
                    </span>
                    <h3 className="text-lg font-extrabold text-white">
                      Iconic Comment & Rating
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl bg-amber-400/15 px-3 py-1.5 text-amber-300">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-black">{avgRating}</span>
                  </div>
                </div>

                {/* Smooth & Crisp 1-5 Star Animation Selector */}
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300">
                        {existingUserReview
                          ? "Modify Your Star Rating:"
                          : "Select Your Star Rating:"}
                      </span>
                      <motion.span
                        key={displayedStars}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-bold text-amber-300"
                      >
                        {displayedStars} / 5 Stars
                      </motion.span>
                    </div>

                    <div
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-4 py-3"
                      onMouseLeave={() => setHoverRating(null)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= displayedStars;
                        return (
                          <motion.button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onClick={() => setMyRating(star)}
                            whileHover={{ scale: 1.28, rotate: -6 }}
                            whileTap={{ scale: 0.88 }}
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 17,
                            }}
                            className="relative cursor-pointer p-1 outline-none"
                          >
                            {active && (
                              <motion.span
                                layoutId={`star-glow-${star}`}
                                initial={{ scale: 0.4, opacity: 0 }}
                                animate={{ scale: 1.35, opacity: 0.35 }}
                                className="pointer-events-none absolute inset-0 rounded-full bg-amber-400 blur-md"
                              />
                            )}
                            <Star
                              className={`relative z-10 size-7 transition-colors duration-150 ${
                                active
                                  ? "fill-amber-400 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                                  : "fill-transparent text-zinc-600"
                              }`}
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Iconic Comment Input (Strictly <= 7 Words) */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300">
                        Iconic Comment (Max 7 words)
                      </span>
                      <span
                        className={
                          isOverWordLimit
                            ? "font-extrabold text-rose-400"
                            : "font-mono text-zinc-400"
                        }
                      >
                        {wordCount} / 7 words
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Leave your iconic 7-word comment..."
                      value={myComment}
                      onChange={(e) => setMyComment(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                    <p className="mt-1 text-[10px] text-zinc-400">
                      One rating & comment per card. You can edit anytime, but
                      cannot remove it.
                    </p>
                  </div>

                  {reviewStatus && (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      {reviewStatus}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting || isOverWordLimit || wordCount === 0
                    }
                    className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 py-2.5 text-xs font-extrabold text-zinc-950 shadow-lg transition hover:brightness-105 disabled:opacity-40"
                  >
                    {existingUserReview
                      ? "Update My Rating & Comment"
                      : "Save My Rating & Comment"}
                  </button>
                </form>
              </motion.div>

              {/* ============================================================= */}
              {/* CENTER: ZOOMED & ENLARGED HOLO + FLIP CARD                    */}
              {/* ============================================================= */}
              <motion.div
                initial={{ scale: 0.78, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.78, opacity: 0, y: 24 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                onClick={(e) => e.stopPropagation()}
                className="order-1 lg:order-2 col-span-12 lg:col-span-4 flex flex-col items-center justify-center gap-4"
              >
                {/* Card Action Bar */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCardFlipped((f) => !f)}
                    className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-zinc-950 shadow-lg transition hover:scale-105"
                  >
                    <RotateCw className="size-3.5" />
                    {isCardFlipped ? "Show Holo Front" : "Flip Card for Story"}
                  </button>

                  {character.role === "host" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(activeEvent);
                          setHostCardModalOpen(true);
                        }}
                        className="flex cursor-pointer items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/20 px-3.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/30 transition"
                      >
                        <Pencil className="size-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCropTool(activeEvent.id)}
                        className="flex cursor-pointer items-center gap-1 rounded-full border border-amber-400/70 bg-amber-400/25 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/35 transition"
                        title="Adjust which part gets cropped on the back of this card"
                      >
                        <Crop className="size-3" /> Adjust Crop
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHostDeleteEvent(activeEvent.id)}
                        className="flex cursor-pointer items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </>
                  )}
                </div>

                <FlipCard
                  flipped={isCardFlipped}
                  onFlipChange={(next) => setIsCardFlipped(next)}
                  flipOnClick={false}
                  draggable={false}
                  tilt={!isCardFlipped}
                  tiltMax={12}
                  glare={true}
                  glareOpacity={0.24}
                  width={flipWidth}
                  height={flipHeight}
                  radius={22}
                  background="#18181b"
                  color="#f4f4f5"
                  front={
                    <div
                      onClick={() => setIsCardFlipped(true)}
                      className="relative flex size-full cursor-pointer flex-col items-center justify-between bg-zinc-950 p-3"
                    >
                      <HoloCard
                        image={activeEvent.image}
                        alt={activeEvent.title}
                        preset={activeEvent.holoPreset || "bursts"}
                        intensity={0.9}
                        edgeSparkle={0.85}
                        glare={0.55}
                        idle={true}
                        width={holoWidth}
                        radius={16}
                        shadow={false}
                      />
                      <div className="pointer-events-none absolute right-4 bottom-4 left-4 sm:right-5 sm:bottom-5 sm:left-5 rounded-2xl border border-white/20 bg-black/75 p-3 sm:p-3.5 backdrop-blur-md">
                        <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                          <span>{activeEvent.date}</span>
                          <span>★ {avgRating}</span>
                        </div>
                        <h3 className="mt-0.5 text-sm sm:text-base font-extrabold text-white">
                          {activeEvent.title}
                        </h3>
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-sky-300">
                          <Sparkles className="size-3" /> Click card to flip for
                          cropped photo & quoted story
                        </div>
                      </div>
                    </div>
                  }
                  back={
                    /* BACK OF FLIPPED CARD: Smaller Cut-In-Half Cropped Image + Quoted Paragraph Underneath */
                    <div
                      onClick={() => setIsCardFlipped(false)}
                      className="flex size-full cursor-pointer flex-col justify-between bg-zinc-900 p-5 text-left"
                    >
                      {/* Top Half: Smaller, Cut-In-Half Cropped Image */}
                      <div className="relative h-[46%] w-full overflow-hidden rounded-2xl border border-white/15 shadow-inner">
                        <img
                          src={activeEvent.image}
                          alt={activeEvent.title}
                          style={{ objectPosition: activeEvent.cropPosition || "50% 30%" }}
                          className="size-full object-cover transition-[object-position] duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                          <span className="rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase backdrop-blur-sm">
                            {activeEvent.date}
                          </span>
                          <span className="text-xs font-extrabold text-white drop-shadow">
                            {activeEvent.title}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Half: Paragraph Underneath in Quotes */}
                      <div className="my-auto flex flex-col items-center justify-center px-2 text-center">
                        <Quote className="mb-2 size-5 text-amber-400/60" />
                        <p className="text-sm leading-relaxed font-medium text-zinc-100 italic">
                          “{activeEvent.description}”
                        </p>
                      </div>

                      <div className="border-t border-white/10 pt-2.5 text-center text-[10px] font-semibold text-zinc-400">
                        Click anywhere on card to flip back to Holographic art
                      </div>
                    </div>
                  }
                />
              </motion.div>

              {/* ============================================================= */}
              {/* RIGHT / FLOATING: "PHANTOMS" (SOFT WHITE REVIEW BOXES)        */}
              {/* ============================================================= */}
              <motion.div
                initial={{ opacity: 0, x: 35 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 35 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
                className="order-3 col-span-12 lg:col-span-4 flex flex-col gap-3"
              >
                <div className="px-2">
                  <span className="text-[10px] font-extrabold tracking-widest text-white/70 uppercase">
                    Echoes in the Archive
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    Player Phantoms ({activeEvent.reviews.length})
                  </h4>
                </div>

                <div className="max-h-[420px] space-y-3 overflow-y-auto p-2">
                  {activeEvent.reviews.length === 0 ? (
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-center text-xs text-white/80 shadow-[0_0_25px_rgba(255,255,255,0.08)] backdrop-blur-md">
                      No phantoms yet. Leave the first iconic comment on the
                      left!
                    </div>
                  ) : (
                    activeEvent.reviews.map((rev, index) => (
                      <motion.div
                        key={rev.characterId}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{
                          opacity: 1,
                          y: [0, -4, 0],
                        }}
                        transition={{
                          opacity: { duration: 0.3, delay: index * 0.06 },
                          y: {
                            duration: 3.8 + (index % 3) * 0.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          },
                        }}
                        className="rounded-2xl border border-white/60 bg-white/90 p-4 text-zinc-900 shadow-[0_0_30px_rgba(255,255,255,0.32)] backdrop-blur-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full shrink-0 shadow-sm"
                              style={{
                                background: `linear-gradient(135deg, ${
                                  CHARACTER_CURSOR_THEMES[rev.characterName]?.color ||
                                  roster.find((m) => m.name === rev.characterName)?.color ||
                                  "#ffb347"
                                }, ${
                                  CHARACTER_CURSOR_THEMES[rev.characterName]?.secondaryColor ||
                                  roster.find((m) => m.name === rev.characterName)?.secondaryColor ||
                                  "#78350f"
                                })`,
                              }}
                            />
                            <span className="text-xs font-extrabold tracking-tight text-zinc-900">
                              {rev.characterName}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }, (_, idx) => (
                              <Star
                                key={idx}
                                className={`size-3.5 ${
                                  idx < rev.rating
                                    ? "fill-amber-500 text-amber-500"
                                    : "text-zinc-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-zinc-800 italic">
                          “{rev.comment}”
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* HOST MODAL 1: ADD / EDIT CARD                                       */}
      {/* =================================================================== */}
      <AnimatePresence>
        {hostCardModalOpen && character.role === "host" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setHostCardModalOpen(false)}
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleHostSaveEvent}
              className="w-full max-w-md space-y-4 rounded-3xl border border-white/15 bg-zinc-900 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-base font-bold text-white">
                  {editingEvent.id
                    ? "Edit Card (Host)"
                    : "Add New Card to DriftWall"}
                </h2>
                <button
                  type="button"
                  onClick={() => setHostCardModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="mb-1 block text-zinc-300">Card Title *</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.title || ""}
                    onChange={(e) =>
                      setEditingEvent((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-zinc-300">Date / Era</label>
                    <input
                      type="text"
                      value={editingEvent.date || ""}
                      onChange={(e) =>
                        setEditingEvent((p) => ({ ...p, date: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-zinc-300">
                      Holo Foil Style
                    </label>
                    <select
                      value={editingEvent.holoPreset || "bursts"}
                      onChange={(e) =>
                        setEditingEvent((p) => ({
                          ...p,
                          holoPreset: e.target
                            .value as PartyEventItem["holoPreset"],
                        }))
                      }
                      className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-white"
                    >
                      {[
                        "bursts",
                        "stars",
                        "shards",
                        "cosmos",
                        "rainbow",
                        "swirl",
                        "glitter",
                        "gold",
                      ].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-zinc-300">
                    Quoted Paragraph (Shown under cropped image when flipped)
                  </label>
                  <textarea
                    rows={3}
                    value={editingEvent.description || ""}
                    onChange={(e) =>
                      setEditingEvent((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-zinc-300">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={editingEvent.image || ""}
                    onChange={(e) =>
                      setEditingEvent((p) => ({ ...p, image: e.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-zinc-300">
                    <Upload className="size-3.5" /> Or Upload Photo From Desktop
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-zinc-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHostCardModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-zinc-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300"
                >
                  Save to DriftWall
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* HOST MODAL 2: EASY CODE & PLAYER NAME MANAGER (No Code Needed!)     */}
      {/* =================================================================== */}
      <AnimatePresence>
        {hostRosterModalOpen && character.role === "host" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setHostRosterModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl space-y-4 rounded-3xl border border-white/15 bg-zinc-900 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Manage Player Login Codes & Names
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Edit any code or name below, or generate a new one—saved
                    instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHostRosterModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {roster.map((member, i) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-2 text-xs"
                  >
                    <div className="col-span-5 flex items-center gap-2">
                      <span
                        className="size-3.5 rounded-full shrink-0 border border-white/20 shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${
                            CHARACTER_CURSOR_THEMES[member.name]?.color || member.color
                          }, ${
                            CHARACTER_CURSOR_THEMES[member.name]?.secondaryColor ||
                            member.secondaryColor ||
                            member.color
                          })`,
                        }}
                        title={`${member.name}'s dual aura`}
                      />
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const copy = [...roster];
                          copy[i] = { ...member, name: e.target.value };
                          setRoster(copy);
                        }}
                        onBlur={() => handleSaveRoster(roster)}
                        className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 font-semibold text-white"
                        placeholder="Player Name"
                      />
                    </div>
                    <input
                      type="text"
                      value={member.code}
                      onChange={(e) => {
                        const copy = [...roster];
                        copy[i] = {
                          ...member,
                          code: e.target.value.toUpperCase(),
                        };
                        setRoster(copy);
                      }}
                      onBlur={() => handleSaveRoster(roster)}
                      className="col-span-5 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 font-mono text-amber-300 uppercase"
                      placeholder="SECRET-CODE"
                    />
                    <div className="col-span-2 flex justify-end">
                      {member.role === "host" ? (
                        <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          HOST
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleSaveRoster(
                              roster.filter((r) => r.id !== member.id)
                            )
                          }
                          className="cursor-pointer rounded p-1 text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate New Player Code Form */}
              <form
                onSubmit={handleAddPlayerCode}
                className="grid grid-cols-12 gap-2 border-t border-white/10 pt-3 text-xs"
              >
                <input
                  type="text"
                  required
                  placeholder="New Player Name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="col-span-5 rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="New Code (e.g. WOLF-07)"
                  value={newPlayerCode}
                  onChange={(e) => setNewPlayerCode(e.target.value)}
                  className="col-span-4 rounded-xl border border-white/15 bg-black/60 px-3 py-2 font-mono text-white uppercase"
                />
                <button
                  type="submit"
                  className="col-span-3 cursor-pointer rounded-xl bg-amber-400 font-bold text-zinc-950 hover:bg-amber-300"
                >
                  + Add Code
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* HOST MODAL 3: COMPLETE DATABASE LEDGER OF ALL RATINGS & COMMENTS    */}
      {/* =================================================================== */}
      <AnimatePresence>
        {hostDbModalOpen && character.role === "host" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setHostDbModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl space-y-4 rounded-3xl border border-white/15 bg-zinc-900 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Website Ratings & Comments Database
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Complete overview of what every guest rated and commented.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHostDbModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="max-h-96 space-y-3 overflow-y-auto pr-1 text-xs">
                {events.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-2xl border border-white/10 bg-black/40 p-3.5"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-white">
                        {card.title} ({card.date})
                      </span>
                      <span className="text-amber-300">
                        {card.reviews.length} Reviews
                      </span>
                    </div>
                    {card.reviews.length === 0 ? (
                      <p className="pt-2 text-zinc-500">No ratings yet.</p>
                    ) : (
                      <div className="mt-2 space-y-1.5">
                        {card.reviews.map((r) => (
                          <div
                            key={r.characterId}
                            className="flex items-center justify-between rounded-lg bg-zinc-900/90 px-3 py-1.5"
                          >
                            <span className="font-semibold text-white">
                              {r.characterName}
                            </span>
                            <span className="italic text-zinc-300">
                              “{r.comment}”
                            </span>
                            <span className="font-bold text-amber-400">
                              {"★".repeat(r.rating)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* DISPLAY ALL CARDS: BATCH EDIT ALL CARDS & CREATE NEW CARDS          */}
      {/* =================================================================== */}
      <AnimatePresence>
        {controlCenterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-2xl text-white overflow-hidden"
          >
            {/* Display All Top Bar */}
            <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/95 px-4 sm:px-8 py-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl border border-amber-400/50 bg-amber-400/20 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                  <LayoutGrid className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                      Display All Cards — Host Master Editor
                    </h2>
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                      {batchEvents.length} Cards
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 hidden sm:block">
                    All cards present simultaneously in one big editable screen. Edit any field directly without having to zoom into individual cards.
                  </p>
                </div>
              </div>

              {/* Center Search Input */}
              <div className="relative w-full sm:w-64 order-3 sm:order-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  placeholder="Filter cards by title, era, or lore..."
                  className="w-full rounded-full border border-white/15 bg-black/60 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Action Buttons & View Mode Toggle */}
              <div className="flex items-center gap-2 order-2 sm:order-3 ml-auto sm:ml-0">
                {/* View Mode Toggle: Grid vs List */}
                <div className="flex items-center rounded-full border border-white/15 bg-black/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setDisplayViewMode("grid")}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                      displayViewMode === "grid"
                        ? "bg-amber-400 text-zinc-950 shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    title="Grid View (Multiple cards on screen)"
                  >
                    <Grid className="size-3.5" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayViewMode("list")}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                      displayViewMode === "list"
                        ? "bg-amber-400 text-zinc-950 shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    title="List View (Full-width rows)"
                  >
                    <List className="size-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCreateCardInBatch}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition"
                >
                  <Plus className="size-3.5" />
                  <span className="hidden sm:inline">New Card</span>
                </button>

                <button
                  type="button"
                  disabled={batchSaveStatus === "saving"}
                  onClick={handleSaveBatchEvents}
                  className="group relative flex cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full border border-amber-400/60 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-[0_0_15px_rgba(251,191,36,0.35)] transition hover:scale-105 active:scale-98 disabled:opacity-60"
                >
                  {batchSaveStatus === "saving" ? (
                    <>
                      <RotateCw className="size-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" />
                      <span>Save All</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setControlCenterOpen(false)}
                  className="flex size-8 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                  title="Close Display All View"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            {/* Scrollable Batch Cards Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              <div
                className={
                  displayViewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                    : "space-y-4"
                }
              >
                {batchEvents
                  .map((card, originalIndex) => ({ card, originalIndex }))
                  .filter(({ card }) => {
                    if (!batchSearchQuery.trim()) return true;
                    const q = batchSearchQuery.toLowerCase();
                    return (
                      card.title.toLowerCase().includes(q) ||
                      card.date.toLowerCase().includes(q) ||
                      card.description.toLowerCase().includes(q)
                    );
                  })
                  .map(({ card, originalIndex }) => (
                    <div
                      key={card.id}
                      className="relative rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 shadow-lg backdrop-blur-md transition hover:border-amber-400/50 flex flex-col justify-between"
                    >
                      <div className="space-y-3.5">
                        {/* Card Header Row with Reorder & Actions */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-md bg-amber-400/25 text-xs font-black text-amber-300">
                              #{originalIndex + 1}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={originalIndex === 0}
                                onClick={() =>
                                  handleMoveCardInBatch(originalIndex, "up")
                                }
                                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-25"
                                title="Move Up on DriftWall"
                              >
                                <ChevronUp className="size-4" />
                              </button>
                              <button
                                type="button"
                                disabled={
                                  originalIndex === batchEvents.length - 1
                                }
                                onClick={() =>
                                  handleMoveCardInBatch(originalIndex, "down")
                                }
                                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-25"
                                title="Move Down on DriftWall"
                              >
                                <ChevronDown className="size-4" />
                              </button>
                            </div>
                            {card.reviews && card.reviews.length > 0 && (
                              <span className="ml-1 text-[10px] text-zinc-400">
                                ★{" "}
                                {(
                                  card.reviews.reduce(
                                    (a, b) => a + b.rating,
                                    0
                                  ) / card.reviews.length
                                ).toFixed(1)}{" "}
                                ({card.reviews.length})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDuplicateCardInBatch(card)}
                              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
                              title="Duplicate Card"
                            >
                              <Copy className="size-3" />
                              <span className="hidden sm:inline">Duplicate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteCardFromBatch(card.id)
                              }
                              className="flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                              title="Delete Card"
                            >
                              <Trash2 className="size-3" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Dual Photo Showcase: Full Front Holo + Cropped Back Banner Preview */}
                        <div className="grid grid-cols-2 gap-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
                          {/* Left: Full Front Portrait */}
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-between w-full text-[9px] uppercase font-bold text-zinc-400">
                              <span>Front Holo</span>
                              <span className="text-amber-300 font-mono">
                                {card.holoPreset || "bursts"}
                              </span>
                            </div>
                            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/15 bg-black/50 shadow-inner">
                              <img
                                src={card.image}
                                alt={card.title}
                                className="size-full object-cover"
                              />
                            </div>
                            {/* Quick Photo Upload Button */}
                            <label className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-white/10 bg-zinc-800/90 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 transition">
                              <Upload className="size-3" />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleBatchCardFileUpload(card.id, e)
                                }
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Right: Cropped Back Banner Preview + Adjust Crop Tool */}
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-between w-full text-[9px] uppercase font-bold text-amber-300">
                              <span>Flipped Crop</span>
                              <span className="text-zinc-400 font-mono">
                                {card.cropPosition || "50% 30%"}
                              </span>
                            </div>
                            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-amber-400/40 bg-zinc-900 shadow-inner flex flex-col justify-between p-1.5">
                              {/* Exact Cropped Slice Banner */}
                              <div className="relative h-[55%] w-full overflow-hidden rounded border border-white/20">
                                <img
                                  src={card.image}
                                  alt="Cropped banner"
                                  style={{
                                    objectPosition:
                                      card.cropPosition || "50% 30%",
                                  }}
                                  className="size-full object-cover transition-all"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                              </div>

                              {/* Story lore text slice */}
                              <div className="text-[8px] italic leading-tight text-zinc-300 text-center line-clamp-3 px-1 my-auto">
                                “{card.description || "Story description..."}”
                              </div>
                            </div>

                            {/* Adjust Crop Tool Trigger */}
                            <button
                              type="button"
                              onClick={() => handleOpenCropTool(card.id)}
                              className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-amber-400/50 bg-amber-400/15 py-1 text-[11px] font-bold text-amber-300 shadow hover:bg-amber-400/25 active:scale-98 transition"
                              title="Open visual crop tool for this card"
                            >
                              <Crop className="size-3" />
                              <span>Adjust Crop</span>
                            </button>
                          </div>
                        </div>

                        {/* Form Inputs: Title & Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                              Card Title
                            </label>
                            <input
                              type="text"
                              value={card.title}
                              onChange={(e) =>
                                handleUpdateCardField(
                                  card.id,
                                  "title",
                                  e.target.value
                                )
                              }
                              placeholder="Card Title"
                              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-400 transition"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                              Date / Era
                            </label>
                            <input
                              type="text"
                              value={card.date}
                              onChange={(e) =>
                                handleUpdateCardField(
                                  card.id,
                                  "date",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. Era 2024"
                              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-amber-300 font-mono outline-none focus:border-amber-400 transition"
                            />
                          </div>
                        </div>

                        {/* Holo Foil Preset Selector */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                            Holographic Foil Preset
                          </label>
                          <select
                            value={card.holoPreset || "bursts"}
                            onChange={(e) =>
                              handleUpdateCardField(
                                card.id,
                                "holoPreset",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-amber-300 outline-none focus:border-amber-400"
                          >
                            <option value="bursts">Foil: Bursts</option>
                            <option value="stars">Foil: Starlight</option>
                            <option value="shards">Foil: Crystal Shards</option>
                            <option value="cosmos">Foil: Cosmic Nebula</option>
                            <option value="rainbow">Foil: Rainbow Prism</option>
                            <option value="swirl">Foil: Astral Swirl</option>
                            <option value="glitter">Foil: Diamond Glitter</option>
                            <option value="gold">Foil: Imperial Gold</option>
                          </select>
                        </div>

                        {/* Image URL Input */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                            Image URL
                          </label>
                          <input
                            type="text"
                            value={card.image}
                            onChange={(e) =>
                              handleUpdateCardField(
                                card.id,
                                "image",
                                e.target.value
                              )
                            }
                            placeholder="https://..."
                            className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-amber-400 transition"
                          />
                        </div>

                        {/* Description / Story Lore */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                            Quoted Story / Lore (Shown Under Cropped Image)
                          </label>
                          <textarea
                            rows={3}
                            value={card.description}
                            onChange={(e) =>
                              handleUpdateCardField(
                                card.id,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Write the iconic story or memory for this card..."
                            className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs leading-relaxed text-zinc-200 outline-none focus:border-amber-400 resize-y transition"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Sticky Bottom Status & Action Bar */}
            <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 bg-zinc-950/95 px-4 sm:px-8 py-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-3 text-xs">
                {batchSaveStatus === "saved" && (
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {batchSaveMessage || "All cards saved to database!"}
                  </span>
                )}
                {batchSaveStatus === "error" && (
                  <span className="flex items-center gap-1.5 font-bold text-rose-400">
                    <AlertCircle className="size-4 shrink-0" />
                    {batchSaveMessage || "Failed to batch save."}
                  </span>
                )}
                {batchSaveStatus === "idle" && (
                  <span className="text-zinc-400 hidden sm:inline">
                    {batchEvents.length} cards in archive. Click Save All Changes to persist edits to database.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={handleCreateCardInBatch}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-zinc-800/80 hover:bg-zinc-700 px-4 py-2 text-xs font-semibold text-white transition"
                >
                  <Plus className="size-3.5" />
                  Add Card
                </button>

                <button
                  type="button"
                  disabled={batchSaveStatus === "saving"}
                  onClick={handleSaveBatchEvents}
                  className="group relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-amber-400/60 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 px-6 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.4)] transition hover:scale-105 active:scale-98 disabled:opacity-60"
                >
                  {batchSaveStatus === "saving" ? (
                    <>
                      <RotateCw className="size-3.5 animate-spin" />
                      <span>Saving Batch...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      <span>Save All Changes ({batchEvents.length})</span>
                    </>
                  )}
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* INTERACTIVE CROP TOOL MODAL                                         */}
      {/* =================================================================== */}
      <AnimatePresence>
        {cropModalOpen && croppingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md"
            onClick={() => setCropModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl rounded-3xl border border-amber-400/40 bg-zinc-950 p-5 sm:p-7 shadow-2xl space-y-5 text-white max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                    <Crop className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Adjust Cropped View — {croppingCard.title}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Click or drag directly on the photo to choose which exact portion appears on the flipped back of this card.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCropModalOpen(false)}
                  className="rounded-full bg-white/5 p-2 text-zinc-400 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Main Workspace: Interactive Crop Photo + Real-Time Live Preview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left 7 cols: Interactive Crop Photo */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      Click or drag inside the photo:
                    </span>
                    <span className="font-mono text-amber-300">
                      Focus: X: {cropX}%, Y: {cropY}%
                    </span>
                  </div>

                  {/* Interactive Crop Image Box */}
                  <div
                    ref={cropContainerRef}
                    onPointerDown={handleCropPointer}
                    onPointerMove={(e) => {
                      if (e.buttons === 1) handleCropPointer(e);
                    }}
                    className="relative cursor-crosshair select-none touch-none aspect-[3/4] max-h-[360px] w-full overflow-hidden rounded-2xl border-2 border-white/20 bg-black shadow-inner"
                  >
                    <img
                      src={croppingCard.image}
                      alt="Crop target"
                      className="size-full object-cover pointer-events-none"
                    />

                    {/* Dark Vignette Overlay outside the crop box */}
                    <div className="pointer-events-none absolute inset-0 bg-black/40" />

                    {/* Glowing Gold Crop Window (representing the ~2:1 back banner) */}
                    <div
                      style={{
                        top: `${Math.max(0, Math.min(62, cropY - 19))}%`,
                        left: `${Math.max(0, Math.min(20, cropX - 40))}%`,
                        width: "80%",
                        height: "38%",
                      }}
                      className="pointer-events-none absolute rounded-xl border-2 border-amber-400 bg-amber-400/15 shadow-[0_0_20px_rgba(251,191,36,0.6)] backdrop-brightness-110 flex items-center justify-center transition-all duration-75"
                    >
                      <Crosshair className="size-6 text-amber-300/80 animate-pulse" />
                      <div className="absolute top-1 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 uppercase">
                        Back of Card Crop Frame
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                      Quick Focus Presets
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Faces / Top", y: 15, x: 50 },
                        { label: "Upper Center", y: 30, x: 50 },
                        { label: "Dead Center", y: 50, x: 50 },
                        { label: "Lower Center", y: 70, x: 50 },
                        { label: "Bottom", y: 85, x: 50 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setCropX(preset.x);
                            setCropY(preset.y);
                          }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            cropY === preset.y
                              ? "bg-amber-400 text-zinc-950 font-bold shadow"
                              : "border border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fine-Tuning Vertical Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Vertical Crop Position (Y):</span>
                      <span className="font-mono text-amber-300">{cropY}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={cropY}
                      onChange={(e) => setCropY(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>0% (Top / Faces)</span>
                      <span>50% (Center)</span>
                      <span>100% (Bottom)</span>
                    </div>
                  </div>
                </div>

                {/* Right 5 cols: Live Real-Time Card Back Preview */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      Live Flipped Card Preview:
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Exact Appearance
                    </span>
                  </div>

                  {/* Miniature Card Back */}
                  <div className="rounded-2xl border border-white/15 bg-zinc-900 p-4 shadow-xl text-left space-y-3">
                    {/* Cropped Image Banner */}
                    <div className="relative aspect-[2.1/1] w-full overflow-hidden rounded-xl border border-white/15 shadow-inner">
                      <img
                        src={croppingCard.image}
                        alt="Preview"
                        style={{ objectPosition: `${cropX}% ${cropY}%` }}
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold text-amber-300 uppercase">
                          {croppingCard.date || "Era"}
                        </span>
                        <span className="text-xs font-bold text-white drop-shadow truncate max-w-[160px]">
                          {croppingCard.title || "Card Title"}
                        </span>
                      </div>
                    </div>

                    {/* Quoted Story Paragraph */}
                    <div className="py-2 text-center">
                      <Quote className="mx-auto mb-1.5 size-4 text-amber-400/60" />
                      <p className="text-xs italic leading-relaxed text-zinc-200 line-clamp-3">
                        “{croppingCard.description || "A newly recorded memory in the party's archive."}”
                      </p>
                    </div>

                    <div className="border-t border-white/10 pt-2 text-center text-[10px] text-zinc-500">
                      This is the exact cropped portion your party guests will see when they flip the card.
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setCropModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 px-5 py-2 text-xs font-bold text-zinc-950 shadow-lg hover:scale-105 active:scale-95 transition"
                >
                  <CheckCircle2 className="size-4" />
                  Apply & Keep Crop
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MOBILE NAVIGATION DRAWER                                            */}
      {/* =================================================================== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/15 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-3 rounded-full shadow-sm shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${currentCursorTheme.color}, ${currentCursorTheme.secondaryColor})`,
                      boxShadow: `0 0 10px ${currentCursorTheme.color}`,
                    }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {character.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {character.title} {character.role === "host" && "· Host"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex size-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {/* Display All Cards */}
                <button
                  type="button"
                  onClick={handleOpenControlCenter}
                  className="w-full flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-400/25 to-amber-500/25 p-3.5 font-bold text-amber-300 shadow-md text-left"
                >
                  <LayoutGrid className="size-5 shrink-0 text-amber-400" />
                  <div>
                    <div className="font-bold text-sm">Display All Cards (Master Editor)</div>
                    <div className="text-[11px] text-amber-200/70 font-normal">
                      Display and edit all cards on one big screen without zooming
                    </div>
                  </div>
                </button>

                {character.role === "host" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEvent({
                          title: "",
                          date: `Era ${new Date().getFullYear()}`,
                          description: "",
                          image: "",
                          holoPreset: "bursts",
                        });
                        setHostCardModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-800/80 p-3.5 font-bold text-white text-left hover:bg-zinc-800"
                    >
                      <Plus className="size-4 shrink-0 text-amber-400" />
                      <span>Add Single Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setHostRosterModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-800/80 p-3.5 font-bold text-white text-left hover:bg-zinc-800"
                    >
                      <Users className="size-4 shrink-0 text-amber-400" />
                      <span>Manage Codes & Names</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setHostDbModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-800/80 p-3.5 font-bold text-white text-left hover:bg-zinc-800"
                    >
                      <Database className="size-4 shrink-0 text-sky-400" />
                      <span>Ratings Database</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-800/80 p-3.5 font-bold text-rose-300 text-left hover:bg-zinc-800"
                >
                  <LogOut className="size-4 shrink-0" />
                  <span>Switch User / Log Out</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </GlowCursor>
  );
}
