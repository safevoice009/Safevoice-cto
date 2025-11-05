# Resources Dataset Implementation

## Overview

This implementation provides a comprehensive mental health resources system with structured dataset management, filtering capabilities, and secure storage for saved resources.

## Components

### 1. Dataset Structure (`src/lib/resources/`)

The resources module is organized into the following files:

- **`types.ts`**: TypeScript type definitions for resources
- **`dataset.ts`**: The actual mental health resources data
- **`helpers.ts`**: Helper functions for filtering, saving, and validation
- **`index.ts`**: Main export file
- **`README.md`**: Detailed documentation

### 2. Resource Types

Three types of mental health resources are supported:

#### Helplines
- Phone support lines for crisis and mental health
- Required fields: `number`, `hours`, `languages`, `trusted`, `badge` (optional)
- Example: AASRA, Vandrevala Foundation, KIRAN

#### Exercises
- Guided activities for mental wellness
- Required fields: `duration`, `difficulty`, `instructions`
- Example: 5-4-3-2-1 Grounding, Box Breathing

#### Prompts
- Journaling and reflection prompts
- Required fields: `questions`, `context`
- Example: Self-Compassion Reflection, Gratitude Moment

### 3. Categorization

Resources are categorized by:
- **Emotion**: anxiety, depression, stress, loneliness, anger, grief, general
- **Region**: india, global
- **Type**: helpline, exercise, prompt
- **Tags**: Additional metadata for filtering

## India-Specific Helplines

The dataset includes verified India-specific mental health helplines:

### Included Helplines

1. **AASRA**
   - Number: +91-22-27546669
   - 24/7 availability
   - Languages: English, Hindi
   - Category: Suicide Prevention

2. **Vandrevala Foundation**
   - Number: 1860-2662-345
   - 24/7 availability
   - Languages: English, Hindi, Tamil, Telugu, Kannada, Marathi
   - Category: Mental Health

3. **KIRAN (Government of India)**
   - Number: 1800-599-0019
   - 24/7 availability
   - Languages: All major Indian languages (9+)
   - Badge: Government
   - Category: Mental Health

4. **iCALL (TISS)**
   - Number: 9152987821
   - Hours: Monday to Saturday, 8 AM to 8 PM
   - Languages: English, Hindi, Marathi
   - Category: Psychosocial Counselling

## Store Helpers

The `helpers.ts` module provides comprehensive functionality:

### Filtering Functions

- `getAllResources()`: Get all available resources
- `filterByEmotion(emotion)`: Filter by emotion category
- `filterByType(type)`: Filter by resource type
- `filterByRegion(region)`: Filter by region
- `filterResources(filters)`: Multi-criteria filtering with emotion, type, region, and tags
- `getResourceById(id)`: Get a specific resource

### Save/Load Functions

- `saveResource(resourceId, notes?)`: Save a resource with optional notes
- `removeSavedResource(resourceId)`: Remove from saved list
- `getSavedResources()`: Get all saved resources (IDs and metadata)
- `isResourceSaved(resourceId)`: Check if a resource is saved
- `getSavedResourcesWithDetails()`: Get full resource objects with saved metadata
- `clearAllSavedResources()`: Clear all saved resources

### Data Integrity

- `validateResourceIntegrity(resource)`: Validate a single resource
- `validateDataset()`: Validate the entire dataset

Validation checks:
- All required base fields present (id, type, title, description, category, region)
- Type-specific required fields
- Non-empty arrays where required
- Valid enum values (difficulty, region, etc.)

## Security

Saved resources are stored using the existing secure storage module with AES encryption:
- Storage key: `saved_mental_health_resources`
- Encryption: AES-GCM-256
- Password-protected (default key for MVP, user-specific in production)

## Testing

Two comprehensive test suites were created:

### `resources.test.ts` (50 tests)

Tests covering:
- Dataset loading
- Filtering by emotion (all 7 categories)
- Filtering by type (helplines, exercises, prompts)
- Filtering by region (india, global)
- Multi-criteria filtering
- Resource lookup by ID
- Saving and removing resources
- Notes management
- Saved resources persistence
- Data integrity validation
- Dataset validation

### `indiaHelplines.test.ts` (22 tests)

Specific tests for India-specific helplines:
- Availability of major helplines (AASRA, Vandrevala, KIRAN, iCALL)
- Multilingual support verification
- 24/7 availability checks
- Trust verification
- Category coverage (anxiety, depression, stress, grief)
- Contact information validation
- Dynamic placeholder verification
- Website links validation

## Test Results

```
✓ src/lib/__tests__/resources.test.ts (50 tests) 91ms
✓ src/lib/__tests__/indiaHelplines.test.ts (22 tests) 10ms

Test Files  2 passed (2)
Tests  72 passed (72)
```

All tests pass successfully, ensuring:
- Data integrity across all resources
- Proper filtering functionality
- Secure storage operations
- India-specific helplines availability and accuracy

## Dynamic Updates

Resources can be marked with `isDynamic: true` to indicate placeholders for:
- Future API integrations
- Partner content updates
- Seasonal or event-based resources
- Regional expansions

The dataset includes three dynamic placeholders:
1. Regional helpline integration placeholder
2. Guided meditation content placeholder
3. Seasonal reflection prompt placeholder

## Usage Example

```typescript
import {
  filterResources,
  saveResource,
  getSavedResourcesWithDetails,
} from '@/lib/resources';

// Get India helplines for anxiety
const helplines = filterResources({
  emotion: 'anxiety',
  type: 'helpline',
  region: 'india',
});

// Save a helpline with notes
saveResource('helpline-aasra', 'Very helpful for crisis situations');

// Get all saved resources with full details
const saved = getSavedResourcesWithDetails();
saved.forEach(({ resource, savedInfo }) => {
  console.log(resource.title, savedInfo.notes);
});
```

## File Structure

```
src/lib/resources/
├── types.ts           # TypeScript type definitions
├── dataset.ts         # Mental health resources data
├── helpers.ts         # Filtering, saving, validation functions
├── index.ts           # Main export file
└── README.md          # Detailed documentation

src/lib/__tests__/
├── resources.test.ts        # Comprehensive functionality tests (50 tests)
└── indiaHelplines.test.ts   # India-specific validation tests (22 tests)
```

## Future Enhancements

Potential improvements identified:
1. API integration for dynamic resource updates
2. User-specific encryption keys for saved resources
3. Resource usage analytics
4. Community ratings and feedback
5. Regional language support for resource descriptions
6. Integration with crisis detection system
7. Push notifications for new relevant resources
8. Resource recommendation engine based on user mood patterns

## Compliance

- All resources include proper attribution
- Helplines are verified and trusted sources
- Government resources clearly badged
- Privacy-preserving saved resource storage
- No personal data collected in resource interactions
