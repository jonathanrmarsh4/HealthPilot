import axios from 'axios';
import { storage } from '../../storage';
import { SCORE_GOOD, SCORE_OK, SCORE_LOW, isConfident } from '../exercises/confidence';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

// Telemetry configuration
const TELEMETRY_SAMPLE_RATE = 0.5; // 50% sampling rate
const TELEMETRY_DAILY_CAP = 500; // Max events per day
let telemetryDailyCount = 0;
let telemetryResetDate = new Date().toDateString();

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
   * Log a media matching attempt to the telemetry system
   * Implements sampling and daily cap to control volume
   */
  private async logMediaAttempt(data: {
    hpExerciseName: string;
    hpExerciseId?: string;
    target?: string;
    bodyPart?: string;
    equipment?: string;
    reason: 'LOW_CONFIDENCE' | 'NO_MATCH' | 'OK' | 'SUPPRESSED';
    externalId?: string;
    chosenId?: string;
    chosenName?: string;
    score?: number;
    candidateCount?: number;
    candidates?: Array<{id: string; name: string; score: number; target: string; bodyPart: string; equipment: string}>;
    userId?: string;
  }): Promise<void> {
    try {
      // Reset daily counter if it's a new day
      const today = new Date().toDateString();
      if (today !== telemetryResetDate) {
        telemetryDailyCount = 0;
        telemetryResetDate = today;
      }

      // Check daily cap
      if (telemetryDailyCount >= TELEMETRY_DAILY_CAP) {
        return; // Silently skip if we've hit the cap
      }

      // Sampling: only apply to SUPPRESSED and LOW_CONFIDENCE to reduce noise
      // NO_MATCH and OK are always logged (subject to daily cap) for complete data coverage
      const shouldSample = data.reason === 'SUPPRESSED' || data.reason === 'LOW_CONFIDENCE';
      if (shouldSample && Math.random() > TELEMETRY_SAMPLE_RATE) {
        return; // Skip this sampled event
      }

      // Log the attempt
      await storage.logMediaAttempt({
        userId: data.userId || null,
        hpExerciseId: data.hpExerciseId || null,
        hpExerciseName: data.hpExerciseName,
        target: data.target || null,
        bodyPart: data.bodyPart || null,
        equipment: data.equipment || null,
        reason: data.reason,
        externalId: data.externalId || null,
        chosenId: data.chosenId || null,
        chosenName: data.chosenName || null,
        score: data.score || null,
        candidateCount: data.candidateCount || 0,
        candidates: data.candidates || null,
        reviewStatus: 'pending',
      });

      telemetryDailyCount++;
      console.log(`[Telemetry] Logged media attempt: ${data.reason} for "${data.hpExerciseName}" (count: ${telemetryDailyCount}/${TELEMETRY_DAILY_CAP})`);
    } catch (error) {
      // Never fail the main operation due to telemetry errors
      console.error('[Telemetry] Error logging media attempt:', error);
    }
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
   * Calculate match score between search term and exercise (0-10 confidence scale)
   * Score breakdown:
   * - Name match (0-4): Exact=4, Substring=3, Word matches=1-3
   * - Target muscle (0-3): Match=+3, None=0, Wrong=-1
   * - Equipment (0-3): Exact=+3, Partial=+2, None=0, Wrong=-1, Conflict=-2
   */
  private calculateMatchScore(searchName: string, exercise: ExerciseDBExercise): number {
    const normalized = this.normalizeExerciseName(searchName);
    const exName = this.normalizeExerciseName(exercise.name);
    
    console.log(`[ExerciseDB Scoring] Scoring "${searchName}" vs "${exercise.name}"`);
    
    let nameScore = 0;
    let targetScore = 0;
    let equipmentScore = 0;
    
    // ===== 1. NAME MATCHING (0-4 points) =====
    if (normalized === exName) {
      nameScore = 4; // Perfect match
      console.log(`[ExerciseDB Scoring] Name: Exact match (+4)`);
    } else if (exName.includes(normalized) || normalized.includes(exName)) {
      nameScore = 3; // Full substring
      console.log(`[ExerciseDB Scoring] Name: Substring match (+3)`);
    } else {
      // Word-level matching
      const searchWords = normalized.split(/\s+/).filter(w => w.length > 2);
      const exWords = exName.split(/\s+/).filter(w => w.length > 2);
      
      const matchingWords = searchWords.filter(sw => 
        exWords.some(ew => ew === sw || ew.includes(sw) || sw.includes(ew))
      );
      
      const matchRatio = searchWords.length > 0 ? matchingWords.length / searchWords.length : 0;
      
      if (matchRatio >= 0.8) {
        nameScore = 3; // Most words match
      } else if (matchRatio >= 0.5) {
        nameScore = 2; // Half of words match
      } else if (matchRatio >= 0.3) {
        nameScore = 1; // Some words match
      } else {
        nameScore = 0; // Poor name match
      }
      
      console.log(`[ExerciseDB Scoring] Name: Word match ratio ${matchRatio.toFixed(2)} (${nameScore} points)`);
    }
    
    // ===== 2. TARGET MUSCLE MATCHING (0-3 points) =====
    const muscleMap: Record<string, string[]> = {
      'chest': ['pectorals'],
      'bench': ['pectorals'], // "bench press" targets chest
      'back': ['lats', 'upper back', 'lower back', 'spine', 'traps'],
      'shoulder': ['delts'],
      'shoulders': ['delts'],
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
      'core': ['abs'],
      'ab': ['abs'],
      'abs': ['abs'],
    };
    
    const searchWords = normalized.split(/\s+/).filter(w => w.length > 2);
    let foundMuscle = false;
    
    for (const word of searchWords) {
      const mappedTargets = muscleMap[word];
      if (mappedTargets) {
        foundMuscle = true;
        const exerciseTarget = exercise.target.toLowerCase();
        const matchesTarget = mappedTargets.some(target => 
          exerciseTarget.includes(target) || target.includes(exerciseTarget)
        );
        
        if (matchesTarget) {
          targetScore = 3; // Target muscle matches
          console.log(`[ExerciseDB Scoring] Target: "${word}" matches "${exerciseTarget}" (+3)`);
        } else {
          targetScore = -1; // Wrong muscle specified
          console.log(`[ExerciseDB Scoring] Target: "${word}" ≠ "${exerciseTarget}" (-1)`);
        }
        break;
      }
    }
    
    if (!foundMuscle) {
      targetScore = 0; // No muscle specified
      console.log(`[ExerciseDB Scoring] Target: Not specified (0)`);
    }
    
    // ===== 3. EQUIPMENT MATCHING (0-3 points) =====
    const equipmentMap: Record<string, string> = {
      'barbell': 'barbell',
      'dumbbell': 'dumbbell',
      'dumbell': 'dumbbell',
      'cable': 'cable',
      'machine': 'machine',
      'band': 'band',
      'bodyweight': 'body weight',
      'kettlebell': 'kettlebell',
      'smith': 'smith machine',
      'trx': 'body weight',
      'suspension': 'body weight',
    };
    
    let searchEquipmentType: string | null = null;
    for (const word of searchWords) {
      if (equipmentMap[word]) {
        searchEquipmentType = equipmentMap[word];
        break;
      }
    }
    
    const exerciseEquipment = exercise.equipment.toLowerCase().trim();
    
    if (searchEquipmentType) {
      const exactMatch = exerciseEquipment === searchEquipmentType;
      const partialMatch = !exactMatch && (exerciseEquipment.includes(searchEquipmentType) || searchEquipmentType.includes(exerciseEquipment));
      
      const conflictingEquipment = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'body weight', 'band', 'machine'];
      const searchKeyword = conflictingEquipment.find(eq => searchEquipmentType.includes(eq));
      const exerciseKeyword = conflictingEquipment.find(eq => exerciseEquipment.includes(eq));
      const hasConflict = searchKeyword && exerciseKeyword && searchKeyword !== exerciseKeyword;
      
      if (exactMatch) {
        equipmentScore = 3; // Perfect equipment match
        console.log(`[ExerciseDB Scoring] Equipment: Exact match "${searchEquipmentType}" (+3)`);
      } else if (hasConflict) {
        equipmentScore = -2; // Major conflict (e.g., barbell vs dumbbell)
        console.log(`[ExerciseDB Scoring] Equipment: Conflict "${searchEquipmentType}" vs "${exerciseEquipment}" (-2)`);
      } else if (partialMatch) {
        equipmentScore = 2; // Partial match
        console.log(`[ExerciseDB Scoring] Equipment: Partial match (+2)`);
      } else {
        equipmentScore = -1; // Different but not conflicting
        console.log(`[ExerciseDB Scoring] Equipment: Different (-1)`);
      }
    } else {
      equipmentScore = 0; // No equipment specified
      console.log(`[ExerciseDB Scoring] Equipment: Not specified (0)`);
    }
    
    // ===== FINAL SCORE (0-10 scale) =====
    const totalScore = nameScore + targetScore + equipmentScore;
    const finalScore = Math.max(0, Math.min(10, totalScore)); // Clamp to 0-10
    
    console.log(`[ExerciseDB Scoring] Final: ${nameScore}(name) + ${targetScore}(target) + ${equipmentScore}(equip) = ${totalScore} → ${finalScore}/10`);
    
    return finalScore;
  }

  /**
   * Search for exercises by name (improved fuzzy matching)
   * Now queries from database instead of API
   * 
   * IMPORTANT: Respects EXERCISE_MEDIA_AUTOMAP_ENABLED flag
   * - When flag is FALSE (baseline mode): Returns null (no fuzzy matching allowed)
   * - When flag is TRUE (AI mode): Uses fuzzy matching algorithm
   */
  async searchExercisesByName(exerciseName: string, metadata?: {
    userId?: string;
    hpExerciseId?: string;
    target?: string;
    bodyPart?: string;
    equipment?: string;
  }): Promise<ExerciseDBExercise | null> {
    try {
      // Import flags
      const { canUseExerciseMediaAutomap } = await import('../../../shared/config/flags');
      
      // Check if fuzzy matching is enabled
      if (!canUseExerciseMediaAutomap()) {
        console.log(`[ExerciseDB] Fuzzy matching disabled (EXERCISE_MEDIA_AUTOMAP_ENABLED=false). Returning null for name-based search: "${exerciseName}"`);
        
        // Log suppressed attempt
        await this.logMediaAttempt({
          hpExerciseName: exerciseName,
          reason: 'SUPPRESSED',
          ...metadata,
        });
        
        return null;
      }
      
      console.log(`[ExerciseDB] Searching for exercise with fuzzy matching: "${exerciseName}"`);
      
      // Get all exercises from database
      const dbExercises = await storage.getAllExercisedbExercises();
      console.log(`[ExerciseDB] Total exercises in database: ${dbExercises.length}`);
      
      if (dbExercises.length === 0) {
        console.warn('[ExerciseDB] Database is empty. Please sync exercises first.');
        
        // Log no-match attempt
        await this.logMediaAttempt({
          hpExerciseName: exerciseName,
          reason: 'NO_MATCH',
          candidateCount: 0,
          ...metadata,
        });
        
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
        
        // Log successful exact match
        await this.logMediaAttempt({
          hpExerciseName: exerciseName,
          reason: 'OK',
          chosenId: exactMatch.id,
          chosenName: exactMatch.name,
          score: 10, // Exact matches get perfect score (0-10 scale)
          candidateCount: 1,
          candidates: [{
            id: exactMatch.id,
            name: exactMatch.name,
            score: 10,
            target: exactMatch.target,
            bodyPart: exactMatch.bodyPart,
            equipment: exactMatch.equipment,
          }],
          ...metadata,
        });
        
        return exactMatch;
      }
      
      // Score all exercises and find best match
      const scoredExercises = allExercises
        .map(ex => ({
          exercise: ex,
          score: this.calculateMatchScore(exerciseName, ex)
        }))
        .filter(item => item.score >= SCORE_LOW) // Filter by LOW threshold (5+)
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
        
        // Prepare candidates for telemetry (top 5)
        const topCandidates = scoredExercises.slice(0, 5).map(item => ({
          id: item.exercise.id,
          name: item.exercise.name,
          score: item.score,
          target: item.exercise.target,
          bodyPart: item.exercise.bodyPart,
          equipment: item.exercise.equipment,
        }));
        
        // Only return if score is high enough to be confident (>= SCORE_OK = 6)
        if (isConfident(bestMatch.score)) {
          // Log successful match
          await this.logMediaAttempt({
            hpExerciseName: exerciseName,
            reason: 'OK',
            chosenId: bestMatch.exercise.id,
            chosenName: bestMatch.exercise.name,
            score: bestMatch.score,
            candidateCount: scoredExercises.length,
            candidates: topCandidates,
            ...metadata,
          });
          
          return bestMatch.exercise;
        } else {
          console.warn(`[ExerciseDB] Best match score too low (${bestMatch.score}/10). Returning null to avoid incorrect GIF.`);
          
          // Log low-confidence match (score 5, just above threshold but below confident)
          await this.logMediaAttempt({
            hpExerciseName: exerciseName,
            reason: 'LOW_CONFIDENCE',
            score: bestMatch.score,
            candidateCount: scoredExercises.length,
            candidates: topCandidates,
            ...metadata,
          });
          
          return null;
        }
      }
      
      console.log(`[ExerciseDB] No suitable match found for: "${exerciseName}"`);
      
      // Log no-match attempt
      await this.logMediaAttempt({
        hpExerciseName: exerciseName,
        reason: 'NO_MATCH',
        candidateCount: 0,
        ...metadata,
      });
      
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
      // Note: ExerciseDB API requires explicit limit parameter
      // Default limit is 10, ULTRA tier allows up to 10,000
      // Request 10,000 to get all ~1,300 exercises
      const response = await axios.get<ExerciseDBAPIResponse[]>(`${BASE_URL}/exercises?limit=10000`, {
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
