import type {
  MentalHealthResource,
  SavedResource,
  EmotionCategory,
  ResourceType,
  Region,
} from './types';
import { mentalHealthResources } from './dataset';
import { getSecureItem, setSecureItem } from '../secureStorage';

const SAVED_RESOURCES_KEY = 'saved_mental_health_resources';
const DEFAULT_PASSWORD = 'mental_health_resources_secure_key_v1'; // In production, this should be user-specific

/**
 * Retrieves all available mental health resources
 */
export function getAllResources(): MentalHealthResource[] {
  return mentalHealthResources;
}

/**
 * Filters resources by emotion category
 */
export function filterByEmotion(
  emotion: EmotionCategory,
  resources: MentalHealthResource[] = mentalHealthResources
): MentalHealthResource[] {
  return resources.filter((resource) =>
    resource.category.includes(emotion)
  );
}

/**
 * Filters resources by resource type
 */
export function filterByType(
  type: ResourceType,
  resources: MentalHealthResource[] = mentalHealthResources
): MentalHealthResource[] {
  return resources.filter((resource) => resource.type === type);
}

/**
 * Filters resources by region
 */
export function filterByRegion(
  region: Region,
  resources: MentalHealthResource[] = mentalHealthResources
): MentalHealthResource[] {
  return resources.filter((resource) => resource.region === region);
}

/**
 * Filters resources with multiple criteria
 */
export function filterResources(
  filters: {
    emotion?: EmotionCategory;
    type?: ResourceType;
    region?: Region;
    tags?: string[];
  },
  resources: MentalHealthResource[] = mentalHealthResources
): MentalHealthResource[] {
  let filtered = resources;

  if (filters.emotion) {
    filtered = filtered.filter((resource) =>
      resource.category.includes(filters.emotion!)
    );
  }

  if (filters.type) {
    filtered = filtered.filter((resource) => resource.type === filters.type);
  }

  if (filters.region) {
    filtered = filtered.filter((resource) => resource.region === filters.region);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((resource) =>
      filters.tags!.some((tag) => resource.tags?.includes(tag))
    );
  }

  return filtered;
}

/**
 * Gets a single resource by ID
 */
export function getResourceById(id: string): MentalHealthResource | undefined {
  return mentalHealthResources.find((resource) => resource.id === id);
}

/**
 * Retrieves saved resources from secure storage
 */
export function getSavedResources(): SavedResource[] {
  try {
    const saved = getSecureItem<SavedResource[]>(SAVED_RESOURCES_KEY, DEFAULT_PASSWORD);
    return saved || [];
  } catch {
    return [];
  }
}

/**
 * Saves a resource to the user's saved list
 */
export function saveResource(resourceId: string, notes?: string): SavedResource[] {
  const saved = getSavedResources();
  
  // Check if already saved
  const existingIndex = saved.findIndex((s) => s.resourceId === resourceId);
  if (existingIndex !== -1) {
    // Update notes if provided
    if (notes !== undefined) {
      saved[existingIndex].notes = notes;
    }
  } else {
    // Add new saved resource
    saved.push({
      resourceId,
      savedAt: Date.now(),
      notes,
    });
  }

  setSecureItem(SAVED_RESOURCES_KEY, saved, DEFAULT_PASSWORD);
  return saved;
}

/**
 * Removes a resource from the saved list
 */
export function removeSavedResource(resourceId: string): SavedResource[] {
  const saved = getSavedResources();
  const filtered = saved.filter((s) => s.resourceId !== resourceId);
  
  setSecureItem(SAVED_RESOURCES_KEY, filtered, DEFAULT_PASSWORD);
  return filtered;
}

/**
 * Checks if a resource is saved
 */
export function isResourceSaved(resourceId: string): boolean {
  const saved = getSavedResources();
  return saved.some((s) => s.resourceId === resourceId);
}

/**
 * Gets the full resource objects for all saved resources
 */
export function getSavedResourcesWithDetails(): Array<{
  resource: MentalHealthResource;
  savedInfo: SavedResource;
}> {
  const saved = getSavedResources();
  return saved
    .map((savedInfo) => {
      const resource = getResourceById(savedInfo.resourceId);
      return resource ? { resource, savedInfo } : null;
    })
    .filter((item): item is { resource: MentalHealthResource; savedInfo: SavedResource } => 
      item !== null
    );
}

/**
 * Data integrity check - validates that a resource has all required fields
 */
export function validateResourceIntegrity(resource: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!resource || typeof resource !== 'object') {
    return { isValid: false, errors: ['Resource must be an object'] };
  }

  const r = resource as Record<string, unknown>;

  // Check base required fields
  if (!r.id || typeof r.id !== 'string') {
    errors.push('Missing or invalid required field: id');
  }
  if (!r.type || typeof r.type !== 'string') {
    errors.push('Missing or invalid required field: type');
  }
  if (!r.title || typeof r.title !== 'string') {
    errors.push('Missing or invalid required field: title');
  }
  if (!r.description || typeof r.description !== 'string') {
    errors.push('Missing or invalid required field: description');
  }
  if (!Array.isArray(r.category) || r.category.length === 0) {
    errors.push('Missing or invalid required field: category (must be non-empty array)');
  }
  if (!r.region || typeof r.region !== 'string') {
    errors.push('Missing or invalid required field: region');
  }

  // Type-specific validation
  if (r.type === 'helpline') {
    if (!r.number || typeof r.number !== 'string') {
      errors.push('Helpline missing required field: number');
    }
    if (!r.hours || typeof r.hours !== 'string') {
      errors.push('Helpline missing required field: hours');
    }
    if (!Array.isArray(r.languages) || r.languages.length === 0) {
      errors.push('Helpline missing required field: languages (must be non-empty array)');
    }
    if (typeof r.trusted !== 'boolean') {
      errors.push('Helpline missing required field: trusted (must be boolean)');
    }
  } else if (r.type === 'exercise') {
    if (!r.duration || typeof r.duration !== 'string') {
      errors.push('Exercise missing required field: duration');
    }
    if (!r.difficulty || !['easy', 'medium', 'hard'].includes(r.difficulty as string)) {
      errors.push('Exercise missing or invalid required field: difficulty');
    }
    if (!Array.isArray(r.instructions) || r.instructions.length === 0) {
      errors.push('Exercise missing required field: instructions (must be non-empty array)');
    }
  } else if (r.type === 'prompt') {
    if (!Array.isArray(r.questions) || r.questions.length === 0) {
      errors.push('Prompt missing required field: questions (must be non-empty array)');
    }
    if (!r.context || typeof r.context !== 'string') {
      errors.push('Prompt missing required field: context');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the entire dataset
 */
export function validateDataset(): {
  isValid: boolean;
  totalResources: number;
  invalidResources: Array<{ id: string; errors: string[] }>;
} {
  const invalidResources: Array<{ id: string; errors: string[] }> = [];

  mentalHealthResources.forEach((resource) => {
    const validation = validateResourceIntegrity(resource);
    if (!validation.isValid) {
      invalidResources.push({
        id: resource.id || 'unknown',
        errors: validation.errors,
      });
    }
  });

  return {
    isValid: invalidResources.length === 0,
    totalResources: mentalHealthResources.length,
    invalidResources,
  };
}

/**
 * Clears all saved resources
 */
export function clearAllSavedResources(): void {
  setSecureItem(SAVED_RESOURCES_KEY, [], DEFAULT_PASSWORD);
}
