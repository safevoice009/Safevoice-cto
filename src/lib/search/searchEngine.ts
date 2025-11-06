import type { Post, Comment } from '../store';

export interface SearchResult {
  id: string;
  type: 'post' | 'comment';
  post: Post;
  comment?: Comment;
  score: number;
  highlights: {
    content: string;
    matches: Array<{ start: number; end: number }>;
  };
  metadata: {
    category?: string;
    securityLevel: 'public' | 'encrypted' | 'anonymous';
    communityId?: string | null;
    isEncrypted: boolean;
    visibility?: string;
  };
}

export interface SearchOptions {
  query: string;
  maxResults?: number;
  includeComments?: boolean;
}

export interface InvertedIndex {
  terms: Map<string, Set<string>>;
  documents: Map<string, { type: 'post' | 'comment'; post: Post; comment?: Comment }>;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
]);

/**
 * Tokenize text into searchable terms
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2 && !STOP_WORDS.has(term));
}

/**
 * Check if user has permission to view a post
 */
function hasPermission(post: Post, currentUserId: string): boolean {
  // Hidden posts should not appear in search
  if (post.moderationStatus === 'hidden') {
    return false;
  }
  
  // Check visibility
  if (post.visibility === 'private') {
    return post.studentId === currentUserId;
  }
  
  // Public and campus posts are visible to all
  return true;
}

/**
 * Build inverted index from posts and comments
 */
export function buildInvertedIndex(
  posts: Post[],
  currentUserId: string,
  includeComments = true
): InvertedIndex {
  const index: InvertedIndex = {
    terms: new Map(),
    documents: new Map(),
  };

  posts.forEach(post => {
    // Only index posts user has permission to see
    if (!hasPermission(post, currentUserId)) {
      return;
    }

    const docId = `post-${post.id}`;
    
    // Store document reference
    index.documents.set(docId, { type: 'post', post });

    // For encrypted posts, we can't index content
    // Instead, index other metadata
    const contentToIndex = post.isEncrypted 
      ? `[encrypted] ${post.category || ''}`
      : post.content;

    // Tokenize and add to index
    const tokens = tokenize(contentToIndex);
    tokens.forEach(token => {
      if (!index.terms.has(token)) {
        index.terms.set(token, new Set());
      }
      index.terms.get(token)!.add(docId);
    });

    // Also index category
    if (post.category) {
      const categoryTokens = tokenize(post.category);
      categoryTokens.forEach(token => {
        if (!index.terms.has(token)) {
          index.terms.set(token, new Set());
        }
        index.terms.get(token)!.add(docId);
      });
    }

    // Index comments if enabled
    if (includeComments && post.comments) {
      post.comments.forEach(comment => {
        const commentDocId = `comment-${comment.id}`;
        
        index.documents.set(commentDocId, { 
          type: 'comment', 
          post, 
          comment 
        });

        const commentTokens = tokenize(comment.content);
        commentTokens.forEach(token => {
          if (!index.terms.has(token)) {
            index.terms.set(token, new Set());
          }
          index.terms.get(token)!.add(commentDocId);
        });

        // Index nested replies
        if (comment.replies) {
          comment.replies.forEach(reply => {
            const replyDocId = `comment-${reply.id}`;
            
            index.documents.set(replyDocId, { 
              type: 'comment', 
              post, 
              comment: reply 
            });

            const replyTokens = tokenize(reply.content);
            replyTokens.forEach(token => {
              if (!index.terms.has(token)) {
                index.terms.set(token, new Set());
              }
              index.terms.get(token)!.add(replyDocId);
            });
          });
        }
      });
    }
  });

  return index;
}

/**
 * Calculate TF-IDF score for relevance ranking
 */
function calculateScore(
  queryTerms: string[],
  docId: string,
  index: InvertedIndex
): number {
  const totalDocs = index.documents.size;
  let score = 0;

  queryTerms.forEach(term => {
    const docsWithTerm = index.terms.get(term);
    if (!docsWithTerm || !docsWithTerm.has(docId)) {
      return;
    }

    // Term frequency (simplified: 1 if present)
    const tf = 1;

    // Inverse document frequency
    const df = docsWithTerm.size;
    const idf = Math.log(totalDocs / (df + 1));

    score += tf * idf;
  });

  return score;
}

/**
 * Highlight matched terms in text
 */
function highlightMatches(
  text: string,
  queryTerms: string[]
): { content: string; matches: Array<{ start: number; end: number }> } {
  const matches: Array<{ start: number; end: number }> = [];
  const lowerText = text.toLowerCase();

  queryTerms.forEach(term => {
    let pos = 0;
    while ((pos = lowerText.indexOf(term, pos)) !== -1) {
      matches.push({ start: pos, end: pos + term.length });
      pos += term.length;
    }
  });

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  return { content: text, matches };
}

/**
 * Get security level for a post
 */
function getSecurityLevel(post: Post): 'public' | 'encrypted' | 'anonymous' {
  if (post.isEncrypted) return 'encrypted';
  if (post.isAnonymous) return 'anonymous';
  return 'public';
}

/**
 * Search the inverted index
 */
export function searchIndex(
  index: InvertedIndex,
  options: SearchOptions
): SearchResult[] {
  const { query, maxResults = 50, includeComments = true } = options;
  
  if (!query.trim()) {
    return [];
  }

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    return [];
  }

  // Find all documents matching any query term
  const matchingDocs = new Set<string>();
  queryTerms.forEach(term => {
    const docs = index.terms.get(term);
    if (docs) {
      docs.forEach(docId => matchingDocs.add(docId));
    }
  });

  // Calculate scores and build results
  const results: SearchResult[] = [];
  
  matchingDocs.forEach(docId => {
    const doc = index.documents.get(docId);
    if (!doc) return;

    // Filter comments if not included
    if (!includeComments && doc.type === 'comment') {
      return;
    }

    const score = calculateScore(queryTerms, docId, index);
    
    // Get content to highlight
    let contentToHighlight = '';
    if (doc.type === 'post') {
      contentToHighlight = doc.post.isEncrypted 
        ? '[Encrypted content - decrypt to view]' 
        : doc.post.content;
    } else if (doc.comment) {
      contentToHighlight = doc.comment.content;
    }

    const highlights = highlightMatches(contentToHighlight, queryTerms);

    results.push({
      id: docId,
      type: doc.type,
      post: doc.post,
      comment: doc.comment,
      score,
      highlights,
      metadata: {
        category: doc.post.category,
        securityLevel: getSecurityLevel(doc.post),
        communityId: doc.post.communityId,
        isEncrypted: doc.post.isEncrypted,
        visibility: doc.post.visibility,
      },
    });
  });

  // Sort by relevance score (descending)
  results.sort((a, b) => b.score - a.score);

  // Limit results
  return results.slice(0, maxResults);
}

/**
 * Supabase full-text search (when available)
 * This is a placeholder for when Supabase integration is added
 */
export async function searchSupabase(
  _options: SearchOptions
): Promise<SearchResult[]> {
  void _options;
  // Check if Supabase is configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }

  // TODO: Implement Supabase full-text search
  // This would use Supabase's built-in full-text search capabilities
  // For now, throw an error to fall back to client-side search
  throw new Error('Supabase search not yet implemented');
}

/**
 * Main search function that uses appropriate backend
 */
export async function search(
  posts: Post[],
  currentUserId: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  // Try Supabase first if configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      return await searchSupabase(options);
    } catch (error) {
      // Fall back to client-side search
      console.warn('Supabase search failed, falling back to client-side:', error);
    }
  }

  // Use client-side inverted index
  const index = buildInvertedIndex(posts, currentUserId, options.includeComments);
  return searchIndex(index, options);
}
