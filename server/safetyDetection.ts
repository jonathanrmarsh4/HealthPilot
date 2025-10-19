import type { IStorage } from './storage';

export interface SafetyDetectionResult {
  hasRisk: boolean;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  matchedKeywords: string[];
  recommendedAction: string;
}

// Emergency keywords categorized by risk level
const CRITICAL_KEYWORDS = [
  'chest pain',
  'heart attack',
  'stroke',
  'can\'t breathe',
  'cannot breathe',
  'difficulty breathing',
  'severe headache',
  'suicidal',
  'kill myself',
  'end my life',
  'unconscious',
  'seizure',
  'convulsion',
  'severe bleeding',
  'extreme pain',
  'numbness in face',
  'slurred speech',
  'vision loss',
  'blurred vision suddenly',
];

const HIGH_KEYWORDS = [
  'dizzy',
  'lightheaded',
  'faint',
  'fainting',
  'passed out',
  'nausea',
  'vomiting blood',
  'blood in stool',
  'severe diarrhea',
  'dehydrated',
  'extreme fatigue',
  'can\'t move',
  'paralyzed',
  'allergic reaction',
  'swelling throat',
  'difficulty swallowing',
];

const MEDIUM_KEYWORDS = [
  'sharp pain',
  'chronic pain',
  'intense pain',
  'persistent pain',
  'unusual bleeding',
  'high fever',
  'fever over 103',
  'confusion',
  'disoriented',
  'severe anxiety',
  'panic attack',
  'rapid heartbeat',
  'heart racing',
  'very weak',
];

const LOW_KEYWORDS = [
  'headache',
  'tired',
  'sore',
  'muscle pain',
  'joint pain',
  'slight fever',
  'mild nausea',
  'upset stomach',
  'worried',
  'anxious',
  'stressed',
];

/**
 * Detects safety risks in user input or AI responses
 * Scans for emergency medical keywords and returns risk assessment
 */
export function detectSafetyRisk(text: string): SafetyDetectionResult {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  let riskLevel: SafetyDetectionResult['riskLevel'] = 'none';
  
  // Check critical keywords first
  for (const keyword of CRITICAL_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      riskLevel = 'critical';
    }
  }
  
  // If not critical, check high risk
  if (riskLevel !== 'critical') {
    for (const keyword of HIGH_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        riskLevel = 'high';
      }
    }
  }
  
  // If not high, check medium risk
  if (riskLevel !== 'critical' && riskLevel !== 'high') {
    for (const keyword of MEDIUM_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        riskLevel = 'medium';
      }
    }
  }
  
  // If not medium, check low risk
  if (riskLevel === 'none') {
    for (const keyword of LOW_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        riskLevel = 'low';
      }
    }
  }
  
  // Determine recommended action based on risk level
  let recommendedAction = '';
  switch (riskLevel) {
    case 'critical':
      recommendedAction = 'STOP IMMEDIATELY and call 911 or go to the nearest emergency room. This requires immediate medical attention.';
      break;
    case 'high':
      recommendedAction = 'Stop exercising and seek medical care today. Contact your doctor or visit urgent care.';
      break;
    case 'medium':
      recommendedAction = 'Consider consulting with your healthcare provider about these symptoms.';
      break;
    case 'low':
      recommendedAction = 'Monitor your symptoms. Consult a healthcare provider if they worsen.';
      break;
    default:
      recommendedAction = '';
  }
  
  return {
    hasRisk: matchedKeywords.length > 0,
    riskLevel,
    matchedKeywords,
    recommendedAction,
  };
}

/**
 * Logs a safety escalation event to the database
 * Should be called whenever a safety risk is detected
 */
export async function logSafetyEscalation(
  storage: IStorage,
  userId: number,
  detectionResult: SafetyDetectionResult,
  context: {
    userMessage?: string;
    aiResponse?: string;
    conversationType?: 'text' | 'voice';
    currentPage?: string;
  }
): Promise<void> {
  if (!detectionResult.hasRisk) {
    return; // Nothing to log
  }
  
  const escalationContext = {
    riskLevel: detectionResult.riskLevel,
    matchedKeywords: detectionResult.matchedKeywords,
    recommendedAction: detectionResult.recommendedAction,
    userMessage: context.userMessage || '',
    aiResponse: context.aiResponse || '',
    conversationType: context.conversationType || 'text',
    currentPage: context.currentPage || 'unknown',
    timestamp: new Date().toISOString(),
  };
  
  await storage.logSafetyEscalation(
    userId,
    detectionResult.matchedKeywords.join(', '),
    escalationContext
  );
}

/**
 * Scans both user input and AI response for safety risks
 * Returns combined risk assessment
 */
export function scanConversation(userMessage: string, aiResponse: string): SafetyDetectionResult {
  const userRisk = detectSafetyRisk(userMessage);
  const aiRisk = detectSafetyRisk(aiResponse);
  
  // Take the highest risk level found
  const riskLevels = ['none', 'low', 'medium', 'high', 'critical'];
  const userRiskIndex = riskLevels.indexOf(userRisk.riskLevel);
  const aiRiskIndex = riskLevels.indexOf(aiRisk.riskLevel);
  
  const highestRiskIndex = Math.max(userRiskIndex, aiRiskIndex);
  const highestRisk = highestRiskIndex === userRiskIndex ? userRisk : aiRisk;
  
  // Combine matched keywords
  const allKeywords = [...new Set([...userRisk.matchedKeywords, ...aiRisk.matchedKeywords])];
  
  return {
    hasRisk: allKeywords.length > 0,
    riskLevel: riskLevels[highestRiskIndex] as SafetyDetectionResult['riskLevel'],
    matchedKeywords: allKeywords,
    recommendedAction: highestRisk.recommendedAction,
  };
}
