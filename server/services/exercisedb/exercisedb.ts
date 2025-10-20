import axios from 'axios';
import { storage } from '../../storage';

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
   * Now queries from database instead of API
   */
  async searchExercisesByName(exerciseName: string): Promise<ExerciseDBExercise | null> {
    try {
      console.log(`[ExerciseDB] Searching for exercise: "${exerciseName}"`);
      
      // Get all exercises from database
      const dbExercises = await storage.getAllExercisedbExercises();
      console.log(`[ExerciseDB] Total exercises in database: ${dbExercises.length}`);
      
      if (dbExercises.length === 0) {
        console.warn('[ExerciseDB] Database is empty. Please sync exercises first.');
        return null;
      }
      
      // Convert database format to API format with gifUrl
      const allExercises: ExerciseDBExercise[] = dbExercises.map(ex => ({
        id: ex.exerciseId,
        name: ex.name,
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        target: ex.target,
        secondaryMuscles: ex.secondaryMuscles,
        instructions: ex.instructions,
        gifUrl: `/api/exercisedb/image?exerciseId=${ex.exerciseId}`,
      }));
      
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
   * Now queries from database instead of API
   */
  async getExerciseById(id: string): Promise<ExerciseDBExercise | null> {
    try {
      const dbExercise = await storage.getExercisedbExerciseById(id);
      
      if (!dbExercise) {
        console.warn(`[ExerciseDB] Exercise ${id} not found in database`);
        return null;
      }

      // Convert to API format
      return {
        id: dbExercise.exerciseId,
        name: dbExercise.name,
        bodyPart: dbExercise.bodyPart,
        equipment: dbExercise.equipment,
        target: dbExercise.target,
        secondaryMuscles: dbExercise.secondaryMuscles,
        instructions: dbExercise.instructions,
        gifUrl: `/api/exercisedb/image?exerciseId=${dbExercise.exerciseId}`,
      };
    } catch (error) {
      console.error(`Error fetching exercise ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all exercises from database (for database-first approach)
   * This is the new default method used by most of the app
   */
  async getAllExercises(): Promise<ExerciseDBExercise[]> {
    try {
      console.log(`[ExerciseDB] Fetching exercises from database...`);
      
      // Get all exercises from database
      const dbExercises = await storage.getAllExercisedbExercises();
      console.log(`[ExerciseDB] Found ${dbExercises.length} exercises in database`);
      
      // Convert to API format
      const exercises: ExerciseDBExercise[] = dbExercises.map(ex => ({
        id: ex.exerciseId,
        name: ex.name,
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        target: ex.target,
        secondaryMuscles: ex.secondaryMuscles,
        instructions: ex.instructions,
        gifUrl: `/api/exercisedb/image?exerciseId=${ex.exerciseId}`,
      }));

      return exercises;
    } catch (error: any) {
      console.error('[ExerciseDB] Error fetching exercises from database:', error.message);
      return [];
    }
  }

  /**
   * Fetch all exercises from API (used only for syncing)
   * This bypasses the database and goes directly to ExerciseDB API
   */
  private async fetchAllExercisesFromAPI(): Promise<ExerciseDBExercise[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (allExercisesCache.data && (now - allExercisesCache.timestamp) < CACHE_TTL) {
      console.log(`[ExerciseDB API] Using cached data (${allExercisesCache.data.length} exercises)`);
      return allExercisesCache.data;
    }

    try {
      console.log(`[ExerciseDB API] Fetching exercises from API...`);
      // Note: RapidAPI ExerciseDB returns all exercises at once (no pagination support)
      // BASIC tier has limited exercises (10), ULTRA tier gets full 1,300+ exercises
      const response = await axios.get<ExerciseDBAPIResponse[]>(`${BASE_URL}/exercises`, {
        headers: this.getHeaders(),
      });

      // Normalize the exercises with gifUrl
      const exercises: ExerciseDBExercise[] = response.data.map(ex => this.normalizeExercise(ex));
      console.log(`[ExerciseDB API] Successfully fetched ${exercises.length} exercises`);
      
      // Update cache
      allExercisesCache.data = exercises;
      allExercisesCache.timestamp = now;
      
      // Also populate individual exercise cache
      exercises.forEach(ex => {
        exerciseCache.set(ex.id, ex);
      });

      return exercises;
    } catch (error: any) {
      console.error('[ExerciseDB API] Error fetching all exercises:', error.message);
      if (error.response) {
        console.error('[ExerciseDB API] Response status:', error.response.status);
        console.error('[ExerciseDB API] Response data:', error.response.data);
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

  /**
   * Clear the exercise cache (useful after upgrading API tier)
   */
  clearCache(): void {
    console.log('[ExerciseDB] Clearing exercise cache...');
    exerciseCache.clear();
    allExercisesCache.data = null;
    allExercisesCache.timestamp = 0;
    console.log('[ExerciseDB] Cache cleared successfully');
  }

  /**
   * Check if sync is needed and perform auto-sync if necessary
   * Syncs if database is empty OR last sync was more than 30 days ago
   */
  async autoSyncIfNeeded(): Promise<void> {
    try {
      console.log('[ExerciseDB Auto-Sync] Checking if sync is needed...');
      
      // Check current exercise count in database
      const exercises = await storage.getAllExercisedbExercises();
      const latestSync = await storage.getLatestExercisedbSync();
      
      let needsSync = false;
      let reason = '';
      
      // Case 1: Database is empty
      if (exercises.length === 0) {
        needsSync = true;
        reason = 'Database is empty';
      }
      // Case 2: Never synced before
      else if (!latestSync) {
        needsSync = true;
        reason = 'No sync log found';
      }
      // Case 3: Last sync was more than 30 days ago
      else {
        const daysSinceSync = (Date.now() - latestSync.syncedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSync > 30) {
          needsSync = true;
          reason = `Last sync was ${Math.floor(daysSinceSync)} days ago`;
        }
      }
      
      if (needsSync) {
        console.log(`[ExerciseDB Auto-Sync] Sync needed: ${reason}`);
        console.log('[ExerciseDB Auto-Sync] Starting automatic sync...');
        
        const result = await this.syncExercisesToDatabase();
        
        if (result.success) {
          console.log(`[ExerciseDB Auto-Sync] ✓ Successfully synced ${result.count} exercises`);
        } else {
          console.error(`[ExerciseDB Auto-Sync] ✗ Sync failed: ${result.error}`);
        }
      } else {
        console.log(`[ExerciseDB Auto-Sync] Sync not needed. Database has ${exercises.length} exercises.`);
        if (latestSync) {
          const daysSinceSync = (Date.now() - latestSync.syncedAt.getTime()) / (1000 * 60 * 60 * 24);
          console.log(`[ExerciseDB Auto-Sync] Last synced ${Math.floor(daysSinceSync)} days ago`);
        }
      }
    } catch (error: any) {
      console.error('[ExerciseDB Auto-Sync] Error during auto-sync check:', error.message);
    }
  }

  /**
   * Sync all exercises from ExerciseDB API to database
   * Returns the number of exercises synced
   */
  async syncExercisesToDatabase(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log('[ExerciseDB Sync] Starting sync from API to database...');
      
      // Fetch all exercises from API (not database)
      const apiExercises = await this.fetchAllExercisesFromAPI();
      
      if (!apiExercises || apiExercises.length === 0) {
        console.error('[ExerciseDB Sync] No exercises fetched from API');
        return { success: false, count: 0, error: 'No exercises fetched from API' };
      }
      
      console.log(`[ExerciseDB Sync] Fetched ${apiExercises.length} exercises from API`);
      
      // Clear existing database entries
      console.log('[ExerciseDB Sync] Clearing existing database entries...');
      await storage.clearExercisedbExercises();
      
      // Convert API format to database insert format
      const dbExercises = apiExercises.map(ex => ({
        exerciseId: ex.id,
        name: ex.name,
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        target: ex.target,
        secondaryMuscles: ex.secondaryMuscles,
        instructions: ex.instructions,
      }));
      
      // Bulk insert to database
      console.log('[ExerciseDB Sync] Inserting exercises to database...');
      await storage.bulkInsertExercisedbExercises(dbExercises);
      
      // Log the sync operation
      await storage.logExercisedbSync({
        exerciseCount: apiExercises.length,
        success: true,
      });
      
      console.log(`[ExerciseDB Sync] Successfully synced ${apiExercises.length} exercises to database`);
      
      return { success: true, count: apiExercises.length };
    } catch (error: any) {
      console.error('[ExerciseDB Sync] Error during sync:', error);
      
      // Log failed sync
      await storage.logExercisedbSync({
        exerciseCount: 0,
        success: false,
        errorMessage: error.message,
      });
      
      return { success: false, count: 0, error: error.message };
    }
  }
}

// Singleton instance
export const exerciseDBService = new ExerciseDBService();
