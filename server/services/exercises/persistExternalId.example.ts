/**
 * Example: How to persist ExerciseDB external IDs
 * 
 * This demonstrates the workflow for linking HealthPilot exercises
 * to ExerciseDB exercises, enabling fast-path media lookups.
 */

import { persistExternalId, getMediaSafe } from "./getExerciseMedia";

/**
 * EXAMPLE 1: Manual admin approval workflow
 * 
 * Admin reviews media matches and approves confident ones,
 * creating permanent links for future fast-path lookups.
 */
export async function adminApprovalWorkflow(
  hpExerciseId: string,
  approvedExternalId: string
) {
  try {
    // Persist the approved link
    await persistExternalId(hpExerciseId, approvedExternalId);
    
    console.log(`✅ Admin approved: ${hpExerciseId} → ${approvedExternalId}`);
    
    // Future calls will now use the trusted fast path
    const media = await getMediaSafe({
      id: hpExerciseId,
      name: "...",  // Not needed anymore since we have externalId
      target: "...",
      bodyPart: "...",
      externalId: approvedExternalId  // <-- Fast path!
    });
    
    return media;
  } catch (error) {
    console.error("Admin approval failed:", error);
    throw error;
  }
}

/**
 * EXAMPLE 2: Automated high-confidence matching
 * 
 * When auto-mapping produces a very high confidence match (8+),
 * automatically persist it to create a trusted link.
 */
export async function autoLinkHighConfidenceMatches(
  hpExercise: {
    id: string;
    name: string;
    target: string;
    bodyPart: string;
    equipment: string | null;
  }
) {
  const HIGH_CONFIDENCE_THRESHOLD = 8;  // Score >= 8 is very reliable
  
  try {
    // Import resolve function to get confidence score
    const { resolve } = await import("./resolveExternalId");
    const { default: { searchExerciseDBCandidates } } = await import("../exercisedb/searchByName");
    
    // Get candidates
    const candidates = await searchExerciseDBCandidates(hpExercise.name);
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Score candidates
    const result = resolve(hpExercise, candidates);
    
    if (!result) {
      return null;
    }
    
    const { top } = result;
    
    // Auto-link if very high confidence
    if (top.score >= HIGH_CONFIDENCE_THRESHOLD) {
      console.log(
        `🤖 Auto-linking high-confidence match (score: ${top.score}): ${hpExercise.id} → ${top.c.id}`
      );
      
      await persistExternalId(hpExercise.id, top.c.id);
      
      return {
        linked: true,
        externalId: top.c.id,
        score: top.score,
      };
    }
    
    return {
      linked: false,
      score: top.score,
      reason: "Below high-confidence threshold",
    };
  } catch (error) {
    console.error("Auto-link failed:", error);
    return null;
  }
}

/**
 * EXAMPLE 3: Batch linking for new exercise catalog import
 * 
 * When importing a new exercise catalog, batch-link all exercises
 * with exact name matches to create trusted IDs upfront.
 */
export async function batchLinkExactMatches(
  exercises: Array<{
    id: string;
    name: string;
    target: string;
    bodyPart: string;
    equipment: string | null;
  }>
) {
  const results = {
    linked: 0,
    skipped: 0,
    errors: 0,
  };
  
  for (const exercise of exercises) {
    try {
      const { resolve } = await import("./resolveExternalId");
      const { default: { searchExerciseDBCandidates } } = await import("../exercisedb/searchByName");
      
      const candidates = await searchExerciseDBCandidates(exercise.name);
      
      if (candidates.length === 0) {
        results.skipped++;
        continue;
      }
      
      const result = resolve(exercise, candidates);
      
      if (!result) {
        results.skipped++;
        continue;
      }
      
      // Only link exact matches (name score = 3)
      const { top } = result;
      const isExactMatch = top.c.name.toLowerCase() === exercise.name.toLowerCase();
      
      if (isExactMatch && top.score >= 7) {
        await persistExternalId(exercise.id, top.c.id);
        results.linked++;
        console.log(`✓ Linked: ${exercise.name} → ${top.c.id}`);
      } else {
        results.skipped++;
      }
    } catch (error) {
      console.error(`Error linking ${exercise.name}:`, error);
      results.errors++;
    }
  }
  
  console.log(
    `\n📊 Batch link results: ${results.linked} linked, ${results.skipped} skipped, ${results.errors} errors`
  );
  
  return results;
}

/**
 * EXAMPLE 4: Admin endpoint for manual approval
 * 
 * Add this to your server/routes.ts to enable admin approval via API
 */
export function registerAdminEndpoint(app: any) {
  app.post("/api/admin/exercises/:id/link-external", async (req, res) => {
    // Add isAdmin middleware
    const { id } = req.params;
    const { externalId } = req.body;
    
    if (!externalId) {
      return res.status(400).json({ error: "Missing externalId" });
    }
    
    try {
      await persistExternalId(id, externalId);
      
      res.json({
        success: true,
        message: `Exercise ${id} linked to ExerciseDB ${externalId}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

/**
 * EXAMPLE 5: Update media review admin UI
 * 
 * After admin approves a match, persist the link
 */
export async function onAdminApprove(
  attemptLog: {
    hpExerciseId: string;
    chosenId: string;
  }
) {
  try {
    // Persist the approved link
    await persistExternalId(attemptLog.hpExerciseId, attemptLog.chosenId);
    
    // Update review status in telemetry log
    // await storage.updateMediaAttemptReviewStatus(attemptLog.id, "approved");
    
    return {
      success: true,
      message: "Link created successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
