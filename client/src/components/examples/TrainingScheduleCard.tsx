import { TrainingScheduleCard } from "../TrainingScheduleCard";

export default function TrainingScheduleCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-6">
      <TrainingScheduleCard
        day="Monday"
        workoutType="Upper Body Strength"
        duration={45}
        intensity="High"
        exercises={[
          { name: "Bench Press", sets: 4, reps: "8-10" },
          { name: "Pull-ups", sets: 3, reps: "10-12" },
          { name: "Shoulder Press", sets: 3, reps: "10" },
          { name: "Dumbbell Rows", sets: 3, reps: "12" },
        ]}
        completed={true}
      />
      <TrainingScheduleCard
        day="Tuesday"
        workoutType="Cardio & Core"
        duration={30}
        intensity="Moderate"
        exercises={[
          { name: "Running", duration: "20 min" },
          { name: "Planks", sets: 3, reps: "60 sec" },
          { name: "Russian Twists", sets: 3, reps: "20" },
        ]}
      />
      <TrainingScheduleCard
        day="Wednesday"
        workoutType="Lower Body Strength"
        duration={50}
        intensity="High"
        exercises={[
          { name: "Squats", sets: 4, reps: "8-10" },
          { name: "Deadlifts", sets: 3, reps: "8" },
          { name: "Lunges", sets: 3, reps: "12 each" },
          { name: "Leg Press", sets: 3, reps: "12" },
        ]}
      />
    </div>
  );
}
