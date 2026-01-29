/**
 * Embeddings Module - Vector Embeddings and Semantic Search
 * 
 * This module handles:
 * 1. Generating text embeddings using Workers AI
 * 2. Indexing feedback in Vectorize for semantic search
 * 3. Searching for similar feedback based on meaning, not just keywords
 * 4. Batch indexing operations
 * 
 * Semantic search allows finding feedback with similar meaning even if they use
 * different words. For example, "slow performance" will match "app is laggy" and
 * "takes forever to load" because they share semantic similarity.
 */

/**
 * Generate embedding vector for text using Workers AI
 * 
 * Uses the BGE (BAAI General Embedding) model which produces 768-dimensional
 * vectors that capture semantic meaning of text.
 * 
 * @param {string} text - Text to generate embedding for
 * @param {Object} env - Worker environment with AI binding
 * @returns {Promise<number[]>} - 768-dimensional embedding vector
 */
export async function generateEmbedding(text, env) {
  try {
    console.log(`📊 Generating embedding for text: "${text.substring(0, 50)}..."`);
    
    // Use BGE Base model - produces 768-dimensional embeddings
    const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: text
    });

    // Extract the embedding vector from response
    const embedding = response.data[0];
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from AI model');
    }

    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    return embedding;

  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Index a single feedback item in Vectorize
 * 
 * Generates an embedding for the feedback content and stores it in Vectorize
 * with metadata for later retrieval. This enables semantic search across all feedback.
 * 
 * @param {number} feedbackId - Unique ID of the feedback
 * @param {string} content - Feedback content text
 * @param {Object} env - Worker environment with AI and VECTORIZE bindings
 * @returns {Promise<Object>} - {success: boolean, id: number}
 */
export async function indexFeedback(feedbackId, content, env) {
  try {
    console.log(`🔍 Indexing feedback ${feedbackId}...`);

    // Generate embedding vector for the content
    const embedding = await generateEmbedding(content, env);

    // Store in Vectorize with metadata
    // The vector ID is the feedback ID, and we store the content as metadata
    await env.VECTORIZE.insert([
      {
        id: feedbackId.toString(),
        values: embedding,
        metadata: {
          id: feedbackId,
          content: content
        }
      }
    ]);

    console.log(`✅ Successfully indexed feedback ${feedbackId}`);
    return { success: true, id: feedbackId };

  } catch (error) {
    console.error(`❌ Error indexing feedback ${feedbackId}:`, error);
    return { success: false, id: feedbackId, error: error.message };
  }
}

/**
 * Search for similar feedback using semantic search
 * 
 * Converts the query text into an embedding and finds the most similar
 * feedback items in the vector database. This enables "meaning-based" search
 * rather than just keyword matching.
 * 
 * Example: Query "slow app" will find:
 * - "The application takes forever to load"
 * - "Performance is terrible"
 * - "Everything is so laggy"
 * 
 * @param {string} query - Search query text
 * @param {number} limit - Maximum number of results (default: 10)
 * @param {Object} env - Worker environment with AI and VECTORIZE bindings
 * @returns {Promise<Array>} - Array of {id, content, similarity} objects
 */
export async function searchSimilar(query, limit = 10, env) {
  try {
    console.log(`🔎 Searching for feedback similar to: "${query}"`);

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query, env);

    // Search Vectorize for similar vectors
    const results = await env.VECTORIZE.query(queryEmbedding, {
      topK: limit,
      returnMetadata: true
    });

    // Transform results into a clean format
    const matches = results.matches.map(match => ({
      id: parseInt(match.id),
      content: match.metadata.content,
      similarity: match.score // Cosine similarity score (0-1, higher is more similar)
    }));

    // Sort by similarity score (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);

    console.log(`✅ Found ${matches.length} similar feedback items`);
    return matches;

  } catch (error) {
    console.error('❌ Error searching similar feedback:', error);
    throw new Error(`Semantic search failed: ${error.message}`);
  }
}

/**
 * Batch index all feedback from the database
 * 
 * Fetches all feedback items from D1 and generates embeddings for each,
 * then bulk inserts them into Vectorize. This is useful for initial setup
 * or re-indexing after changes.
 * 
 * @param {Object} env - Worker environment with DB, AI, and VECTORIZE bindings
 * @returns {Promise<Object>} - {success: boolean, indexed: number, failed: number}
 */
export async function indexAllFeedback(env) {
  try {
    console.log('🚀 Starting batch indexing of all feedback...');

    // Fetch all feedback from D1
    const { results: allFeedback } = await env.DB.prepare(
      'SELECT id, content FROM feedback'
    ).all();

    if (!allFeedback || allFeedback.length === 0) {
      console.log('ℹ️ No feedback found to index');
      return { success: true, indexed: 0, failed: 0 };
    }

    console.log(`📦 Found ${allFeedback.length} feedback items to index`);

    let indexed = 0;
    let failed = 0;
    const batchSize = 10; // Process in batches to avoid overwhelming the AI

    // Process feedback in batches
    for (let i = 0; i < allFeedback.length; i += batchSize) {
      const batch = allFeedback.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allFeedback.length / batchSize)}...`);

      // Generate embeddings for batch
      const vectors = [];
      
      for (const feedback of batch) {
        try {
          const embedding = await generateEmbedding(feedback.content, env);
          
          vectors.push({
            id: feedback.id.toString(),
            values: embedding,
            metadata: {
              id: feedback.id,
              content: feedback.content
            }
          });
          
          indexed++;
        } catch (error) {
          console.error(`Failed to generate embedding for feedback ${feedback.id}:`, error);
          failed++;
        }
      }

      // Bulk insert batch into Vectorize
      if (vectors.length > 0) {
        try {
          await env.VECTORIZE.insert(vectors);
          console.log(`✅ Indexed batch of ${vectors.length} items`);
        } catch (error) {
          console.error('❌ Error inserting batch into Vectorize:', error);
          failed += vectors.length;
          indexed -= vectors.length;
        }
      }
    }

    console.log(`🎉 Batch indexing complete: ${indexed} indexed, ${failed} failed`);
    
    return {
      success: true,
      indexed,
      failed,
      total: allFeedback.length
    };

  } catch (error) {
    console.error('❌ Error in batch indexing:', error);
    throw new Error(`Batch indexing failed: ${error.message}`);
  }
}
