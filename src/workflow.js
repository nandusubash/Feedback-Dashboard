import { WorkflowEntrypoint } from 'cloudflare:workers';
import { indexFeedback } from './embeddings.js';

/**
 * FeedbackWorkflow - Automated feedback analysis pipeline
 * 
 * This workflow orchestrates the multi-step process of analyzing customer feedback:
 * 1. Fetch unprocessed feedback from database
 * 2. Analyze each feedback item using Workers AI (sentiment, themes, urgency)
 * 3. Update database with analysis results
 * 4. Generate embeddings and index for semantic search
 * 5. Clear analytics cache to reflect new data
 */
export class FeedbackWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    console.log('🚀 Starting FeedbackWorkflow...');

    // Step 1: Fetch unprocessed feedback from database
    const feedbackItems = await step.do('fetch-feedback', async () => {
      console.log('📥 Fetching unprocessed feedback...');
      
      try {
        const { results } = await this.env.DB.prepare(
          'SELECT id, content FROM feedback WHERE processed = 0 LIMIT 10'
        ).all();

        console.log(`✅ Found ${results.length} unprocessed feedback items`);
        return results;
      } catch (error) {
        console.error('❌ Error fetching feedback:', error);
        throw error;
      }
    });

    // If no feedback to process, exit early
    if (!feedbackItems || feedbackItems.length === 0) {
      console.log('ℹ️ No unprocessed feedback found');
      return {
        processed: 0,
        message: 'No unprocessed feedback to analyze'
      };
    }

    // Step 2: Analyze each feedback item
    const analysisResults = [];
    
    for (const item of feedbackItems) {
      const result = await step.do(`analyze-${item.id}`, async () => {
        console.log(`🔍 Analyzing feedback ${item.id}...`);
        
        let sentiment = 'neutral';
        let sentimentScore = 0;
        let themes = [];
        let urgency = 'medium';

        try {
          // a) Sentiment Analysis
          try {
            const sentimentPrompt = `Analyze the sentiment of this feedback. Return ONLY a JSON object: {sentiment: 'positive' or 'neutral' or 'negative', score: -1 to 1}. Feedback: ${item.content}`;
            
            const sentimentResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              messages: [{ role: 'user', content: sentimentPrompt }],
              temperature: 0.3,
              max_tokens: 100
            });

            // Parse sentiment response
            const sentimentText = sentimentResponse.response.trim();
            const sentimentMatch = sentimentText.match(/\{[\s\S]*?\}/);
            
            if (sentimentMatch) {
              const sentimentData = JSON.parse(sentimentMatch[0]);
              sentiment = sentimentData.sentiment || 'neutral';
              sentimentScore = sentimentData.score || 0;
              
              // Validate sentiment value
              if (!['positive', 'neutral', 'negative'].includes(sentiment)) {
                sentiment = 'neutral';
              }
              
              // Normalize score to -1 to 1 range
              sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
            }
            
            console.log(`  Sentiment: ${sentiment} (${sentimentScore})`);
          } catch (sentimentError) {
            console.error(`  ⚠️ Sentiment analysis failed for ${item.id}:`, sentimentError.message);
            // Keep defaults: neutral, 0
          }

          // b) Theme Extraction
          try {
            const themePrompt = `Extract 1-3 key themes from this feedback as a JSON array of lowercase strings. Example: ['performance', 'ui_ux']. Feedback: ${item.content}`;
            
            const themeResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              messages: [{ role: 'user', content: themePrompt }],
              temperature: 0.3,
              max_tokens: 100
            });

            // Parse theme response
            const themeText = themeResponse.response.trim();
            const themeMatch = themeText.match(/\[[\s\S]*?\]/);
            
            if (themeMatch) {
              const parsedThemes = JSON.parse(themeMatch[0]);
              if (Array.isArray(parsedThemes)) {
                themes = parsedThemes.slice(0, 3); // Limit to 3 themes
              }
            }
            
            // If no themes extracted, use 'general' as fallback
            if (themes.length === 0) {
              themes = ['general'];
            }
            
            console.log(`  Themes: ${themes.join(', ')}`);
          } catch (themeError) {
            console.error(`  ⚠️ Theme extraction failed for ${item.id}:`, themeError.message);
            themes = ['general']; // Fallback
          }

          // c) Urgency Classification
          try {
            const urgencyPrompt = `Classify urgency of this feedback. Return ONLY one word: low, medium, high, or critical. Feedback: ${item.content}`;
            
            const urgencyResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              messages: [{ role: 'user', content: urgencyPrompt }],
              temperature: 0.3,
              max_tokens: 50
            });

            // Parse urgency response
            const urgencyText = urgencyResponse.response.trim().toLowerCase();
            
            if (urgencyText.includes('critical')) {
              urgency = 'critical';
            } else if (urgencyText.includes('high')) {
              urgency = 'high';
            } else if (urgencyText.includes('low')) {
              urgency = 'low';
            } else if (urgencyText.includes('medium')) {
              urgency = 'medium';
            }
            // else keep default 'medium'
            
            console.log(`  Urgency: ${urgency}`);
          } catch (urgencyError) {
            console.error(`  ⚠️ Urgency classification failed for ${item.id}:`, urgencyError.message);
            // Keep default: medium
          }

          // d) Update Database
          try {
            await this.env.DB.prepare(
              `UPDATE feedback 
               SET sentiment = ?, sentiment_score = ?, urgency = ?, themes = ?, processed = 1 
               WHERE id = ?`
            )
              .bind(sentiment, sentimentScore, urgency, JSON.stringify(themes), item.id)
              .run();

            console.log(`✅ Updated feedback ${item.id} in database`);
            
            return {
              id: item.id,
              sentiment,
              sentimentScore,
              urgency,
              themes,
              success: true
            };
          } catch (dbError) {
            console.error(`❌ Database update failed for ${item.id}:`, dbError);
            throw dbError;
          }

        } catch (error) {
          console.error(`❌ Analysis failed for feedback ${item.id}:`, error);
          return {
            id: item.id,
            success: false,
            error: error.message
          };
        }
      });

      analysisResults.push(result);
    }

    // Step 3: Generate embeddings for semantic search
    const embeddingResults = [];
    
    for (const result of analysisResults) {
      if (result.success) {
        const embedResult = await step.do(`embed-${result.id}`, async () => {
          console.log(`🔍 Generating embedding for feedback ${result.id}...`);
          
          try {
            // Find the original feedback content
            const feedbackItem = feedbackItems.find(f => f.id === result.id);
            if (!feedbackItem) {
              throw new Error('Feedback item not found');
            }
            
            // Generate and index embedding
            const indexResult = await indexFeedback(result.id, feedbackItem.content, this.env);
            
            if (indexResult.success) {
              console.log(`✅ Embedded feedback ${result.id}`);
            }
            
            return indexResult;
          } catch (error) {
            console.error(`⚠️ Failed to embed feedback ${result.id}:`, error);
            return { success: false, id: result.id, error: error.message };
          }
        });
        
        embeddingResults.push(embedResult);
      }
    }

    // Step 4: Clear analytics cache
    await step.do('clear-cache', async () => {
      console.log('🗑️ Clearing analytics cache...');
      
      try {
        await this.env.KV.delete('analytics:latest');
        console.log('✅ Analytics cache cleared');
        return { cleared: true };
      } catch (error) {
        console.error('⚠️ Failed to clear cache:', error);
        // Non-critical error, continue
        return { cleared: false, error: error.message };
      }
    });

    // Count successful analyses and embeddings
    const successCount = analysisResults.filter(r => r.success).length;
    const embeddedCount = embeddingResults.filter(r => r.success).length;
    
    console.log(`🎉 Workflow completed: ${successCount}/${feedbackItems.length} items processed, ${embeddedCount} embedded successfully`);

    return {
      processed: feedbackItems.length,
      successful: successCount,
      embedded: embeddedCount,
      failed: feedbackItems.length - successCount,
      results: analysisResults,
      message: 'Workflow completed with AI indexing'
    };
  }
}
