import { MealPlanCard } from "@/components/MealPlanCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MealPlan } from "@shared/schema";
import { format, isSameDay, parseISO } from "date-fns";

interface WeeklyMealCalendarProps {
  meals: MealPlan[];
  onMealClick?: (meal: MealPlan) => void;
}

interface GroupedMeals {
  [dateKey: string]: {
    date: Date;
    meals: MealPlan[];
  };
}

export function WeeklyMealCalendar({ meals, onMealClick }: WeeklyMealCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group meals by date
  const groupedMeals: GroupedMeals = meals.reduce((acc, meal) => {
    if (!meal.scheduledDate) return acc; // Skip legacy meals without dates
    
    const date = typeof meal.scheduledDate === 'string' 
      ? parseISO(meal.scheduledDate)
      : new Date(meal.scheduledDate);
    
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date,
        meals: []
      };
    }
    
    acc[dateKey].meals.push(meal);
    
    return acc;
  }, {} as GroupedMeals);

  // Sort meals within each day by meal type order
  const mealTypeOrder = { 'Breakfast': 0, 'Lunch': 1, 'Dinner': 2, 'Snack': 3 };
  Object.values(groupedMeals).forEach(day => {
    day.meals.sort((a, b) => {
      const orderA = mealTypeOrder[a.mealType as keyof typeof mealTypeOrder] ?? 999;
      const orderB = mealTypeOrder[b.mealType as keyof typeof mealTypeOrder] ?? 999;
      return orderA - orderB;
    });
  });

  // Sort days chronologically
  const sortedDays = Object.values(groupedMeals).sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );

  if (sortedDays.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="weekly-meal-calendar">
      {sortedDays.map(({ date, meals }) => {
        const isToday = isSameDay(date, today);
        const dateKey = format(date, 'yyyy-MM-dd');
        
        return (
          <Card 
            key={dateKey}
            className={isToday ? "border-primary shadow-md" : ""}
            data-testid={`day-card-${dateKey}`}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-2xl" data-testid={`day-title-${dateKey}`}>
                  {format(date, 'EEEE')}
                </CardTitle>
                <span className="text-muted-foreground text-sm" data-testid={`day-date-${dateKey}`}>
                  {format(date, 'MMMM d, yyyy')}
                </span>
              </div>
              {isToday && (
                <Badge variant="default" data-testid="badge-today">
                  Today
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    className={onMealClick ? "cursor-pointer" : ""}
                    onClick={() => onMealClick?.(meal)}
                    data-testid={`meal-card-${meal.id}`}
                  >
                    <MealPlanCard
                      mealType={meal.mealType as "Breakfast" | "Lunch" | "Dinner" | "Snack"}
                      name={meal.name}
                      description={meal.description || ""}
                      calories={meal.calories}
                      protein={meal.protein}
                      carbs={meal.carbs}
                      fat={meal.fat}
                      prepTime={meal.prepTime}
                      tags={meal.tags || []}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
