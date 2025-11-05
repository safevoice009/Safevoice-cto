/**
 * Emotion Analysis Store Integration Test
 * 
 * Tests integration between emotion analysis module and store
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from '../store';
import { analyzeEmotion, clearEmotionCache } from '../emotionAnalysis';

describe('Emotion Analysis - Store Integration', () => {
  beforeEach(() => {
    clearEmotionCache();
    // Reset store state
    useStore.setState({
      posts: [],
      studentId: 'test-student-1',
      firstPostAwarded: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create post with emotion analysis metadata', async () => {
    const store = useStore.getState();
    
    // Analyze emotion first
    const emotionResult = await analyzeEmotion(
      'I am so happy and excited about this project!',
      { useOfflineOnly: true }
    );

    // Create post with emotion analysis
    store.addPost(
      'I am so happy and excited about this project!',
      'General',
      '24h',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { ...emotionResult, detectedAt: Date.now() }
    );

    const posts = useStore.getState().posts;
    expect(posts).toHaveLength(1);
    
    const post = posts[0];
    expect(post.emotionAnalysis).toBeDefined();
    expect(post.emotionAnalysis?.emotion).toBe('Happy');
    expect(post.emotionAnalysis?.source).toBe('offline');
    expect(post.emotionAnalysis?.confidence).toBeGreaterThan(0);
    expect(post.emotionAnalysis?.detectedAt).toBeDefined();
  });

  it('should create post without emotion analysis', () => {
    const store = useStore.getState();
    
    store.addPost(
      'This is a neutral post',
      'General',
      '24h'
    );

    const posts = useStore.getState().posts;
    expect(posts).toHaveLength(1);
    
    const post = posts[0];
    expect(post.emotionAnalysis).toBeUndefined();
  });

  it('should store different emotion types correctly', async () => {
    const store = useStore.getState();
    
    const testCases = [
      { text: 'I am so sad and depressed', expectedEmotion: 'Sad' },
      { text: 'I am very anxious about the exam', expectedEmotion: 'Anxious' },
      { text: 'This makes me so angry', expectedEmotion: 'Angry' },
      { text: 'I am very happy today', expectedEmotion: 'Happy' },
    ];

    for (const testCase of testCases) {
      const emotionResult = await analyzeEmotion(testCase.text, { useOfflineOnly: true });
      
      store.addPost(
        testCase.text,
        'Mental Health',
        '24h',
        undefined,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        { ...emotionResult, detectedAt: Date.now() }
      );
    }

    const posts = useStore.getState().posts;
    expect(posts).toHaveLength(testCases.length);

    for (let i = 0; i < testCases.length; i++) {
      const post = posts[posts.length - 1 - i]; // Posts are in reverse order
      expect(post.emotionAnalysis).toBeDefined();
      expect(post.emotionAnalysis?.emotion).toBe(testCases[i].expectedEmotion);
    }
  });

  it('should preserve emotion metadata across state updates', async () => {
    const store = useStore.getState();
    
    const emotionResult = await analyzeEmotion(
      'I am happy',
      { useOfflineOnly: true }
    );

    store.addPost(
      'I am happy',
      'General',
      '24h',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { ...emotionResult, detectedAt: Date.now() }
    );

    const postId = useStore.getState().posts[0].id;

    // Add a reaction
    store.addReaction(postId, 'heart');

    // Check emotion metadata is still there
    const updatedPost = useStore.getState().posts[0];
    expect(updatedPost.emotionAnalysis).toBeDefined();
    expect(updatedPost.emotionAnalysis?.emotion).toBe('Happy');
    expect(updatedPost.reactions.heart).toBe(1);
  });

  it('should handle manual emotion override in store', async () => {
    const store = useStore.getState();
    
    const manualEmotion = await analyzeEmotion('Some text', {
      manualOverride: 'Anxious'
    });

    store.addPost(
      'Some text',
      'Academic Stress',
      '24h',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { ...manualEmotion, detectedAt: Date.now() }
    );

    const post = useStore.getState().posts[0];
    expect(post.emotionAnalysis?.emotion).toBe('Anxious');
    expect(post.emotionAnalysis?.source).toBe('manual');
    expect(post.emotionAnalysis?.confidence).toBe(1.0);
  });

  it('should store detectedAt timestamp', async () => {
    const store = useStore.getState();
    const beforeTime = Date.now();
    
    const emotionResult = await analyzeEmotion(
      'I am happy',
      { useOfflineOnly: true }
    );

    store.addPost(
      'I am happy',
      'General',
      '24h',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { ...emotionResult, detectedAt: Date.now() }
    );

    const afterTime = Date.now();

    const post = useStore.getState().posts[0];
    expect(post.emotionAnalysis?.detectedAt).toBeDefined();
    expect(post.emotionAnalysis?.detectedAt).toBeGreaterThanOrEqual(beforeTime);
    expect(post.emotionAnalysis?.detectedAt).toBeLessThanOrEqual(afterTime);
  });

  it('should work with encrypted posts', async () => {
    const store = useStore.getState();
    
    const emotionResult = await analyzeEmotion(
      'This is sensitive content',
      { useOfflineOnly: true }
    );

    const encryptedData = {
      encrypted: 'encrypted-content',
      iv: 'test-iv',
      keyId: 'test-key-id'
    };

    store.addPost(
      'This is sensitive content',
      'Mental Health',
      '24h',
      undefined,
      true,
      encryptedData,
      undefined,
      undefined,
      undefined,
      { ...emotionResult, detectedAt: Date.now() }
    );

    const post = useStore.getState().posts[0];
    expect(post.isEncrypted).toBe(true);
    expect(post.emotionAnalysis).toBeDefined();
    expect(post.content).toBe('encrypted-content');
  });

  it('should work with community posts', async () => {
    const store = useStore.getState();
    
    const emotionResult = await analyzeEmotion(
      'Community announcement',
      { useOfflineOnly: true }
    );

    store.addPost(
      'Community announcement',
      'General',
      '24h',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      {
        communityId: 'community-1',
        channelId: 'channel-1',
        visibility: 'campus',
        isAnonymous: false
      },
      { ...emotionResult, detectedAt: Date.now() }
    );

    const post = useStore.getState().posts[0];
    expect(post.communityId).toBe('community-1');
    expect(post.channelId).toBe('channel-1');
    expect(post.emotionAnalysis).toBeDefined();
  });

  it('should work with crisis-flagged posts', async () => {
    const store = useStore.getState();
    
    const emotionResult = await analyzeEmotion(
      'I am feeling very depressed',
      { useOfflineOnly: true }
    );

    store.addPost(
      'I am feeling very depressed',
      'Mental Health',
      '24h',
      undefined,
      false,
      undefined,
      {
        isCrisisFlagged: true,
        crisisLevel: 'high',
        needsReview: false
      },
      undefined,
      undefined,
      { ...emotionResult, detectedAt: Date.now() }
    );

    const post = useStore.getState().posts[0];
    expect(post.isCrisisFlagged).toBe(true);
    expect(post.crisisLevel).toBe('high');
    expect(post.emotionAnalysis?.emotion).toBe('Sad');
  });

  it('should store emotion confidence values correctly', async () => {
    const store = useStore.getState();
    
    const highConfidence = await analyzeEmotion(
      'Happy happy happy happy happy',
      { useOfflineOnly: true }
    );

    store.addPost(
      'Happy happy happy happy happy',
      'General',
      '24h',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { ...highConfidence, detectedAt: Date.now() }
    );

    const post = useStore.getState().posts[0];
    expect(post.emotionAnalysis?.confidence).toBeGreaterThan(0);
    expect(post.emotionAnalysis?.confidence).toBeLessThanOrEqual(1);
    expect(typeof post.emotionAnalysis?.confidence).toBe('number');
  });
});
