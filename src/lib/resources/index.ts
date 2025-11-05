// Export all types
export type {
  ResourceType,
  EmotionCategory,
  Region,
  BaseResource,
  HelplineResource,
  ExerciseResource,
  PromptResource,
  MentalHealthResource,
  SavedResource,
} from './types';

// Export dataset
export { mentalHealthResources } from './dataset';

// Export helper functions
export {
  getAllResources,
  filterByEmotion,
  filterByType,
  filterByRegion,
  filterResources,
  getResourceById,
  getSavedResources,
  saveResource,
  removeSavedResource,
  isResourceSaved,
  getSavedResourcesWithDetails,
  validateResourceIntegrity,
  validateDataset,
  clearAllSavedResources,
} from './helpers';
