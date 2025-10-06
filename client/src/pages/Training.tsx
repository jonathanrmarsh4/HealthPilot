import { TrainingScheduleCard } from "@/components/TrainingScheduleCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const mockWorkouts = [
  {
    day: "Monday",
    workoutType: "Upper Body Strength",
    duration: 45,
    intensity: "High" as const,
    exercises: [
      { name: "Bench Press", sets: 4, reps: "8-10" },
      { name: "Pull-ups", sets: 3, reps: "10-12" },
      { name: "Shoulder Press", sets: 3, reps: "10" },
      { name: "Dumbbell Rows", sets: 3, reps: "12" },
    ],
    completed: true,
  },
  {
    day: "Tuesday",
    workoutType: "Cardio & Core",
    duration: 30,
    intensity: "Moderate" as const,
    exercises: [
      { name: "Running", duration: "20 min" },
      { name: "Planks", sets: 3, reps: "60 sec" },
      { name: "Russian Twists", sets: 3, reps: "20" },
    ],
  },
  {
    day: "Wednesday",
    workoutType: "Lower Body Strength",
    duration: 50,
    intensity: "High" as const,
    exercises: [
      { name: "Squats", sets: 4, reps: "8-10" },
      { name: "Deadlifts", sets: 3, reps: "8" },
      { name: "Lunges", sets: 3, reps: "12 each" },
      { name: "Leg Press", sets: 3, reps: "12" },
    ],
  },
  {
    day: "Thursday",
    workoutType: "Active Recovery",
    duration: 30,
    intensity: "Low" as const,
    exercises: [
      { name: "Yoga Flow", duration: "20 min" },
      { name: "Stretching", duration: "10 min" },
    ],
  },
  {
    day: "Friday",
    workoutType: "Full Body Circuit",
    duration: 40,
    intensity: "High" as const,
    exercises: [
      { name: "Burpees", sets: 3, reps: "15" },
      { name: "Kettlebell Swings", sets: 3, reps: "20" },
      { name: "Box Jumps", sets: 3, reps: "12" },
      { name: "Mountain Climbers", sets: 3, reps: "30" },
    ],
  },
  {
    day: "Saturday",
    workoutType: "Outdoor Activity",
    duration: 60,
    intensity: "Moderate" as const,
    exercises: [
      { name: "Hiking", duration: "60 min" },
    ],
  },
];

export default function Training() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Training Schedule</h1>
          <p className="text-muted-foreground mt-2">
            Personalized workout programs based on your fitness level and goals
          </p>
        </div>
        <Button onClick={() => console.log("Generate new training plan")} data-testid="button-generate-training">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate New Schedule
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockWorkouts.map((workout, idx) => (
          <TrainingScheduleCard key={idx} {...workout} />
        ))}
      </div>
    </div>
  );
}
