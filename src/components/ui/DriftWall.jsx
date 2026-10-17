"use strict";
"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import "./DriftWall.css";
import { Sparkles, Star } from "lucide-react";
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const columnFactor = (index, variance) => {
  const pseudo = (index * 0.6180339887 + 0.35) % 1 * 2 - 1;
  return 1 + variance * pseudo;
};
/**
 * @param {{
 *   items?: any[];
 *   columns?: number;
 *   tileWidth?: number;
 *   tileHeight?: number;
 *   gap?: number;
 *   radius?: number;
 *   tilt?: number;
 *   turn?: number;
 *   roll?: number;
 *   perspective?: number;
 *   depth?: number;
 *   speed?: number;
 *   direction?: "up" | "down";
 *   variance?: number;
 *   parallax?: number;
 *   pauseOnHover?: boolean;
 *   lift?: number;
 *   fade?: number;
 *   dim?: number;
 *   grayscale?: boolean;
 *   overlayColor?: string;
 *   className?: string;
 *   style?: any;
 *   onCardClick?: (item: any) => void;
 *   onSelectItem?: (item: any) => void;
 *   holoEnabled?: boolean;
 * }} props
 */
export default function DriftWall({
  items,
  columns = 5,
  tileWidth = 220,
  tileHeight = 152,
  gap = 20,
  radius = 16,
  tilt = 14,
  turn = -12,
  roll = 0,
  perspective = 1200,
  depth = 100,
  speed = 36,
  direction = "up",
  variance = 0.45,
  parallax = 0.5,
  pauseOnHover = false,
  lift = 68,
  fade = 0.65,
  dim = 0.65,
  grayscale = false,
  overlayColor = "#060010",
  className = "",
  style,
  onCardClick,
  onSelectItem,
  holoEnabled = true
}) {
  const containerRef = useRef(null);
  const planeRef = useRef(null);
  const trackRefs = useRef([]);
  const rafRef = useRef(null);
  const offsetsRef = useRef([]);
  const velocitiesRef = useRef([]);
  const hoveredColRef = useRef(-1);
  const wallHoveredRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const pointerDampedRef = useRef({ x: 0, y: 0 });
  const lastTsRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [activeId, setActiveId] = useState(null);
  const activeIdRef = useRef(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const selectedItemIdRef = useRef(null);
  const [reduced, setReduced] = useState(false);
  const safeItems = useMemo(
    () => items && items.length > 0 ? items : [
      {
        id: "fallback-1",
        title: "Archive Milestone",
        date: "Cycle 2026",
        image: "https://picsum.photos/seed/fallback/800/600",
        description: "Welcome to the Party Chronicle DriftWall."
      }
    ],
    [items]
  );
  useEffect(() => {
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const columnItems = useMemo(() => {
    const cols = Array.from({ length: columns }, () => []);
    safeItems.forEach((item, i) => cols[i % columns].push(item));
    return cols.map((col) => col.length ? col : safeItems.slice(0, 1));
  }, [safeItems, columns]);
  const columnMeta = useMemo(() => {
    const unit = tileHeight + gap;
    return columnItems.map((col) => {
      const copyHeight = Math.max(unit, col.length * unit);
      const copies = Math.max(
        2,
        Math.ceil(containerHeight * 1.8 / copyHeight) + 1
      );
      return { copyHeight, copies };
    });
  }, [columnItems, tileHeight, gap, containerHeight]);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height || 600);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const baseVelocities = useMemo(() => {
    const dirSign = direction === "up" ? 1 : -1;
    return columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      return speed * columnFactor(c, variance) * dirSign * altSign;
    });
  }, [columnItems, speed, direction, variance]);
  useEffect(() => {
    offsetsRef.current = columnMeta.map(
      (meta, c) => meta.copyHeight * (c * 0.37 % 1)
    );
    velocitiesRef.current = columnItems.map(() => 0);
  }, [columnMeta, columnItems]);
  const applyPlaneTransform = useCallback(
    (px, py) => {
      const plane = planeRef.current;
      if (!plane) return;
      plane.style.transform = `translate(-50%, -50%) scale(1.18) rotateX(${tilt + py}deg) rotateY(${turn + px}deg) rotateZ(${roll}deg) translateZ(${-depth}px)`;
    },
    [tilt, turn, roll, depth]
  );
  useEffect(() => {
    const animate = (ts) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1e3);
      lastTsRef.current = ts;
      const maxTilt = parallax * 8;
      const targetX = pointerRef.current.x * maxTilt;
      const targetY = -pointerRef.current.y * maxTilt;
      const damp = 1 - Math.exp(-dt / 0.12);
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damp;
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damp;
      applyPlaneTransform(
        pointerDampedRef.current.x,
        pointerDampedRef.current.y
      );
      if (!reduced) {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const meta = columnMeta[c];
          if (!meta) continue;
          const paused = wallHoveredRef.current && pauseOnHover;
          const factor = paused || hoveredColRef.current === c ? 0 : 1;
          const target = baseVelocities[c] * factor;
          const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
          velocitiesRef.current[c] += (target - velocitiesRef.current[c]) * ease;
          let next = (offsetsRef.current[c] ?? 0) + velocitiesRef.current[c] * dt;
          next = (next % meta.copyHeight + meta.copyHeight) % meta.copyHeight;
          offsetsRef.current[c] = next;
          const el = trackRefs.current[c];
          if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`;
        }
      } else {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const el = trackRefs.current[c];
          const meta = columnMeta[c];
          if (el && meta)
            el.style.transform = `translate3d(0, ${-(offsetsRef.current[c] ?? 0)}px, 0)`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [
    baseVelocities,
    columnMeta,
    pauseOnHover,
    parallax,
    reduced,
    applyPlaneTransform
  ]);
  const activate = useCallback((id, index) => {
    activeIdRef.current = id;
    hoveredColRef.current = index;
    setActiveId(id);
  }, []);
  const release = useCallback(() => {
    activeIdRef.current = null;
    hoveredColRef.current = -1;
    setActiveId(null);
  }, []);
  const handlePointerMove = useCallback(
    (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (parallax > 0 && !reduced) {
        pointerRef.current = {
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5
        };
      }
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const tile = hit && hit.closest("[data-tile-id]");
      if (!tile) return;
      const id = tile.dataset.tileId;
      if (!id || id === activeIdRef.current) return;
      activeIdRef.current = id;
      hoveredColRef.current = Number(tile.dataset.col);
      setActiveId(id);
    },
    [parallax, reduced]
  );
  const handlePointerLeaveWall = useCallback(() => {
    wallHoveredRef.current = false;
    pointerRef.current = { x: 0, y: 0 };
    release();
  }, [release]);
  const cssVars = useMemo(
    () => ({
      "--dw-tile-w": `${tileWidth}px`,
      "--dw-tile-h": `${tileHeight}px`,
      "--dw-gap": `${gap}px`,
      "--dw-radius": `${radius}px`,
      "--dw-perspective": `${perspective}px`,
      "--dw-lift": `${lift}px`,
      "--dw-dim": dim,
      "--dw-gray": grayscale ? 1 : 0,
      "--dw-overlay": overlayColor,
      "--dw-edge": `${Math.max(0, (1 - fade) * 100)}%`,
      ...style
    }),
    [
      tileWidth,
      tileHeight,
      gap,
      radius,
      perspective,
      lift,
      dim,
      grayscale,
      overlayColor,
      fade,
      style
    ]
  );
  const renderTile = (item, id, colIndex) => {
    const isSelected = selectedItemId === item.id;
    const avgRating = item.reviews && item.reviews.length > 0 ? (item.reviews.reduce((acc, r) => acc + r.rating, 0) / item.reviews.length).toFixed(1) : null;
    const inner = <span className="drift-wall__inner">
        <img
      src={item.image}
      alt={item.title ?? ""}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
        {
      /* Shiny Holographic Foil Overlay */
    }
        {holoEnabled && item.holoPreset && item.holoPreset !== "none" && (
          <span className="drift-wall__holo" aria-hidden="true" />
        )}
        {holoEnabled && item.holoPreset && item.holoPreset !== "none" && (
          <span className="drift-wall__holo-glimmer" aria-hidden="true" />
        )}
        <span className="drift-wall__overlay" aria-hidden="true" />

        {/* Card info badge */}
        <span className="drift-wall__badge">
          <span className="drift-wall__badge-title">{item.title}</span>
          <span className="drift-wall__badge-meta">
            {isSelected ? (
              <span className="flex items-center gap-1 font-bold text-amber-300 animate-pulse">
                <Sparkles className="size-2.5 fill-amber-300" />
                Click again to focus
              </span>
            ) : (
              <>
                <span>{item.date || "Archive"}</span>
                {avgRating ? (
                  <span className="flex items-center gap-0.5 text-amber-300">
                    <Star className="size-2.5 fill-amber-300 text-amber-300" />
                    {avgRating}
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-sky-300 opacity-80">
                    <Sparkles className="size-2" />
                    Inspect
                  </span>
                )}
              </>
            )}
          </span>
        </span>
      </span>;

    const handleFocusCard = () => {
      selectedItemIdRef.current = null;
      setSelectedItemId(null);
      if (onSelectItem) onSelectItem(item);
      else if (onCardClick) onCardClick(item);
    };

    const handleTileClick = (e) => {
      e.stopPropagation();
      if (selectedItemIdRef.current === item.id) {
        // Second click on this card -> automatically makes the card the focus!
        handleFocusCard();
      } else {
        // First click -> select and highlight card on the wall
        selectedItemIdRef.current = item.id;
        setSelectedItemId(item.id);
        activate(id, colIndex);
      }
    };

    const handleTileDoubleClick = (e) => {
      e.stopPropagation();
      handleFocusCard();
    };

    return (
      <div
        key={id}
        tabIndex={0}
        role="button"
        aria-label={item.title ?? "Milestone card"}
        className={`drift-wall__tile${activeId === id ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}
        data-tile-id={id}
        data-col={colIndex}
        onFocus={() => activate(id, colIndex)}
        onBlur={() => {
          if (selectedItemIdRef.current !== item.id) {
            release();
          }
        }}
        onClick={handleTileClick}
        onDoubleClick={handleTileDoubleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleTileClick(e);
          }
        }}
      >
        {inner}
      </div>
    );
  };

  const handleWallClick = (e) => {
    if (!e.target.closest("[data-tile-id]")) {
      selectedItemIdRef.current = null;
      setSelectedItemId(null);
    }
  };

  const rootClass = [
    "drift-wall",
    reduced ? "drift-wall--reduced" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      className={rootClass}
      style={cssVars}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => {
        wallHoveredRef.current = true;
      }}
      onPointerLeave={handlePointerLeaveWall}
      onClick={handleWallClick}
      role="region"
      aria-label="Party Chronicle DriftWall"
    >
      <div ref={planeRef} className="drift-wall__plane">
        {columnItems.map((col, c) => {
          const meta = columnMeta[c];
          const copies = Array.from({ length: meta.copies });
          return (
            <div className="drift-wall__col" key={`col-${c}`}>
              <div
                className="drift-wall__track"
                ref={(el) => {
                  trackRefs.current[c] = el;
                }}
              >
                {copies.map((_, copyIndex) =>
                  col.map((item, itemIndex) =>
                    renderTile(
                      item,
                      `${c}-${copyIndex}-${itemIndex}-${item.id}`,
                      c
                    )
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
