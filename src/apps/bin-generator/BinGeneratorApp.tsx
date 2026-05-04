import { Box } from "lucide-react";
import { AppPlaceholder } from "../AppPlaceholder";
import type { GridfinityAppProps } from "../types";

export function BinGeneratorApp({ accent }: GridfinityAppProps) {
  return (
    <AppPlaceholder
      accent={accent}
      icon={Box}
      leftPanelTitle="Bin parameters"
      placeholderTitle="Bin preview"
      rightPanelTitle="Model output"
    />
  );
}
