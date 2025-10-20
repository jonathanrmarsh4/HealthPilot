import axios from 'axios';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

// API Response from ExerciseDB
interface ExerciseDBAPIResponse {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  description?: string;
  difficulty?: string;
  category?: string;
}

// Our normalized exercise type with constructed gifUrl
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
   * Convert API response to our ExerciseDBExercise format with gifUrl
   */
  private normalizeExercise(apiExercise: ExerciseDBAPIResponse): ExerciseDBExercise {
    // Use our proxy endpoint for images (to include auth headers)
    // ExerciseDB image endpoint uses query params: ?exerciseId={id}&resolution={res}
    const gifUrl = `/api/exercisedb/image?exerciseId=${apiExercise.id}`;
    
    return {
      id: apiExercise.id,
      name: apiExercise.name,
      bodyPart: apiExercise.bodyPart,
      equipment: apiExercise.equipment,
      target: apiExercise.target,
      secondaryMuscles: apiExercise.secondaryMuscles || [],
      instructions: apiExercise.instructions || [],
      gifUrl,
    };
  }

  /**
   * Search for exercises by name (fuzzy matching)
   */
  async searchExercisesByName(exerciseName: string): Promise<ExerciseDBExercise | null> {
    try {
      console.log(`[ExerciseDB] Searching for exercise: "${exerciseName}"`);
      
      // First, get all exercises (cached)
      const allExercises = await this.getAllExercises();
      console.log(`[ExerciseDB] Total exercises in database: ${allExercises.length}`);
      
      // Normalize the search name
      const searchName = exerciseName.toLowerCase().trim();
      
      // Try exact match first
      let match = allExercises.find(ex => ex.name.toLowerCase() === searchName);
      if (match) {
        console.log(`[ExerciseDB] Found exact match: ${match.name}`);
        return match;
      }
      
      // If no exact match, try substring matching (both directions)
      match = allExercises.find(ex => 
        ex.name.toLowerCase().includes(searchName) || 
        searchName.includes(ex.name.toLowerCase())
      );
      if (match) {
        console.log(`[ExerciseDB] Found substring match: ${match.name}`);
        return match;
      }
      
      // Try matching with equipment prefix (e.g., "squats" → "barbell squat" or "bodyweight squat")
      const searchWords = searchName.split(/\s+/);
      const mainWord = searchWords[searchWords.length - 1]; // Get the last word (e.g., "squat" from "barbell squat")
      
      // Look for exercises where the main word appears
      match = allExercises.find(ex => {
        const exName = ex.name.toLowerCase();
        return exName.includes(mainWord) && mainWord.length >= 4; // Require at least 4 chars
      });
      if (match) {
        console.log(`[ExerciseDB] Found main word match: ${match.name}`);
        return match;
      }
      
      // Try partial word matching (any word overlaps)
      match = allExercises.find(ex => {
        const exWords = ex.name.toLowerCase().split(/\s+/);
        return searchWords.some(sw => 
          exWords.some(ew => 
            (ew.includes(sw) || sw.includes(ew)) && sw.length >= 3 // Require at least 3 chars
          )
        );
      });
      
      if (match) {
        console.log(`[ExerciseDB] Found word overlap match: ${match.name}`);
      } else {
        console.log(`[ExerciseDB] No match found for: "${exerciseName}"`);
        // Log some similar exercises for debugging
        const similar = allExercises
          .filter(ex => searchWords.some(word => 
            word.length >= 3 && ex.name.toLowerCase().includes(word)
          ))
          .slice(0, 5)
          .map(ex => ex.name);
        if (similar.length > 0) {
          console.log(`[ExerciseDB] Similar exercises:`, similar);
        }
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
      const response = await axios.get<ExerciseDBAPIResponse>(`${BASE_URL}/exercises/exercise/${id}`, {
        headers: this.getHeaders(),
      });

      const exercise = this.normalizeExercise(response.data);
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
      console.log(`[ExerciseDB] Using cached data (${allExercisesCache.data.length} exercises)`);
      return allExercisesCache.data;
    }

    try {
      console.log(`[ExerciseDB] Fetching exercises from API...`);
      // Note: RapidAPI ExerciseDB returns all exercises at once (no pagination support)
      // BASIC tier has limited exercises (10), higher tiers get full 1,300+ exercises
      const response = await axios.get<ExerciseDBAPIResponse[]>(`${BASE_URL}/exercises`, {
        headers: this.getHeaders(),
      });

      // Normalize the exercises with gifUrl
      const exercises: ExerciseDBExercise[] = response.data.map(ex => this.normalizeExercise(ex));
      console.log(`[ExerciseDB] Successfully fetched ${exercises.length} exercises`);
      
      // Update cache
      allExercisesCache.data = exercises;
      allExercisesCache.timestamp = now;
      
      // Also populate individual exercise cache
      exercises.forEach(ex => {
        exerciseCache.set(ex.id, ex);
      });

      return exercises;
    } catch (error: any) {
      console.error('[ExerciseDB] Error fetching all exercises:', error.message);
      if (error.response) {
        console.error('[ExerciseDB] Response status:', error.response.status);
        console.error('[ExerciseDB] Response data:', error.response.data);
      }
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
