import axios from 'axios';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

export interface ExerciseDBExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  gifUrl: string;
}

// In-memory cache to minimize API calls
const exerciseCache = new Map<string, ExerciseDBExercise>();
const allExercisesCache: { data: ExerciseDBExercise[] | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export class ExerciseDBService {
  private apiKey: string;

  constructor() {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY environment variable is not set');
    }
    this.apiKey = RAPIDAPI_KEY;
  }

  private getHeaders() {
    return {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    };
  }

  /**
   * Search for exercises by name (fuzzy matching)
   */
  async searchExercisesByName(exerciseName: string): Promise<ExerciseDBExercise | null> {
    try {
      // First, get all exercises (cached)
      const allExercises = await this.getAllExercises();
      
      // Normalize the search name
      const searchName = exerciseName.toLowerCase().trim();
      
      // Try exact match first
      let match = allExercises.find(ex => ex.name.toLowerCase() === searchName);
      
      // If no exact match, try fuzzy matching
      if (!match) {
        match = allExercises.find(ex => 
          ex.name.toLowerCase().includes(searchName) || 
          searchName.includes(ex.name.toLowerCase())
        );
      }
      
      // If still no match, try partial word matching
      if (!match) {
        const searchWords = searchName.split(/\s+/);
        match = allExercises.find(ex => {
          const exWords = ex.name.toLowerCase().split(/\s+/);
          return searchWords.some(sw => exWords.some(ew => ew.includes(sw) || sw.includes(ew)));
        });
      }
      
      return match || null;
    } catch (error) {
      console.error('Error searching exercises by name:', error);
      return null;
    }
  }

  /**
   * Get exercise by exact ID
   */
  async getExerciseById(id: string): Promise<ExerciseDBExercise | null> {
    // Check cache first
    if (exerciseCache.has(id)) {
      return exerciseCache.get(id)!;
    }

    try {
      const response = await axios.get(`${BASE_URL}/exercises/exercise/${id}`, {
        headers: this.getHeaders(),
      });

      const exercise: ExerciseDBExercise = response.data;
      exerciseCache.set(id, exercise);
      return exercise;
    } catch (error) {
      console.error(`Error fetching exercise ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all exercises (cached for 24 hours)
   */
  async getAllExercises(): Promise<ExerciseDBExercise[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (allExercisesCache.data && (now - allExercisesCache.timestamp) < CACHE_TTL) {
      return allExercisesCache.data;
    }

    try {
      const response = await axios.get(`${BASE_URL}/exercises`, {
        headers: this.getHeaders(),
        params: {
          limit: 1400, // Get all exercises
        },
      });

      const exercises: ExerciseDBExercise[] = response.data;
      
      // Update cache
      allExercisesCache.data = exercises;
      allExercisesCache.timestamp = now;
      
      // Also populate individual exercise cache
      exercises.forEach(ex => {
        exerciseCache.set(ex.id, ex);
      });

      return exercises;
    } catch (error) {
      console.error('Error fetching all exercises:', error);
      // Return cached data even if expired, rather than failing
      return allExercisesCache.data || [];
    }
  }

  /**
   * Get exercises by body part
   */
  async getExercisesByBodyPart(bodyPart: string): Promise<ExerciseDBExercise[]> {
    try {
      const response = await axios.get(`${BASE_URL}/exercises/bodyPart/${bodyPart}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching exercises for body part ${bodyPart}:`, error);
      return [];
    }
  }

  /**
   * Get exercises by equipment
   */
  async getExercisesByEquipment(equipment: string): Promise<ExerciseDBExercise[]> {
    try {
      const response = await axios.get(`${BASE_URL}/exercises/equipment/${equipment}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching exercises for equipment ${equipment}:`, error);
      return [];
    }
  }

  /**
   * Get exercises by target muscle
   */
  async getExercisesByTarget(target: string): Promise<ExerciseDBExercise[]> {
    try {
      const response = await axios.get(`${BASE_URL}/exercises/target/${target}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching exercises for target ${target}:`, error);
      return [];
    }
  }
}

// Singleton instance
export const exerciseDBService = new ExerciseDBService();
