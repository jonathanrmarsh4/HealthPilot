import { FitnessProfileForm } from "@/components/FitnessProfileForm";
import { useLocation } from "wouter";

export default function FitnessProfile() {
  const [, setLocation] = useLocation();

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <FitnessProfileForm 
        showHeader={true} 
        onBackClick={() => setLocation("/training")} 
      />
    </div>
  );
}
