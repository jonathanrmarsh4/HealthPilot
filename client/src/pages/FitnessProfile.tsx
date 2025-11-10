import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Building2, Target, Dumbbell, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface FitnessProfile {
  fitnessLevel: string;
  trainingExperience: number | null;
  currentTrainingFrequency: number | null;
  hasGymAccess: number;
  gymType: string | null;
  homeEquipment: string[];
  specialFacilities: string[];
  recoveryEquipment: string[];
  primaryGoal: string | null;
  secondaryGoals: string[];
  preferredWorkoutTypes: string[];
  preferredDuration: number | null;
  preferredIntensity: string | null;
  availableDays: string[];
  injuries: string[];
  limitations: string[];
  medicalConditions: string[];
  notes: string | null;
}

const HOME_EQUIPMENT_OPTIONS = [
  "Dumbbells", "Barbell", "Power Rack", "Bench", "Resistance Bands", "Kettlebells",
  "Pull-up Bar", "Rowing Machine", "Treadmill", "Bike", "Jump Rope", "Yoga Mat",
  "Foam Roller", "Medicine Ball", "TRX/Suspension Trainer"
];

const SPECIAL_FACILITIES = [
  "CrossFit Box", "Swimming Pool", "Running Track", "Climbing Gym", "Boxing Gym",
  "Martial Arts Dojo", "Pilates Studio", "Cycling Studio"
];

const RECOVERY_EQUIPMENT = [
  "Sauna", "Cold Plunge", "Ice Bath", "Steam Room", "Infrared Sauna",
  "Massage Therapist", "Foam Roller", "Massage Gun", "Compression Boots",
  "Contrast Therapy", "Cryotherapy Chamber", "Stretching Studio"
];

const WORKOUT_TYPES = [
  "Strength Training", "HIIT", "Cardio", "Yoga", "Pilates", "CrossFit",
  "Powerlifting", "Olympic Lifting", "Bodybuilding", "Calisthenics",
  "Running", "Cycling", "Swimming", "Rowing", "Mobility Work"
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function FitnessProfile() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading } = useQuery<FitnessProfile>({
    queryKey: ["/api/fitness-profile"],
  });

  // Form state
  const [fitnessLevel, setFitnessLevel] = useState("intermediate");
  const [trainingExperience, setTrainingExperience] = useState("");
  const [currentTrainingFrequency, setCurrentTrainingFrequency] = useState("");
  const [hasGymAccess, setHasGymAccess] = useState(false);
  const [gymType, setGymType] = useState("");
  const [homeEquipment, setHomeEquipment] = useState<string[]>([]);
  const [specialFacilities, setSpecialFacilities] = useState<string[]>([]);
  const [recoveryEquipment, setRecoveryEquipment] = useState<string[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>([]);
  const [preferredWorkoutTypes, setPreferredWorkoutTypes] = useState<string[]>([]);
  const [preferredDuration, setPreferredDuration] = useState("");
  const [preferredIntensity, setPreferredIntensity] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [injuries, setInjuries] = useState("");
  const [limitations, setLimitations] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [notes, setNotes] = useState("");

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setFitnessLevel(profile.fitnessLevel || "intermediate");
      setTrainingExperience(profile.trainingExperience?.toString() || "");
      setCurrentTrainingFrequency(profile.currentTrainingFrequency?.toString() || "");
      setHasGymAccess(profile.hasGymAccess === 1);
      setGymType(profile.gymType || "");
      setHomeEquipment(profile.homeEquipment || []);
      setSpecialFacilities(profile.specialFacilities || []);
      setRecoveryEquipment(profile.recoveryEquipment || []);
      setPrimaryGoal(profile.primaryGoal || "");
      setSecondaryGoals(profile.secondaryGoals || []);
      setPreferredWorkoutTypes(profile.preferredWorkoutTypes || []);
      setPreferredDuration(profile.preferredDuration?.toString() || "");
      setPreferredIntensity(profile.preferredIntensity || "");
      setAvailableDays(profile.availableDays || []);
      setInjuries(profile.injuries?.join(", ") || "");
      setLimitations(profile.limitations?.join(", ") || "");
      setMedicalConditions(profile.medicalConditions?.join(", ") || "");
      setNotes(profile.notes || "");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/fitness-profile", {
        fitnessLevel,
        trainingExperience: trainingExperience ? parseInt(trainingExperience) : null,
        currentTrainingFrequency: currentTrainingFrequency ? parseInt(currentTrainingFrequency) : null,
        hasGymAccess: hasGymAccess ? 1 : 0,
        gymType: gymType || null,
        homeEquipment,
        specialFacilities,
        recoveryEquipment,
        primaryGoal: primaryGoal || null,
        secondaryGoals,
        preferredWorkoutTypes,
        preferredDuration: preferredDuration ? parseInt(preferredDuration) : null,
        preferredIntensity: preferredIntensity || null,
        availableDays,
        injuries: injuries ? injuries.split(",").map(i => i.trim()).filter(Boolean) : [],
        limitations: limitations ? limitations.split(",").map(l => l.trim()).filter(Boolean) : [],
        medicalConditions: medicalConditions ? medicalConditions.split(",").map(m => m.trim()).filter(Boolean) : [],
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fitness-profile"] });
      toast({
        title: "Profile saved",
        description: "Your fitness profile has been updated. The AI will now generate personalized workouts based on your preferences.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggleArrayItem = (arr: string[], setter: (arr: string[]) => void, item: string) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fitness Profile</h1>
          <p className="text-muted-foreground mt-1">
            Tell us about your training experience and available equipment for personalized workout recommendations
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/training")} data-testid="button-back-training">
          Back to Training
        </Button>
      </div>

      {/* Fitness Level & Experience */}
      <Card data-testid="card-fitness-level">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Training Level & Experience
          </CardTitle>
          <CardDescription>
            Help us understand your current fitness level and training background
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fitness-level">Fitness Level</Label>
            <Select value={fitnessLevel} onValueChange={setFitnessLevel}>
              <SelectTrigger data-testid="select-fitness-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner - New to training</SelectItem>
                <SelectItem value="intermediate">Intermediate - 1-3 years experience</SelectItem>
                <SelectItem value="advanced">Advanced - 3-5 years experience</SelectItem>
                <SelectItem value="athlete">Athlete - Competitive level</SelectItem>
                <SelectItem value="elite">Elite - Professional/Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="training-experience">Years of Training</Label>
              <Input
                id="training-experience"
                type="number"
                min="0"
                value={trainingExperience}
                onChange={(e) => setTrainingExperience(e.target.value)}
                placeholder="e.g., 3"
                data-testid="input-training-experience"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training-frequency">Current Training Days/Week</Label>
              <Input
                id="training-frequency"
                type="number"
                min="0"
                max="7"
                value={currentTrainingFrequency}
                onChange={(e) => setCurrentTrainingFrequency(e.target.value)}
                placeholder="e.g., 4"
                data-testid="input-training-frequency"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment & Facilities */}
      <Card data-testid="card-equipment">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Equipment & Facilities
          </CardTitle>
          <CardDescription>
            Select all equipment and facilities you have access to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="gym-access"
              checked={hasGymAccess}
              onCheckedChange={(checked) => setHasGymAccess(checked === true)}
              data-testid="checkbox-gym-access"
            />
            <Label htmlFor="gym-access" className="cursor-pointer">
              I have gym access
            </Label>
          </div>

          {hasGymAccess && (
            <div className="space-y-2">
              <Label htmlFor="gym-type">Gym Type</Label>
              <Select value={gymType} onValueChange={setGymType}>
                <SelectTrigger data-testid="select-gym-type">
                  <SelectValue placeholder="Select gym type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial Gym</SelectItem>
                  <SelectItem value="crossfit">CrossFit Box</SelectItem>
                  <SelectItem value="powerlifting">Powerlifting Gym</SelectItem>
                  <SelectItem value="boutique">Boutique Studio</SelectItem>
                  <SelectItem value="home">Home Gym</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label>Home Equipment</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {HOME_EQUIPMENT_OPTIONS.map((equipment) => (
                <div key={equipment} className="flex items-center space-x-2">
                  <Checkbox
                    id={`home-${equipment}`}
                    checked={homeEquipment.includes(equipment)}
                    onCheckedChange={() => toggleArrayItem(homeEquipment, setHomeEquipment, equipment)}
                    data-testid={`checkbox-home-${equipment.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                  <Label htmlFor={`home-${equipment}`} className="cursor-pointer text-sm">
                    {equipment}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Special Facilities</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIAL_FACILITIES.map((facility) => (
                <div key={facility} className="flex items-center space-x-2">
                  <Checkbox
                    id={`facility-${facility}`}
                    checked={specialFacilities.includes(facility)}
                    onCheckedChange={() => toggleArrayItem(specialFacilities, setSpecialFacilities, facility)}
                    data-testid={`checkbox-facility-${facility.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                  <Label htmlFor={`facility-${facility}`} className="cursor-pointer text-sm">
                    {facility}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Recovery Equipment</Label>
            <div className="grid grid-cols-2 gap-2">
              {RECOVERY_EQUIPMENT.map((equipment) => (
                <div key={equipment} className="flex items-center space-x-2">
                  <Checkbox
                    id={`recovery-${equipment}`}
                    checked={recoveryEquipment.includes(equipment)}
                    onCheckedChange={() => toggleArrayItem(recoveryEquipment, setRecoveryEquipment, equipment)}
                    data-testid={`checkbox-recovery-${equipment.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                  <Label htmlFor={`recovery-${equipment}`} className="cursor-pointer text-sm">
                    {equipment}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals & Preferences */}
      <Card data-testid="card-goals">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals & Preferences
          </CardTitle>
          <CardDescription>
            What are you training for?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary-goal">Primary Goal</Label>
            <Select value={primaryGoal} onValueChange={setPrimaryGoal}>
              <SelectTrigger data-testid="select-primary-goal">
                <SelectValue placeholder="Select your main goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strength">Build Strength</SelectItem>
                <SelectItem value="endurance">Improve Endurance</SelectItem>
                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                <SelectItem value="performance">Athletic Performance</SelectItem>
                <SelectItem value="general_fitness">General Fitness</SelectItem>
                <SelectItem value="sport_specific">Sport-Specific Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preferred Workout Types</Label>
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={preferredWorkoutTypes.includes(type) ? "default" : "outline"}
                  className="cursor-pointer hover-elevate"
                  onClick={() => toggleArrayItem(preferredWorkoutTypes, setPreferredWorkoutTypes, type)}
                  data-testid={`badge-workout-${type.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferred-duration">Preferred Workout Duration (minutes)</Label>
              <Input
                id="preferred-duration"
                type="number"
                min="15"
                max="180"
                value={preferredDuration}
                onChange={(e) => setPreferredDuration(e.target.value)}
                placeholder="e.g., 60"
                data-testid="input-preferred-duration"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred-intensity">Preferred Intensity</Label>
              <Select value={preferredIntensity} onValueChange={setPreferredIntensity}>
                <SelectTrigger data-testid="select-preferred-intensity">
                  <SelectValue placeholder="Select intensity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card data-testid="card-schedule">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Training Schedule
          </CardTitle>
          <CardDescription>
            When are you available to train?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Available Days</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <Badge
                key={day}
                variant={availableDays.includes(day) ? "default" : "outline"}
                className="cursor-pointer hover-elevate"
                onClick={() => toggleArrayItem(availableDays, setAvailableDays, day)}
                data-testid={`badge-day-${day.toLowerCase()}`}
              >
                {day}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Considerations */}
      <Card data-testid="card-health">
        <CardHeader>
          <CardTitle>Health Considerations</CardTitle>
          <CardDescription>
            Help us create safe, effective workouts tailored to your needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="injuries">Current or Past Injuries (comma-separated)</Label>
            <Input
              id="injuries"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g., Left knee ACL, Lower back"
              data-testid="input-injuries"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="limitations">Movement Limitations (comma-separated)</Label>
            <Input
              id="limitations"
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
              placeholder="e.g., Limited shoulder mobility, No overhead pressing"
              data-testid="input-limitations"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medical-conditions">Relevant Medical Conditions (comma-separated)</Label>
            <Input
              id="medical-conditions"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              placeholder="e.g., Asthma, High blood pressure"
              data-testid="input-medical-conditions"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other information that would help us create better workouts for you..."
              rows={4}
              data-testid="textarea-notes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          size="lg"
          data-testid="button-save-profile"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
