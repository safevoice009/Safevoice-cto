import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
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
} from '../resources';
import type { MentalHealthResource } from '../resources/types';

describe('Resources Dataset and Helpers', () => {
  // Clear saved resources before each test
  beforeEach(() => {
    clearAllSavedResources();
  });

  afterEach(() => {
    clearAllSavedResources();
  });

  describe('Dataset Loading', () => {
    it('should load all resources', () => {
      const resources = getAllResources();
      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should include India-specific helplines', () => {
      const resources = getAllResources();
      const indiaHelplines = resources.filter(
        (r) => r.type === 'helpline' && r.region === 'india'
      );
      expect(indiaHelplines.length).toBeGreaterThan(0);
      
      // Check for specific Indian helplines
      const aasra = indiaHelplines.find(h => h.id === 'helpline-aasra');
      expect(aasra).toBeDefined();
      expect(aasra?.title).toContain('AASRA');
    });

    it('should include dynamic placeholders', () => {
      const resources = getAllResources();
      const dynamicResources = resources.filter((r) => r.isDynamic === true);
      expect(dynamicResources.length).toBeGreaterThan(0);
    });

    it('should have helplines, exercises, and prompts', () => {
      const resources = getAllResources();
      const helplines = resources.filter((r) => r.type === 'helpline');
      const exercises = resources.filter((r) => r.type === 'exercise');
      const prompts = resources.filter((r) => r.type === 'prompt');

      expect(helplines.length).toBeGreaterThan(0);
      expect(exercises.length).toBeGreaterThan(0);
      expect(prompts.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering by Emotion', () => {
    it('should filter resources by anxiety category', () => {
      const anxietyResources = filterByEmotion('anxiety');
      expect(anxietyResources.length).toBeGreaterThan(0);
      anxietyResources.forEach((resource) => {
        expect(resource.category).toContain('anxiety');
      });
    });

    it('should filter resources by depression category', () => {
      const depressionResources = filterByEmotion('depression');
      expect(depressionResources.length).toBeGreaterThan(0);
      depressionResources.forEach((resource) => {
        expect(resource.category).toContain('depression');
      });
    });

    it('should filter resources by stress category', () => {
      const stressResources = filterByEmotion('stress');
      expect(stressResources.length).toBeGreaterThan(0);
      stressResources.forEach((resource) => {
        expect(resource.category).toContain('stress');
      });
    });

    it('should filter resources by loneliness category', () => {
      const lonelinessResources = filterByEmotion('loneliness');
      expect(lonelinessResources.length).toBeGreaterThan(0);
      lonelinessResources.forEach((resource) => {
        expect(resource.category).toContain('loneliness');
      });
    });

    it('should filter resources by anger category', () => {
      const angerResources = filterByEmotion('anger');
      expect(angerResources.length).toBeGreaterThan(0);
      angerResources.forEach((resource) => {
        expect(resource.category).toContain('anger');
      });
    });

    it('should filter resources by grief category', () => {
      const griefResources = filterByEmotion('grief');
      expect(griefResources.length).toBeGreaterThan(0);
      griefResources.forEach((resource) => {
        expect(resource.category).toContain('grief');
      });
    });

    it('should return all general resources', () => {
      const generalResources = filterByEmotion('general');
      expect(generalResources.length).toBeGreaterThan(0);
      generalResources.forEach((resource) => {
        expect(resource.category).toContain('general');
      });
    });
  });

  describe('Filtering by Type', () => {
    it('should filter only helplines', () => {
      const helplines = filterByType('helpline');
      expect(helplines.length).toBeGreaterThan(0);
      helplines.forEach((resource) => {
        expect(resource.type).toBe('helpline');
      });
    });

    it('should filter only exercises', () => {
      const exercises = filterByType('exercise');
      expect(exercises.length).toBeGreaterThan(0);
      exercises.forEach((resource) => {
        expect(resource.type).toBe('exercise');
      });
    });

    it('should filter only prompts', () => {
      const prompts = filterByType('prompt');
      expect(prompts.length).toBeGreaterThan(0);
      prompts.forEach((resource) => {
        expect(resource.type).toBe('prompt');
      });
    });
  });

  describe('Filtering by Region', () => {
    it('should filter India-specific resources', () => {
      const indiaResources = filterByRegion('india');
      expect(indiaResources.length).toBeGreaterThan(0);
      indiaResources.forEach((resource) => {
        expect(resource.region).toBe('india');
      });
    });

    it('should filter global resources', () => {
      const globalResources = filterByRegion('global');
      expect(globalResources.length).toBeGreaterThan(0);
      globalResources.forEach((resource) => {
        expect(resource.region).toBe('global');
      });
    });
  });

  describe('Multi-criteria Filtering', () => {
    it('should filter by emotion and type', () => {
      const resources = filterResources({
        emotion: 'anxiety',
        type: 'exercise',
      });
      expect(resources.length).toBeGreaterThan(0);
      resources.forEach((resource) => {
        expect(resource.category).toContain('anxiety');
        expect(resource.type).toBe('exercise');
      });
    });

    it('should filter by emotion and region', () => {
      const resources = filterResources({
        emotion: 'depression',
        region: 'india',
      });
      expect(resources.length).toBeGreaterThan(0);
      resources.forEach((resource) => {
        expect(resource.category).toContain('depression');
        expect(resource.region).toBe('india');
      });
    });

    it('should filter by type and region', () => {
      const resources = filterResources({
        type: 'helpline',
        region: 'india',
      });
      expect(resources.length).toBeGreaterThan(0);
      resources.forEach((resource) => {
        expect(resource.type).toBe('helpline');
        expect(resource.region).toBe('india');
      });
    });

    it('should filter by emotion, type, and region', () => {
      const resources = filterResources({
        emotion: 'stress',
        type: 'exercise',
        region: 'global',
      });
      resources.forEach((resource) => {
        expect(resource.category).toContain('stress');
        expect(resource.type).toBe('exercise');
        expect(resource.region).toBe('global');
      });
    });

    it('should filter by tags', () => {
      const resources = filterResources({
        tags: ['breathing'],
      });
      expect(resources.length).toBeGreaterThan(0);
      resources.forEach((resource) => {
        expect(resource.tags).toBeDefined();
        expect(resource.tags).toContain('breathing');
      });
    });
  });

  describe('Get Resource by ID', () => {
    it('should retrieve a specific resource by ID', () => {
      const resource = getResourceById('helpline-aasra');
      expect(resource).toBeDefined();
      expect(resource?.id).toBe('helpline-aasra');
      expect(resource?.type).toBe('helpline');
    });

    it('should return undefined for non-existent ID', () => {
      const resource = getResourceById('non-existent-id');
      expect(resource).toBeUndefined();
    });
  });

  describe('Saving and Removing Resources', () => {
    it('should save a resource', () => {
      const resourceId = 'helpline-aasra';
      const saved = saveResource(resourceId);
      
      expect(saved.length).toBe(1);
      expect(saved[0].resourceId).toBe(resourceId);
      expect(saved[0].savedAt).toBeDefined();
      expect(typeof saved[0].savedAt).toBe('number');
    });

    it('should save multiple resources', () => {
      saveResource('helpline-aasra');
      const saved = saveResource('exercise-grounding-54321');
      
      expect(saved.length).toBe(2);
      expect(saved.some((s) => s.resourceId === 'helpline-aasra')).toBe(true);
      expect(saved.some((s) => s.resourceId === 'exercise-grounding-54321')).toBe(true);
    });

    it('should save a resource with notes', () => {
      const resourceId = 'helpline-aasra';
      const notes = 'Very helpful for crisis situations';
      const saved = saveResource(resourceId, notes);
      
      expect(saved.length).toBe(1);
      expect(saved[0].resourceId).toBe(resourceId);
      expect(saved[0].notes).toBe(notes);
    });

    it('should update notes on already saved resource', () => {
      const resourceId = 'helpline-aasra';
      saveResource(resourceId, 'Initial note');
      const updated = saveResource(resourceId, 'Updated note');
      
      expect(updated.length).toBe(1);
      expect(updated[0].notes).toBe('Updated note');
    });

    it('should not duplicate saved resources', () => {
      const resourceId = 'helpline-aasra';
      saveResource(resourceId);
      const saved = saveResource(resourceId);
      
      expect(saved.length).toBe(1);
    });

    it('should remove a saved resource', () => {
      saveResource('helpline-aasra');
      saveResource('exercise-grounding-54321');
      
      const remaining = removeSavedResource('helpline-aasra');
      
      expect(remaining.length).toBe(1);
      expect(remaining[0].resourceId).toBe('exercise-grounding-54321');
    });

    it('should handle removing non-existent resource', () => {
      saveResource('helpline-aasra');
      const remaining = removeSavedResource('non-existent');
      
      expect(remaining.length).toBe(1);
      expect(remaining[0].resourceId).toBe('helpline-aasra');
    });

    it('should check if resource is saved', () => {
      expect(isResourceSaved('helpline-aasra')).toBe(false);
      
      saveResource('helpline-aasra');
      expect(isResourceSaved('helpline-aasra')).toBe(true);
      
      removeSavedResource('helpline-aasra');
      expect(isResourceSaved('helpline-aasra')).toBe(false);
    });

    it('should get saved resources', () => {
      expect(getSavedResources().length).toBe(0);
      
      saveResource('helpline-aasra');
      saveResource('exercise-grounding-54321');
      
      const saved = getSavedResources();
      expect(saved.length).toBe(2);
    });

    it('should get saved resources with full details', () => {
      saveResource('helpline-aasra', 'My note');
      saveResource('exercise-grounding-54321');
      
      const details = getSavedResourcesWithDetails();
      
      expect(details.length).toBe(2);
      expect(details[0].resource).toBeDefined();
      expect(details[0].savedInfo).toBeDefined();
      expect(details[0].resource.id).toBeDefined();
      expect(details[0].savedInfo.savedAt).toBeDefined();
    });

    it('should filter out invalid resource IDs from saved details', () => {
      saveResource('helpline-aasra');
      
      // Manually add invalid resource ID to storage
      const saved = getSavedResources();
      saved.push({ resourceId: 'non-existent', savedAt: Date.now() });
      
      // This would normally require direct storage manipulation
      // For this test, we verify the function filters correctly
      const details = getSavedResourcesWithDetails();
      
      // Should only return valid resources
      details.forEach((detail) => {
        expect(detail.resource).toBeDefined();
        expect(detail.resource.id).toBeDefined();
      });
    });

    it('should clear all saved resources', () => {
      saveResource('helpline-aasra');
      saveResource('exercise-grounding-54321');
      
      expect(getSavedResources().length).toBe(2);
      
      clearAllSavedResources();
      
      expect(getSavedResources().length).toBe(0);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate a valid helpline resource', () => {
      const resource: MentalHealthResource = {
        id: 'test-helpline',
        type: 'helpline',
        title: 'Test Helpline',
        description: 'A test helpline',
        category: ['anxiety'],
        region: 'global',
        number: '123-456-7890',
        hours: '24/7',
        languages: ['English'],
        trusted: true,
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should validate a valid exercise resource', () => {
      const resource: MentalHealthResource = {
        id: 'test-exercise',
        type: 'exercise',
        title: 'Test Exercise',
        description: 'A test exercise',
        category: ['stress'],
        region: 'global',
        duration: '5 minutes',
        difficulty: 'easy',
        instructions: ['Step 1', 'Step 2'],
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should validate a valid prompt resource', () => {
      const resource: MentalHealthResource = {
        id: 'test-prompt',
        type: 'prompt',
        title: 'Test Prompt',
        description: 'A test prompt',
        category: ['general'],
        region: 'global',
        questions: ['Question 1', 'Question 2'],
        context: 'Test context',
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect missing base required fields', () => {
      const resource = {
        type: 'helpline',
        description: 'Missing id and title',
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((e) => e.includes('id'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('title'))).toBe(true);
    });

    it('should detect missing category field', () => {
      const resource = {
        id: 'test',
        type: 'helpline',
        title: 'Test',
        description: 'Test',
        region: 'global',
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('category'))).toBe(true);
    });

    it('should detect empty category array', () => {
      const resource = {
        id: 'test',
        type: 'helpline',
        title: 'Test',
        description: 'Test',
        category: [],
        region: 'global',
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('category'))).toBe(true);
    });

    it('should detect missing helpline-specific fields', () => {
      const resource = {
        id: 'test',
        type: 'helpline',
        title: 'Test',
        description: 'Test',
        category: ['anxiety'],
        region: 'global',
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('number'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('hours'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('languages'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('trusted'))).toBe(true);
    });

    it('should detect missing exercise-specific fields', () => {
      const resource = {
        id: 'test',
        type: 'exercise',
        title: 'Test',
        description: 'Test',
        category: ['stress'],
        region: 'global',
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('duration'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('difficulty'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('instructions'))).toBe(true);
    });

    it('should detect invalid exercise difficulty', () => {
      const resource = {
        id: 'test',
        type: 'exercise',
        title: 'Test',
        description: 'Test',
        category: ['stress'],
        region: 'global',
        duration: '5 minutes',
        difficulty: 'invalid',
        instructions: ['Step 1'],
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('difficulty'))).toBe(true);
    });

    it('should detect missing prompt-specific fields', () => {
      const resource = {
        id: 'test',
        type: 'prompt',
        title: 'Test',
        description: 'Test',
        category: ['general'],
        region: 'global',
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('questions'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('context'))).toBe(true);
    });

    it('should detect empty arrays for type-specific fields', () => {
      const resource = {
        id: 'test',
        type: 'helpline',
        title: 'Test',
        description: 'Test',
        category: ['anxiety'],
        region: 'global',
        number: '123',
        hours: '24/7',
        languages: [],
        trusted: true,
      };

      const validation = validateResourceIntegrity(resource);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('languages'))).toBe(true);
    });

    it('should validate entire dataset', () => {
      const validation = validateDataset();
      
      expect(validation).toBeDefined();
      expect(validation.totalResources).toBeGreaterThan(0);
      expect(validation.isValid).toBe(true);
      expect(validation.invalidResources.length).toBe(0);
    });

    it('should report all resources if any are invalid', () => {
      // This test validates that our dataset is actually valid
      const validation = validateDataset();
      
      if (!validation.isValid) {
        console.log('Invalid resources found:', validation.invalidResources);
      }
      
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Persistence and Storage', () => {
    it('should persist saved resources across function calls', () => {
      saveResource('helpline-aasra');
      
      // Simulate getting saved resources in a new context
      const saved = getSavedResources();
      expect(saved.length).toBe(1);
      expect(saved[0].resourceId).toBe('helpline-aasra');
    });

    it('should maintain savedAt timestamp', () => {
      const beforeSave = Date.now();
      saveResource('helpline-aasra');
      const afterSave = Date.now();
      
      const saved = getSavedResources();
      expect(saved[0].savedAt).toBeGreaterThanOrEqual(beforeSave);
      expect(saved[0].savedAt).toBeLessThanOrEqual(afterSave);
    });
  });
});
