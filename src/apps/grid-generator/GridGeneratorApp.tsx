import { Grid3X3 } from "lucide-react";
import { AppPlaceholder } from "../AppPlaceholder";
import type { GridfinityAppProps } from "../types";

export function GridGeneratorApp({ accent }: GridfinityAppProps) {
  return (
    <AppPlaceholder
      accent={accent}
      icon={Grid3X3}
      leftPanelTitle="Grid dimensions"
      placeholderTitle="Grid layout"
      rightPanelTitle="Print plan"
    />
  );
}
