import * as React from "react";

declare module "@/components/ui/DriftWall" {
  export interface DriftWallProps {
    items?: any[];
    columns?: number;
    tileWidth?: number;
    tileHeight?: number;
    gap?: number;
    radius?: number;
    tilt?: number;
    turn?: number;
    roll?: number;
    perspective?: number;
    depth?: number;
    speed?: number;
    direction?: "up" | "down";
    variance?: number;
    parallax?: number;
    pauseOnHover?: boolean;
    lift?: number;
    fade?: number;
    dim?: number;
    grayscale?: boolean;
    overlayColor?: string;
    onSelectItem?: (item: any) => void;
    className?: string;
    style?: React.CSSProperties;
  }
  const DriftWall: React.FC<DriftWallProps>;
  export default DriftWall;
}

declare module "@/components/ui/FlipCard" {
  export interface FlipCardProps {
    front?: React.ReactNode;
    back?: React.ReactNode;
    flipped?: boolean;
    defaultFlipped?: boolean;
    onFlipChange?: (flipped: boolean) => void;
    axis?: "y" | "x";
    flipOnClick?: boolean;
    draggable?: boolean;
    dragDistance?: number;
    tilt?: boolean;
    tiltMax?: number;
    glare?: boolean;
    glareOpacity?: number;
    hoverScale?: number;
    perspective?: number;
    stiffness?: number;
    damping?: number;
    width?: number;
    height?: number;
    radius?: number;
    background?: string;
    color?: string;
    shadow?: boolean;
    shadowColor?: string;
    shadowOpacity?: number;
    disabled?: boolean;
    ariaLabel?: string;
    className?: string;
  }
  const FlipCard: React.FC<FlipCardProps>;
  export default FlipCard;
}

declare module "@/components/ui/HoloCard" {
  export type HoloPreset =
    | "none"
    | "bursts"
    | "stars"
    | "shards"
    | "cosmos"
    | "rainbow"
    | "swirl"
    | "glitter"
    | "gold";

  export interface HoloCardProps {
    image: string;
    backImage?: string;
    alt?: string;
    preset?: HoloPreset;
    foilColor?: string;
    intensity?: number;
    scale?: number;
    edgeSparkle?: number;
    frame?: number;
    glare?: number;
    tiltMax?: number;
    hoverScale?: number;
    radius?: number;
    width?: number;
    idle?: boolean;
    shadow?: boolean;
    className?: string;
    style?: React.CSSProperties;
  }
  const HoloCard: React.FC<HoloCardProps>;
  export default HoloCard;
}

declare module "@/components/ui/SideRays" {
  export interface SideRaysProps {
    rayColor1?: string;
    rayColor2?: string;
    blend?: number;
    origin?: string;
    speed?: number;
    intensity?: number;
    spread?: number;
    density?: number;
    sharpness?: number;
    tilt?: number;
    falloff?: number;
    glow?: number;
    saturation?: number;
    dust?: number;
    followMouse?: boolean;
    mouseInfluence?: number;
    intro?: boolean;
    lightMode?: boolean;
    opacity?: number;
    maxDevicePixelRatio?: number;
    className?: string;
    style?: React.CSSProperties;
  }
  const SideRays: React.FC<SideRaysProps>;
  export default SideRays;
}

declare module "@/components/ui/LatticeLoader" {
  export interface LatticeLoaderProps {
    label?: string;
    doneLabel?: string;
    errorLabel?: string;
    status?: "working" | "done" | "error";
    pattern?: string | any;
    grid?: 3 | 4;
    shape?: "square" | "round";
    color?: string;
    doneColor?: string;
    errorColor?: string;
    cellSize?: number;
    gap?: number;
    fontSize?: number;
    step?: number;
    idleOpacity?: number;
    glow?: boolean;
    glowColor?: string;
    showTimer?: boolean;
    elapsed?: number;
    className?: string;
    style?: React.CSSProperties;
  }
  const LatticeLoader: React.FC<LatticeLoaderProps>;
  export default LatticeLoader;
}

declare module "@/components/ui/GlowCursor" {
  export interface GlowCursorProps {
    color?: string;
    secondaryColor?: string;
    intensity?: number;
    trailWidth?: number;
    linger?: number;
    glow?: number;
    hotspot?: number;
    followSpeed?: number;
    grain?: number;
    clickBurst?: boolean;
    quality?: 'low' | 'medium' | 'high';
    theme?: 'dark' | 'light';
    blendMode?: string;
    maxDevicePixelRatio?: number;
    enabled?: boolean;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
  }
  const GlowCursor: React.FC<GlowCursorProps>;
  export default GlowCursor;
}

declare module "@/components/ui/SpecularButton" {
  export interface SpecularButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    radius?: number;
    tint?: string;
    tintOpacity?: number;
    blur?: number;
    textColor?: string;
    lineColor?: string;
    baseColor?: string;
    intensity?: number;
    idleIntensity?: number;
    shineSize?: number;
    shineFade?: number;
    thickness?: number;
    glow?: number;
    speed?: number;
    followMouse?: boolean;
    proximity?: number;
    autoAnimate?: boolean;
    disabled?: boolean;
    onClick?: (e?: any) => void;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    style?: React.CSSProperties;
    [key: string]: any;
  }
  const SpecularButton: React.FC<SpecularButtonProps>;
  export default SpecularButton;
}
