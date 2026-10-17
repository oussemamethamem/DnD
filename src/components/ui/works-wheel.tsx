"use client";

import * as React from "react";
import { Sparkles, Calendar, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorksWheelReview {
  characterId: string;
  characterName: string;
  characterColor: string;
  rating: number;
  comment: string;
  updatedAt: string;
}

export interface WorksWheelItem {
  id: string;
  title: string;
  date?: string;
  description?: string;
  image: string;
  href?: string;
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
  reviews?: WorksWheelReview[];
}

export interface WorksWheelProps
  extends Omit<React.ComponentPropsWithoutRef<"section">, "children"> {
  items: WorksWheelItem[];
  label?: string;
  action?: string;
  onSelectItem?: (item: WorksWheelItem, index: number) => void;
}

const CARD_H = 0.38;
const CARD_MAX_W = 0.34;
const CARD_RATIO = 1.45;
const STEP = 40;
const DRUM = 2.22;
const LENS = 2.7;
const RING_R = 1.14;
const BOW = 1.82;
const TITLE = 0.11;
const INDEX = 0.035;
const CULL = 1.6;

const WHEEL_UNITS = 900;
const DRAG_UNITS = 420;
const SETTLE = 140;
const EASE = 0.12;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Stage = { w: number; h: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

const bowAt = (drumDeg: number, bow: number) =>
  -bow * (1 - Math.cos(rad(drumDeg)));

function place(
  ringDeg: number,
  drumDeg: number,
  ringR: number,
  drumR: number,
  bow: number,
  m: number
) {
  return (
    `translateX(${m * bowAt(drumDeg, bow)}px)` +
    ` rotateZ(${(1 - m) * ringDeg}deg) translateY(${-(1 - m) * ringR}px)` +
    ` rotateX(${m * drumDeg}deg) translateZ(${m * drumR}px)`
  );
}

export function WorksWheel({
  items,
  label = "Party History",
  action = "Holo & Rate",
  onSelectItem,
  className,
  ...props
}: WorksWheelProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const wheelRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);
  const labelRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLDivElement>(null);

  const turn = React.useRef(0);
  const target = React.useRef(0);
  const [active, setActive] = React.useState(0);
  const [stage, setStage] = React.useState<Stage>({ w: 0, h: 0 });

  const count = items.length;
  const last = Math.max(count - 1, 0);

  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const metrics = React.useMemo(() => {
    const { w, h } = stage;
    const cardW = Math.min(h * CARD_H * CARD_RATIO, w * CARD_MAX_W);
    const cardH = cardW / CARD_RATIO;
    const drumR = cardH * DRUM;
    const ringR = cardH * RING_R;
    const ringScale = count
      ? clamp((((2 * Math.PI * ringR) / count) * 0.82) / (cardW || 1), 0.16, 1)
      : 1;
    return {
      cardW,
      cardH,
      ringR,
      ringScale,
      drumR,
      bow: cardH * BOW,
      depth: cardH * LENS,
      title: cardH * TITLE,
      index: cardH * INDEX,
    };
  }, [stage, count]);

  React.useEffect(() => {
    if (!stage.h) return;
    let frame = 0;
    const { ringR, ringScale, drumR, bow } = metrics;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const gap = target.current - turn.current;
      if (Math.abs(gap) < 0.0005) turn.current = target.current;
      else turn.current += gap * (reduced ? 1 : EASE);

      const t = turn.current;
      const m = clamp(t, 0, 1);
      const pos = Math.max(0, t - 1);

      if (wheelRef.current) {
        wheelRef.current.style.transform = `translateZ(${-m * drumR}px)`;
      }

      for (let i = 0; i < count; i++) {
        const d = i - pos;
        const drumDeg = d * STEP;
        const card = cardRefs.current[i];
        if (card) {
          card.style.transform = place(
            d * (360 / count),
            drumDeg,
            ringR,
            drumR,
            bow,
            m
          );
          card.style.opacity = m > 0.5 && Math.abs(d) > CULL ? "0" : "1";
          card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
        }
        const face = card?.firstElementChild as HTMLElement | null;
        if (face) face.style.transform = `scale(${lerp(ringScale, 1, m)})`;
      }

      if (labelRef.current) labelRef.current.style.opacity = String(1 - m);
      if (titleRef.current) titleRef.current.style.opacity = String(m);
      const near = clamp(Math.round(pos), 0, last);
      setActive((prev) => (prev === near ? prev : near));
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [metrics, stage.h, count, last, reduced]);

  const to = React.useCallback(
    (next: number) => {
      target.current = clamp(next, 0, last + 1);
    },
    [last]
  );

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const next = target.current + event.deltaY / WHEEL_UNITS;
      if (next > 0 && next < last + 1) event.preventDefault();
      to(next);
      window.clearTimeout(settling.current);
      settling.current = window.setTimeout(
        () => to(Math.round(target.current)),
        SETTLE
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(settling.current);
    };
  }, [to, last]);

  const drag = React.useRef<number | null>(null);
  const settling = React.useRef(0);
  const activeItem = items[active];

  return (
    <section
      aria-label={label}
      className={cn(
        "relative h-full min-h-[24rem] w-full overflow-hidden select-none",
        className
      )}
      {...props}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`works-wheel-${active}`}
        className="focus-visible:outline-foreground absolute inset-0 cursor-grab touch-pan-x outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 active:cursor-grabbing"
        style={{ perspective: `${metrics.depth}px` }}
        onPointerDown={(event) => {
          drag.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current === null) return;
          to(target.current + (drag.current - event.clientY) / DRAG_UNITS);
          drag.current = event.clientY;
        }}
        onPointerUp={() => {
          drag.current = null;
          if (target.current > 1) to(Math.round(target.current));
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") to(Math.round(target.current) + 1);
          else if (event.key === "ArrowUp") to(Math.round(target.current) - 1);
          else return;
          event.preventDefault();
        }}
      >
        <div
          ref={wheelRef}
          className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]"
        >
          {items.map((item, i) => {
            const reviews = item.reviews || [];
            const avg =
              reviews.length > 0
                ? (
                    reviews.reduce((a, b) => a + b.rating, 0) / reviews.length
                  ).toFixed(1)
                : null;

            return (
              <div
                key={item.id || `${item.title}-${i}`}
                id={`works-wheel-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem?.(item, i);
                }}
                ref={(node: HTMLDivElement | null) => {
                  cardRefs.current[i] = node;
                }}
                className="group absolute cursor-pointer [backface-visibility:hidden]"
                style={{
                  width: metrics.cardW,
                  height: metrics.cardH,
                  marginLeft: -metrics.cardW / 2,
                  marginTop: -metrics.cardH / 2,
                }}
              >
                <span className="relative block size-full overflow-hidden rounded-2xl border border-white/20 bg-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                  <img
                    src={item.image}
                    alt={item.title}
                    crossOrigin="anonymous"
                    draggable={false}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {item.date && (
                    <span className="pointer-events-none absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[0.68rem] font-semibold text-amber-300 backdrop-blur-md">
                      <Calendar className="size-3"/>
                      {item.date}
                    </span>
                  )}
                  {avg && (
                    <span className="pointer-events-none absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[0.68rem] font-bold text-white backdrop-blur-md">
                      <Star className="size-3 fill-amber-400 text-amber-400"/>
                      {avg}
                    </span>
                  )}
                  {action && (
                    <span className="pointer-events-none absolute right-3 bottom-3 flex translate-y-1 items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[0.7rem] font-bold text-zinc-950 opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
                      <Sparkles className="size-3"/>
                      {action}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={labelRef}
        className="pointer-events-none absolute inset-0 grid place-items-center font-bold tracking-tight text-white drop-shadow-md"
        style={{ fontSize: metrics.title }}
      >
        {label}
      </div>

      <div
        ref={titleRef}
        className="pointer-events-none absolute top-1/2 left-[6%] max-w-[26%] -translate-y-1/2 space-y-2 tracking-tight opacity-0"
      >
        {activeItem?.date && (
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-amber-300 uppercase">
            <Calendar className="size-3.5"/>
            <span>{activeItem.date}</span>
          </div>
        )}
        <div
          className="leading-none font-extrabold text-white drop-shadow"
          style={{ fontSize: metrics.title }}
        >
          {activeItem?.title}
        </div>
        {activeItem?.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-zinc-300">
            {activeItem.description}
          </p>
        )}
      </div>

      <ol
        className="absolute top-[10%] right-[2.5%] max-h-[80%] overflow-y-auto pr-2 text-right leading-[1.75] text-zinc-400"
        style={{ fontSize: Math.max(metrics.index, 11) }}
      >
        {items.map((item, i) => (
          <li key={item.id || `${item.title}-${i}`}>
            <button
              type="button"
              onClick={() => to(i + 1)}
              className={cn(
                "cursor-pointer transition-colors outline-none hover:text-white",
                i === active && "font-bold text-amber-300"
              )}
            >
              {item.date ? `${item.date} — ${item.title}` : item.title}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default WorksWheel;
