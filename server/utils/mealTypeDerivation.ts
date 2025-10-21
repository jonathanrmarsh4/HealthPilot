/**
 * Meal Type Derivation Utility
 * 
 * Deterministically derives meal type (breakfast/lunch/dinner/snack) from:
 * 1. Explicit mealTypes field (if valid)
 * 2. Dish type mapping (dessert -> snack, etc.)
 * 3. Title keyword matching
 * 4. Default to lunch if ambiguous
 */

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealData {
  title: string;
  dishTypes?: string[];
  mealTypes?: string[];
  cuisines?: string[];
}

/**
 * Keyword dictionaries for meal type classification
 */
const MEAL_TYPE_KEYWORDS = {
  breakfast: [
    'breakfast', 'brunch', 'omelette', 'omelet', 'pancake', 'waffle', 'french toast',
    'cereal', 'oatmeal', 'oats', 'granola', 'muesli', 'bagel', 'croissant',
    'breakfast burrito', 'egg', 'scrambled', 'poached', 'frittata', 'quiche',
    'morning', 'bacon and eggs'
  ],
  lunch: [
    'sandwich', 'wrap', 'burger', 'salad', 'bowl', 'soup', 'panini',
    'club sandwich', 'blt', 'reuben', 'sub', 'hoagie', 'pita', 'quesadilla',
    'lunch', 'midday'
  ],
  dinner: [
    'pasta', 'steak', 'chicken dinner', 'roast', 'curry', 'stir fry', 'stirfry',
    'casserole', 'lasagna', 'risotto', 'paella', 'tagine', 'dinner', 'supper',
    'main course', 'entree', 'prime rib', 'pot roast', 'braised', 'grilled salmon',
    'fish and chips', 'beef wellington'
  ],
  snack: [
    'snack', 'appetizer', 'finger food', 'dip', 'chip', 'cracker', 'nut',
    'trail mix', 'energy bar', 'protein bar', 'smoothie', 'shake', 'juice',
    'dessert', 'cake', 'cookie', 'brownie', 'ice cream', 'pie', 'tart',
    'pudding', 'mousse', 'truffle', 'candy', 'sweet', 'beverage', 'drink'
  ]
};

/**
 * Dish type to meal type mapping
 * Maps Spoonacular's dishTypes to our meal types
 */
const DISH_TYPE_MAPPING: Record<string, MealType> = {
  // Breakfast types
  'breakfast': 'breakfast',
  'brunch': 'breakfast',
  'morning meal': 'breakfast',
  
  // Lunch types
  'lunch': 'lunch',
  'salad': 'lunch',
  'sandwich': 'lunch',
  'soup': 'lunch',
  
  // Dinner types
  'dinner': 'dinner',
  'main course': 'dinner',
  'main dish': 'dinner',
  
  // Snack types
  'snack': 'snack',
  'appetizer': 'snack',
  'antipasti': 'snack',
  'antipasto': 'snack',
  'hor d\'oeuvre': 'snack',
  'hors d\'oeuvre': 'snack',
  'starter': 'snack',
  'fingerfood': 'snack',
  'finger food': 'snack',
  'side dish': 'snack',
  'dessert': 'snack',
  'beverage': 'snack',
  'drink': 'snack',
  'sauce': 'snack',
  'condiment': 'snack',
  'dip': 'snack',
  'spread': 'snack'
};

/**
 * Derive meal type from explicit mealTypes array
 */
function deriveMealTypeFromExplicit(mealTypes: string[]): MealType | null {
  const validTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  for (const type of mealTypes) {
    const normalized = type.toLowerCase().trim();
    if (validTypes.includes(normalized as MealType)) {
      return normalized as MealType;
    }
  }
  
  return null;
}

/**
 * Derive meal type from dish types using mapping
 */
function deriveMealTypeFromDishTypes(dishTypes: string[]): MealType | null {
  for (const dishType of dishTypes) {
    const normalized = dishType.toLowerCase().trim();
    if (DISH_TYPE_MAPPING[normalized]) {
      return DISH_TYPE_MAPPING[normalized];
    }
  }
  
  return null;
}

/**
 * Derive meal type from title keywords
 */
function deriveMealTypeFromTitle(title: string): MealType | null {
  const titleLower = title.toLowerCase();
  
  // Check each meal type's keywords
  for (const [mealType, keywords] of Object.entries(MEAL_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return mealType as MealType;
      }
    }
  }
  
  return null;
}

/**
 * Main function: Deterministically derive meal type
 * 
 * Priority order:
 * 1. Explicit valid mealTypes field
 * 2. Dish type mapping
 * 3. Title keyword matching
 * 4. Default to lunch
 */
export function deriveMealType(meal: MealData): MealType {
  // 1. Try explicit mealTypes
  if (meal.mealTypes && meal.mealTypes.length > 0) {
    const explicit = deriveMealTypeFromExplicit(meal.mealTypes);
    if (explicit) {
      return explicit;
    }
  }
  
  // 2. Try dish type mapping
  if (meal.dishTypes && meal.dishTypes.length > 0) {
    const fromDishType = deriveMealTypeFromDishTypes(meal.dishTypes);
    if (fromDishType) {
      return fromDishType;
    }
  }
  
  // 3. Try title keywords
  const fromTitle = deriveMealTypeFromTitle(meal.title);
  if (fromTitle) {
    return fromTitle;
  }
  
  // 4. Default to lunch (most versatile meal)
  return 'lunch';
}

/**
 * Derive all valid meal types that a dish could be used for
 * (A salad could be lunch or dinner, for example)
 */
export function deriveAllPossibleMealTypes(meal: MealData): MealType[] {
  const types = new Set<MealType>();
  
  // Add from explicit mealTypes
  if (meal.mealTypes) {
    for (const type of meal.mealTypes) {
      const normalized = type.toLowerCase().trim();
      if (['breakfast', 'lunch', 'dinner', 'snack'].includes(normalized)) {
        types.add(normalized as MealType);
      }
    }
  }
  
  // Add from dish types
  if (meal.dishTypes) {
    for (const dishType of meal.dishTypes) {
      const mapped = DISH_TYPE_MAPPING[dishType.toLowerCase().trim()];
      if (mapped) {
        types.add(mapped);
      }
    }
  }
  
  // Add from title
  const fromTitle = deriveMealTypeFromTitle(meal.title);
  if (fromTitle) {
    types.add(fromTitle);
  }
  
  // If no types found, add lunch as default
  if (types.size === 0) {
    types.add('lunch');
  }
  
  return Array.from(types);
}
