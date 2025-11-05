// Resource types for mental health support
export type ResourceType = 'helpline' | 'exercise' | 'prompt';
export type EmotionCategory = 'anxiety' | 'depression' | 'stress' | 'loneliness' | 'anger' | 'grief' | 'general';
export type Region = 'india' | 'global';

// Base resource interface
export interface BaseResource {
  id: string;
  type: ResourceType;
  title: string;
  description: string;
  category: EmotionCategory[];
  region: Region;
  tags?: string[];
  isDynamic?: boolean; // Placeholder for future dynamic updates
}

// Helpline resource
export interface HelplineResource extends BaseResource {
  type: 'helpline';
  number: string;
  hours: string;
  languages: string[];
  website?: string;
  trusted: boolean;
  badge?: string;
}

// Exercise resource
export interface ExerciseResource extends BaseResource {
  type: 'exercise';
  duration: string; // e.g., "5 minutes", "10 minutes"
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string[];
}

// Prompt resource
export interface PromptResource extends BaseResource {
  type: 'prompt';
  questions: string[];
  context: string;
}

// Union type for all resources
export type MentalHealthResource = HelplineResource | ExerciseResource | PromptResource;

// Saved resource with metadata
export interface SavedResource {
  resourceId: string;
  savedAt: number;
  notes?: string;
}
