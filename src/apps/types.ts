import type { LucideIcon } from "lucide-react";

export type GridfinityAppId =
  | "label-generator"
  | "bin-generator"
  | "grid-generator"
  | "model-viewer";

export type GridfinityAppAccent = "orange" | "green" | "blue";

export type GridfinityAppProps = {
  accent: GridfinityAppAccent;
};

type GridfinityAppBaseConfig = {
  id: GridfinityAppId;
  name: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  accent: GridfinityAppAccent;
};

export type GridfinityReadyAppConfig = GridfinityAppBaseConfig & {
  comingSoon?: false;
  Component: React.ComponentType<GridfinityAppProps>;
};

export type GridfinityUpcomingAppConfig = GridfinityAppBaseConfig & {
  comingSoon: true;
  Component?: never;
};

export type GridfinityAppConfig =
  | GridfinityReadyAppConfig
  | GridfinityUpcomingAppConfig;
