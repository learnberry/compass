import {
  Activity,
  Apple,
  BedDouble,
  BookOpen,
  Briefcase,
  CakeSlice,
  Camera,
  CheckCircle2,
  Code,
  Coffee,
  Dumbbell,
  Footprints,
  GlassWater,
  GraduationCap,
  HeartPulse,
  Languages,
  Leaf,
  type LucideIcon,
  Moon,
  Music,
  Palette,
  PenLine,
  PiggyBank,
  Rocket,
  Smile,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

/** Curated lucide icon set surfaced in the icon picker. */
export const ICON_NAMES = [
  "Activity",
  "Apple",
  "BedDouble",
  "BookOpen",
  "Briefcase",
  "CakeSlice",
  "Camera",
  "CheckCircle2",
  "Code",
  "Coffee",
  "Dumbbell",
  "Footprints",
  "GlassWater",
  "GraduationCap",
  "HeartPulse",
  "Languages",
  "Leaf",
  "Moon",
  "Music",
  "Palette",
  "PenLine",
  "PiggyBank",
  "Rocket",
  "Smile",
  "Sparkles",
  "Sun",
  "Target",
  "TrendingUp",
  "Users",
  "Wallet",
] as const;

const REGISTRY: Record<string, LucideIcon> = {
  Activity,
  Apple,
  BedDouble,
  BookOpen,
  Briefcase,
  CakeSlice,
  Camera,
  CheckCircle2,
  Code,
  Coffee,
  Dumbbell,
  Footprints,
  GlassWater,
  GraduationCap,
  HeartPulse,
  Languages,
  Leaf,
  Moon,
  Music,
  Palette,
  PenLine,
  PiggyBank,
  Rocket,
  Smile,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
  Wallet,
};

/** Resolve a lucide icon by its string name, falling back to Sparkles. */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (name && name in REGISTRY) return REGISTRY[name];
  return Sparkles;
}

interface IconProps {
  name: string | null | undefined;
  className?: string;
}

/** Render a lucide icon referenced by its string name. */
export function Icon({ name, className }: IconProps) {
  const Cmp = resolveIcon(name);
  return <Cmp className={className} />;
}
