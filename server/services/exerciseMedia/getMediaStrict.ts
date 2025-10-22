/**
 * Strict Media Fetching Service
 * 
 * Enforces strict verification that ExerciseDB media matches the clicked exercise
 * before displaying GIF/demo. This prevents incorrect media from being shown.
 * 
 * Strategy:
 * 1. Only fetch if externalId exists (trusted binding)
 * 2. Fetch ExerciseDB item by ID
 * 3. Verify it matches the clicked exercise (name + target/bodyPart)
 * 4. Return media ONLY if verification passes
 * 5. Withhold media with clear reason if verification fails
 */

import { getExerciseDbItemByIdFull } from '../exerciseDb/getById';
import { verifyDbItemMatches } from './verifyMatch';
import { canUseStrictMediaBinding } from '@shared/config/flags';

type HP = {
  id: string;
  name: string;
  target: string;
  bodyPart: string;
  equipment?: string | null;
  externalId?: string | null;
};

export type MediaResult =
  | { media: { url: string; id: string }; withheld: false; reason?: never }
  | { media: null; withheld: true; reason: 'no_external_id' | 'not_found' | 'verification_failed' | 'strict_binding_disabled'; details?: string[] };

/**
 * Get media with strict verification
 * 
 * @param hp - HealthPilot exercise snapshot (from clicked card)
 * @returns Media if verified, or withheld with reason
 */
export async function getMediaStrict(hp: HP): Promise<MediaResult> {
  // Check if strict binding is enabled
  if (!canUseStrictMediaBinding()) {
    console.log('[MediaStrict] Strict binding disabled - falling back to legacy behavior');
    return {
      media: null,
      withheld: true,
      reason: 'strict_binding_disabled',
    };
  }

  // 1. Require externalId (trusted binding)
  if (!hp.externalId) {
    return {
      media: null,
      withheld: true,
      reason: 'no_external_id',
    };
  }

  // 2. Fetch ExerciseDB item by ID
  const db = await getExerciseDbItemByIdFull(hp.externalId);
  
  if (!db) {
    console.warn(`[MediaStrict] ExerciseDB item ${hp.externalId} not found for "${hp.name}"`);
    return {
      media: null,
      withheld: true,
      reason: 'not_found',
    };
  }

  // 3. Verify match
  const verifyResult = verifyDbItemMatches(hp, db);
  
  if (!verifyResult.ok) {
    console.warn(
      `[MediaStrict] Verification failed for "${hp.name}" (ID: ${hp.externalId}):`,
      verifyResult.reasons
    );
    return {
      media: null,
      withheld: true,
      reason: 'verification_failed',
      details: verifyResult.reasons,
    };
  }

  // 4. Verification passed - return media
  if (!db.gifUrl) {
    console.warn(`[MediaStrict] No GIF URL for verified exercise "${hp.name}"`);
    return {
      media: null,
      withheld: true,
      reason: 'not_found',
    };
  }

  console.log(`[MediaStrict] ✅ Verified and serving media for "${hp.name}" (ID: ${hp.externalId})`);
  
  return {
    media: {
      url: db.gifUrl,
      id: db.id,
    },
    withheld: false,
  };
}
