import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

export function LocaleSelector() {
  const { unitSystem, setUnitSystem } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-locale-selector">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Unit System</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={unitSystem} onValueChange={(value) => setUnitSystem(value as "metric" | "imperial")}>
          <DropdownMenuRadioItem value="metric" data-testid="option-metric">
            Metric (kg, cm, °C)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="imperial" data-testid="option-imperial">
            Imperial (lbs, in, °F)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
