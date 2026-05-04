import { Tag } from "lucide-react";
import { AppPlaceholder } from "../AppPlaceholder";
import type { GridfinityAppProps } from "../types";

export function LabelMakerApp({ accent }: GridfinityAppProps) {
  return (
    <AppPlaceholder
      accent={accent}
      icon={Tag}
      leftPanelTitle="Label settings"
      placeholderTitle="Label canvas"
      rightPanelTitle="Export queue"
    />
  );
}
