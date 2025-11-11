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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFitnessProfileForm } from "@/hooks/useFitnessProfileForm";

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

interface FitnessProfileFormProps {
  showHeader?: boolean;
  onBackClick?: () => void;
}

export function FitnessProfileForm({ showHeader = true, onBackClick }: FitnessProfileFormProps) {
  const { form, isLoading, isPending, onSubmit, toggleArrayItem } = useFitnessProfileForm();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {showHeader && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Fitness Profile</h1>
              <p className="text-muted-foreground mt-1">
                Tell us about your training experience and available equipment for personalized workout recommendations
              </p>
            </div>
            {onBackClick && (
              <Button variant="outline" onClick={onBackClick} type="button" data-testid="button-back-training">
                Back to Training
              </Button>
            )}
          </div>
        )}

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
            <FormField
              control={form.control}
              name="fitnessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fitness Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-fitness-level">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner - New to training</SelectItem>
                      <SelectItem value="intermediate">Intermediate - 1-3 years experience</SelectItem>
                      <SelectItem value="advanced">Advanced - 3-5 years experience</SelectItem>
                      <SelectItem value="athlete">Athlete - Competitive level</SelectItem>
                      <SelectItem value="elite">Elite - Professional/Expert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="trainingExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Training</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g., 3"
                        data-testid="input-training-experience"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentTrainingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Training Days/Week</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="7"
                        placeholder="e.g., 4"
                        data-testid="input-training-frequency"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <FormField
              control={form.control}
              name="hasGymAccess"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-gym-access"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      I have gym access
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("hasGymAccess") && (
              <FormField
                control={form.control}
                name="gymType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gym Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gym-type">
                          <SelectValue placeholder="Select gym type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="commercial">Commercial Gym</SelectItem>
                        <SelectItem value="crossfit">CrossFit Box</SelectItem>
                        <SelectItem value="powerlifting">Powerlifting Gym</SelectItem>
                        <SelectItem value="boutique">Boutique Studio</SelectItem>
                        <SelectItem value="home">Home Gym</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Separator />

            <FormField
              control={form.control}
              name="homeEquipment"
              render={() => (
                <FormItem>
                  <FormLabel>Home Equipment</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {HOME_EQUIPMENT_OPTIONS.map((equipment) => (
                      <div key={equipment} className="flex items-center space-x-2">
                        <Checkbox
                          id={`home-${equipment}`}
                          checked={form.watch("homeEquipment").includes(equipment)}
                          onCheckedChange={() => toggleArrayItem("homeEquipment", equipment)}
                          data-testid={`checkbox-home-${equipment.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <Label htmlFor={`home-${equipment}`} className="cursor-pointer text-sm">
                          {equipment}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="specialFacilities"
              render={() => (
                <FormItem>
                  <FormLabel>Special Facilities</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIAL_FACILITIES.map((facility) => (
                      <div key={facility} className="flex items-center space-x-2">
                        <Checkbox
                          id={`facility-${facility}`}
                          checked={form.watch("specialFacilities").includes(facility)}
                          onCheckedChange={() => toggleArrayItem("specialFacilities", facility)}
                          data-testid={`checkbox-facility-${facility.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <Label htmlFor={`facility-${facility}`} className="cursor-pointer text-sm">
                          {facility}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="recoveryEquipment"
              render={() => (
                <FormItem>
                  <FormLabel>Recovery Equipment</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {RECOVERY_EQUIPMENT.map((equipment) => (
                      <div key={equipment} className="flex items-center space-x-2">
                        <Checkbox
                          id={`recovery-${equipment}`}
                          checked={form.watch("recoveryEquipment").includes(equipment)}
                          onCheckedChange={() => toggleArrayItem("recoveryEquipment", equipment)}
                          data-testid={`checkbox-recovery-${equipment.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <Label htmlFor={`recovery-${equipment}`} className="cursor-pointer text-sm">
                          {equipment}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="primaryGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Goal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-primary-goal">
                        <SelectValue placeholder="Select your main goal" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredWorkoutTypes"
              render={() => (
                <FormItem>
                  <FormLabel>Preferred Workout Types</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {WORKOUT_TYPES.map((type) => (
                      <Badge
                        key={type}
                        variant={form.watch("preferredWorkoutTypes").includes(type) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleArrayItem("preferredWorkoutTypes", type)}
                        data-testid={`badge-workout-${type.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preferredDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Workout Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="15"
                        max="180"
                        placeholder="e.g., 60"
                        data-testid="input-preferred-duration"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredIntensity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Intensity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-preferred-intensity">
                          <SelectValue placeholder="Select intensity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <FormField
              control={form.control}
              name="availableDays"
              render={() => (
                <FormItem>
                  <FormLabel>Available Days</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Badge
                        key={day}
                        variant={form.watch("availableDays").includes(day) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleArrayItem("availableDays", day)}
                        data-testid={`badge-day-${day.toLowerCase()}`}
                      >
                        {day}
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="injuries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current or Past Injuries (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Left knee ACL, Lower back"
                      data-testid="input-injuries"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="limitations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement Limitations (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Limited shoulder mobility, No overhead pressing"
                      data-testid="input-limitations"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="medicalConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relevant Medical Conditions (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Asthma, High blood pressure"
                      data-testid="input-medical-conditions"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any other information that would help us create better workouts for you..."
                      rows={4}
                      data-testid="textarea-notes"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={isPending}
            size="lg"
            data-testid="button-save-profile"
          >
            {isPending ? (
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
      </form>
    </Form>
  );
}
