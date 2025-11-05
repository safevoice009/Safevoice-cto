# Mental Health Resources Dataset

This module provides a structured mental health resources dataset with filtering, saving, and data integrity features.

## Overview

The resources dataset includes three types of resources:
- **Helplines**: Phone support lines for crisis and mental health support
- **Exercises**: Guided activities for mental wellness (breathing exercises, grounding techniques, etc.)
- **Prompts**: Journaling and reflection prompts for self-care

## Features

- Categorization by emotion (anxiety, depression, stress, loneliness, anger, grief, general)
- Region-specific resources (India-specific helplines, global resources)
- Resource type filtering (helplines, exercises, prompts)
- Save/unsave resources functionality with secure storage
- Data integrity validation
- Dynamic placeholders for future updates

## Usage

### Import

```typescript
import {
  getAllResources,
  filterByEmotion,
  filterByType,
  filterByRegion,
  filterResources,
  getResourceById,
  saveResource,
  removeSavedResource,
  getSavedResources,
  isResourceSaved,
  getSavedResourcesWithDetails,
  validateDataset,
} from '@/lib/resources';
```

### Basic Usage

#### Get All Resources

```typescript
const allResources = getAllResources();
```

#### Filter by Emotion

```typescript
const anxietyResources = filterByEmotion('anxiety');
const stressResources = filterByEmotion('stress');
```

#### Filter by Type

```typescript
const helplines = filterByType('helpline');
const exercises = filterByType('exercise');
const prompts = filterByType('prompt');
```

#### Filter by Region

```typescript
const indiaResources = filterByRegion('india');
const globalResources = filterByRegion('global');
```

#### Multi-Criteria Filtering

```typescript
// Get India-specific helplines for anxiety
const resources = filterResources({
  emotion: 'anxiety',
  type: 'helpline',
  region: 'india',
});

// Filter by tags
const breathingExercises = filterResources({
  tags: ['breathing'],
});
```

#### Get Resource by ID

```typescript
const aasra = getResourceById('helpline-aasra');
```

### Saving Resources

#### Save a Resource

```typescript
// Save without notes
saveResource('helpline-aasra');

// Save with notes
saveResource('helpline-aasra', 'Very helpful for crisis situations');
```

#### Check if Saved

```typescript
const isSaved = isResourceSaved('helpline-aasra');
```

#### Get Saved Resources

```typescript
// Get saved resource IDs and metadata
const savedResources = getSavedResources();

// Get full resource objects with saved metadata
const detailedSaved = getSavedResourcesWithDetails();
detailedSaved.forEach(({ resource, savedInfo }) => {
  console.log(resource.title, savedInfo.savedAt, savedInfo.notes);
});
```

#### Remove Saved Resource

```typescript
removeSavedResource('helpline-aasra');
```

#### Clear All Saved Resources

```typescript
clearAllSavedResources();
```

### Data Validation

#### Validate a Resource

```typescript
const validation = validateResourceIntegrity(resource);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

#### Validate Entire Dataset

```typescript
const datasetValidation = validateDataset();
console.log(`Total resources: ${datasetValidation.totalResources}`);
console.log(`Valid: ${datasetValidation.isValid}`);
if (!datasetValidation.isValid) {
  console.log('Invalid resources:', datasetValidation.invalidResources);
}
```

## India-Specific Helplines

The dataset includes verified India-specific mental health helplines:

### AASRA
- **Number**: +91-22-27546669
- **Hours**: 24/7
- **Languages**: English, Hindi
- **Category**: Suicide Prevention
- **Website**: http://www.aasra.info

### Vandrevala Foundation
- **Number**: 1860-2662-345
- **Hours**: 24/7
- **Languages**: English, Hindi, Tamil, Telugu, Kannada, Marathi
- **Category**: Mental Health
- **Website**: https://www.vandrevalafoundation.com

### KIRAN (Government of India)
- **Number**: 1800-599-0019
- **Hours**: 24/7
- **Languages**: All major Indian languages (Hindi, English, Tamil, Telugu, Kannada, Marathi, Malayalam, Gujarati, Punjabi)
- **Badge**: Government
- **Category**: Mental Health
- **Website**: https://www.mohfw.gov.in

### iCALL (TISS)
- **Number**: 9152987821
- **Hours**: Monday to Saturday, 8 AM to 8 PM
- **Languages**: English, Hindi, Marathi
- **Category**: Psychosocial Counselling
- **Website**: https://icallhelpline.org

## Resource Types

### Helpline Resource

```typescript
interface HelplineResource {
  id: string;
  type: 'helpline';
  title: string;
  description: string;
  category: EmotionCategory[];
  region: Region;
  number: string;
  hours: string;
  languages: string[];
  website?: string;
  trusted: boolean;
  badge?: string;
  tags?: string[];
  isDynamic?: boolean;
}
```

### Exercise Resource

```typescript
interface ExerciseResource {
  id: string;
  type: 'exercise';
  title: string;
  description: string;
  category: EmotionCategory[];
  region: Region;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string[];
  tags?: string[];
  isDynamic?: boolean;
}
```

### Prompt Resource

```typescript
interface PromptResource {
  id: string;
  type: 'prompt';
  title: string;
  description: string;
  category: EmotionCategory[];
  region: Region;
  questions: string[];
  context: string;
  tags?: string[];
  isDynamic?: boolean;
}
```

## Security

Saved resources are stored using the secure storage module with AES encryption. The storage key is `saved_mental_health_resources`.

## Testing

The module includes comprehensive unit tests covering:
- Filtering by emotion, type, and region
- Saving and removing resources
- Data integrity checks
- India-specific helplines validation

Run tests:
```bash
npm test -- src/lib/__tests__/resources.test.ts
npm test -- src/lib/__tests__/indiaHelplines.test.ts
```

## Dynamic Updates

Resources marked with `isDynamic: true` are placeholders for future dynamic content that will be fetched from APIs or updated through external sources.

## Contributing

When adding new resources:

1. Follow the type definitions in `types.ts`
2. Ensure all required fields are present
3. Add to the appropriate category (emotion, region, type)
4. Run validation: `validateDataset()` should return `isValid: true`
5. Add relevant tags for better filtering
6. Update tests if adding new categories or types
