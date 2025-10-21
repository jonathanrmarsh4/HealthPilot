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
   * Normalize exercise names for better matching
   */
  private normalizeExerciseName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remove common plurals
      .replace(/\s+/g, ' ')
      .replace(/^(.*?)s$/, '$1')  // Remove trailing 's'
      .replace(/pushups?/g, 'push up')
      .replace(/pullups?/g, 'pull up')
      .replace(/situps?/g, 'sit up')
      .replace(/curls?$/g, 'curl')
      .replace(/rows?$/g, 'row')
      .replace(/flyes?$/g, 'fly')
      .replace(/raises?$/g, 'raise')
      .replace(/presses?$/g, 'press')
      .replace(/squats?$/g, 'squat')
      .replace(/lunges?$/g, 'lunge')
      .replace(/dips?$/g, 'dip');
  }

  /**
   * Calculate match score between search term and exercise
   */
  private calculateMatchScore(searchName: string, exercise: ExerciseDBExercise): number {
    const normalized = this.normalizeExerciseName(searchName);
    const exName = this.normalizeExerciseName(exercise.name);
    
    // Exact match
    if (normalized === exName) return 100;
    
    // One contains the other (full substring)
    if (exName.includes(normalized) || normalized.includes(exName)) return 90;
    
    // Split into words for more detailed matching
    const searchWords = normalized.split(/\s+/).filter(w => w.length > 2);
    const exWords = exName.split(/\s+/).filter(w => w.length > 2);
    
    let score = 0;
    
    // Target muscle matching - CRITICAL for correct exercise selection
    // Map common muscle terms in search queries to ExerciseDB target muscle names
    const muscleMap: Record<string, string[]> = {
      'chest': ['pectorals', 'upper pectorals', 'lower pectorals'],
      'back': ['lats', 'upper back', 'lower back', 'spine', 'traps'],
      'shoulder': ['deltoids', 'anterior deltoid', 'posterior deltoid', 'lateral deltoid'],
      'shoulders': ['deltoids', 'anterior deltoid', 'posterior deltoid', 'lateral deltoid'],
      'bicep': ['biceps'],
      'biceps': ['biceps'],
      'tricep': ['triceps'],
      'triceps': ['triceps'],
      'leg': ['quads', 'hamstrings', 'glutes', 'calves'],
      'legs': ['quads', 'hamstrings', 'glutes', 'calves'],
      'quad': ['quads'],
      'quads': ['quads'],
      'hamstring': ['hamstrings'],
      'hamstrings': ['hamstrings'],
      'glute': ['glutes'],
      'glutes': ['glutes'],
      'calf': ['calves'],
      'calves': ['calves'],
      'core': ['abs', 'abdominals'],
      'ab': ['abs', 'abdominals'],
      'abs': ['abs', 'abdominals'],
    };
    
    // Check if search term mentions a specific muscle group
    let targetMuscleBonus = 0;
    for (const word of searchWords) {
      const mappedTargets = muscleMap[word];
      if (mappedTargets) {
        // Check if this exercise targets that muscle group
        const exerciseTarget = exercise.target.toLowerCase();
        const matchesTarget = mappedTargets.some(target => 
          exerciseTarget.includes(target) || target.includes(exerciseTarget)
        );
        
        if (matchesTarget) {
          targetMuscleBonus += 60; // MAJOR bonus for matching target muscle
          console.log(`[ExerciseDB Scoring] Muscle match bonus: "${word}" maps to "${exerciseTarget}" (+60)`);
        } else {
          // Penalize if search specifies a muscle but exercise targets a different one
          targetMuscleBonus -= 30;
          console.log(`[ExerciseDB Scoring] Muscle mismatch penalty: search wants "${word}" but exercise targets "${exerciseTarget}" (-30)`);
        }
        break; // Only consider the first muscle term found
      }
    }
    score += targetMuscleBonus;
    
    // Check for equipment match (CRITICAL for correct exercise variant)
    // Map common equipment variations to database values
    const equipmentMap: Record<string, string> = {
      'barbell': 'barbell',
      'dumbbell': 'dumbbell',
      'dumbell': 'dumbbell', // Common misspelling
      'cable': 'cable',
      'machine': 'machine',
      'band': 'band',
      'bodyweight': 'body weight',
      'kettlebell': 'kettlebell',
      'smith': 'smith machine',
    };
    
    // Extract equipment from search term
    let searchEquipmentType: string | null = null;
    for (const word of searchWords) {
      if (equipmentMap[word]) {
        searchEquipmentType = equipmentMap[word];
        break;
      }
    }
    
    // Use the actual equipment field from the exercise
    const exerciseEquipment = exercise.equipment.toLowerCase().trim();
    
    // Compare search equipment intent vs actual exercise equipment
    if (searchEquipmentType) {
      // Check for equipment match with tolerance for variants
      const exactMatch = exerciseEquipment === searchEquipmentType;
      const partialMatch = !exactMatch && (exerciseEquipment.includes(searchEquipmentType) || searchEquipmentType.includes(exerciseEquipment));
      
      // Detect equipment conflicts: find which specific equipment each uses
      const conflictingEquipment = ['barbell', 'dumbbell', 'kettlebell', 'cable'];
      const searchEquipmentKeyword = conflictingEquipment.find(eq => searchEquipmentType.includes(eq));
      const exerciseEquipmentKeyword = conflictingEquipment.find(eq => exerciseEquipment.includes(eq));
      
      // If both have equipment keywords and they're different, it's a conflict
      const hasConflict = searchEquipmentKeyword && exerciseEquipmentKeyword && searchEquipmentKeyword !== exerciseEquipmentKeyword;
      
      if (exactMatch) {
        score += 50; // Perfect equipment match
      } else if (hasConflict) {
        score -= 100; // Conflicting equipment (e.g., barbell vs dumbbell) = WRONG exercise!
      } else if (partialMatch) {
        score += 30; // Partial match (e.g., "machine" matches "leverage machine")
      } else {
        score -= 50; // Different equipment but not directly conflicting
      }
    } else {
      // Search doesn't specify equipment - slight preference for non-equipment-specific names
      if (exerciseEquipment === 'body weight' || !exerciseEquipment) {
        score += 5; // Slight bonus for bodyweight/generic exercises when no equipment specified
      }
    }
    
    // Check for main exercise type match
    const exerciseTypes = ['press', 'curl', 'row', 'squat', 'deadlift', 'pulldown', 'fly', 'raise', 'extension', 'pullup', 'pushup', 'dip', 'lunge', 'crunch', 'plank'];
    const searchType = searchWords.find(w => exerciseTypes.some(t => w.includes(t) || t.includes(w)));
    const exType = exWords.find(w => exerciseTypes.some(t => w.includes(t) || t.includes(w)));
    
    if (searchType && exType) {
      // Normalize the types for comparison
      const normalizedSearchType = exerciseTypes.find(t => searchType.includes(t) || t.includes(searchType)) || searchType;
      const normalizedExType = exerciseTypes.find(t => exType.includes(t) || t.includes(exType)) || exType;
      
      if (normalizedSearchType === normalizedExType) {
        score += 40; // Main exercise type match is crucial
      } else {
        score -= 10; // Different main exercise type
      }
    }
    
    // Count matching words
    const matchingWords = searchWords.filter(sw => 
      exWords.some(ew => ew === sw || ew.includes(sw) || sw.includes(ew))
    );
    score += matchingWords.length * 15;
    
    // Penalize if too many unmatched words
    const unmatchedSearchWords = searchWords.filter(sw => 
      !exWords.some(ew => ew === sw || ew.includes(sw) || sw.includes(ew))
    );
    score -= unmatchedSearchWords.length * 5;
    
    return score;
  }

  /**
   * Search for exercises by name (improved fuzzy matching)
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
        secondaryMuscles: (ex.secondaryMuscles as string[]) || [],
        instructions: (ex.instructions as string[]) || [],
        gifUrl: `/api/exercisedb/image?exerciseId=${ex.exerciseId}`,
      }));
      
      // Try exact match first (case insensitive)
      const normalizedSearch = this.normalizeExerciseName(exerciseName);
      let exactMatch = allExercises.find(ex => 
        this.normalizeExerciseName(ex.name) === normalizedSearch
      );
      
      if (exactMatch) {
        console.log(`[ExerciseDB] Found exact match: "${exactMatch.name}" for search "${exerciseName}"`);
        return exactMatch;
      }
      
      // Score all exercises and find best match
      const scoredExercises = allExercises
        .map(ex => ({
          exercise: ex,
          score: this.calculateMatchScore(exerciseName, ex)
        }))
        .filter(item => item.score > 15) // Minimum threshold (lowered to 15 to catch edge cases)
        .sort((a, b) => b.score - a.score);
      
      if (scoredExercises.length > 0) {
        const bestMatch = scoredExercises[0];
        console.log(`[ExerciseDB] Best match: "${bestMatch.exercise.name}" (score: ${bestMatch.score}) for search "${exerciseName}"`);
        
        // Log top 3 matches for debugging
        if (scoredExercises.length > 1) {
          console.log(`[ExerciseDB] Other potential matches:`);
          scoredExercises.slice(1, 3).forEach((item, idx) => {
            console.log(`  ${idx + 2}. "${item.exercise.name}" (score: ${item.score})`);
          });
        }
        
        // Only return if score is high enough to be confident
        if (bestMatch.score >= 25) {
          return bestMatch.exercise;
        } else {
          console.warn(`[ExerciseDB] Best match score too low (${bestMatch.score}). Returning null to avoid incorrect GIF.`);
          return null;
        }
      }
      
      console.log(`[ExerciseDB] No suitable match found for: "${exerciseName}"`);
      return null;
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
        secondaryMuscles: (dbExercise.secondaryMuscles as string[]) || [],
        instructions: (dbExercise.instructions as string[]) || [],
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
        secondaryMuscles: (ex.secondaryMuscles as string[]) || [],
        instructions: (ex.instructions as string[]) || [],
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
      
      // Clear the in-memory cache to force a fresh API fetch
      console.log('[ExerciseDB Sync] Clearing in-memory cache to force fresh API fetch...');
      this.clearCache();
      
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
      
      // Log the sync operation (success field is integer: 1 = success, 0 = failed)
      await storage.logExercisedbSync({
        exerciseCount: apiExercises.length,
        success: 1,
      });
      
      console.log(`[ExerciseDB Sync] Successfully synced ${apiExercises.length} exercises to database`);
      
      return { success: true, count: apiExercises.length };
    } catch (error: any) {
      console.error('[ExerciseDB Sync] Error during sync:', error);
      
      // Log failed sync (success field is integer: 1 = success, 0 = failed)
      await storage.logExercisedbSync({
        exerciseCount: 0,
        success: 0,
        errorMessage: error.message,
      });
      
      return { success: false, count: 0, error: error.message };
    }
  }
}

// Singleton instance
export const exerciseDBService = new ExerciseDBService();
