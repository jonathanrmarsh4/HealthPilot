import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame, Info } from "lucide-react";

interface MealPlanCardProps {
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  tags?: string[];
}

export function MealPlanCard({
  mealType,
  name,
  description,
  calories,
  protein,
  carbs,
  fat,
  prepTime,
  tags = [],
}: MealPlanCardProps) {
  return (
    <Card data-testid={`card-meal-${mealType.toLowerCase()}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{mealType}</Badge>
              {tags.map((tag) => (
                <Badge key={tag} className="bg-chart-4/10 text-chart-4 border-0">
                  {tag}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-chart-5" />
            <span className="font-mono font-semibold">{calories}</span>
            <span className="text-muted-foreground">kcal</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono font-semibold">{prepTime}</span>
            <span className="text-muted-foreground">min</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Macros</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md bg-chart-1/10 p-2 text-center">
              <div className="text-xs text-muted-foreground">Protein</div>
              <div className="font-mono text-sm font-semibold">{protein}g</div>
            </div>
            <div className="rounded-md bg-chart-2/10 p-2 text-center">
              <div className="text-xs text-muted-foreground">Carbs</div>
              <div className="font-mono text-sm font-semibold">{carbs}g</div>
            </div>
            <div className="rounded-md bg-chart-3/10 p-2 text-center">
              <div className="text-xs text-muted-foreground">Fat</div>
              <div className="font-mono text-sm font-semibold">{fat}g</div>
            </div>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full" 
          size="sm"
          onClick={() => console.log(`View recipe for: ${name}`)}
          data-testid="button-view-recipe"
        >
          <Info className="mr-2 h-4 w-4" />
          View Recipe
        </Button>
      </CardContent>
    </Card>
  );
}
