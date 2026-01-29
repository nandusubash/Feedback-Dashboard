/**
 * Feedback Dashboard API - Cloudflare Worker
 * 
 * This worker provides API endpoints for managing feedback data with:
 * - D1 database for storage
 * - Workers AI for sentiment analysis and theme extraction
 * - KV for caching analytics
 * - Static file serving for dashboard UI
 */

import { seedDatabase } from './seed.js';
import indexHtml from '../public/index.html';
import stylesCss from '../public/styles.css';

/**
 * Helper function to read static files
 * @param {string} path - File path relative to public/ directory
 * @returns {string} File content
 */
function readFile(path) {
  const files = {
    '/': indexHtml,
    '/index.html': indexHtml,
    '/styles.css': stylesCss,
  };

  if (path in files) {
    return files[path];
  }

  throw new Error(`File not found: ${path}`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      // ========================================
      // STATIC FILE ROUTES
      // ========================================

      // Route: GET / - Serve dashboard HTML
      if ((path === '/' || path === '/index.html') && method === 'GET') {
        try {
          const content = readFile(path === '/' ? '/' : path);
          return new Response(content, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/html; charset=utf-8',
            },
          });
        } catch (error) {
          return new Response('File not found', {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          });
        }
      }

      // Route: GET /styles.css - Serve CSS
      if (path === '/styles.css' && method === 'GET') {
        try {
          const content = readFile('/styles.css');
          return new Response(content, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/css; charset=utf-8',
            },
          });
        } catch (error) {
          return new Response('File not found', {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          });
        }
      }

      // Route: GET /cards.css - Serve Cards CSS
      if (path === '/cards.css' && method === 'GET') {
        try {
          const content = readFile('/cards.css');
          return new Response(content, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/css; charset=utf-8',
            },
          });
        } catch (error) {
          return new Response('File not found', {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          });
        }
      }

      // Route: GET /critical.css - Serve Critical CSS
      if (path === '/critical.css' && method === 'GET') {
        try {
          const content = readFile('/critical.css');
          return new Response(content, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/css; charset=utf-8',
            },
          });
        } catch (error) {
          return new Response('File not found', {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          });
        }
      }

      // Route: GET /app.js - Serve JavaScript (if exists)
      if (path === '/app.js' && method === 'GET') {
        return new Response('// No app.js file yet', {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/javascript; charset=utf-8',
          },
        });
      }

      // ========================================
      // API ROUTES
      // ========================================

      // Route: POST /api/feedback - Create new feedback entry
      if (path === '/api/feedback' && method === 'POST') {
        const { source, content, author } = await request.json();

        // Validate required fields
        if (!source || !content || !author) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: source, content, author' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Insert feedback into D1 database
        const result = await env.DB.prepare(
          'INSERT INTO feedback (source, content, author, created_at) VALUES (?, ?, ?, datetime("now"))'
        )
          .bind(source, content, author)
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            id: result.meta.last_row_id,
            message: 'Feedback created successfully',
          }),
          {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Route: GET /api/feedback - Get all feedback with optional filters
      if (path === '/api/feedback' && method === 'GET') {
        const source = url.searchParams.get('source');
        const sentiment = url.searchParams.get('sentiment');
        const limit = url.searchParams.get('limit') || '50';

        // Build dynamic query based on filters
        let query = 'SELECT * FROM feedback WHERE 1=1';
        const params = [];

        if (source) {
          query += ' AND source = ?';
          params.push(source);
        }

        if (sentiment) {
          query += ' AND sentiment = ?';
          params.push(sentiment);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        // Execute query
        const { results } = await env.DB.prepare(query).bind(...params).all();

        // Parse themes JSON string back to array for each feedback item
        const feedbackItems = results.map(item => ({
          ...item,
          themes: item.themes ? JSON.parse(item.themes) : null,
        }));

        return new Response(JSON.stringify(feedbackItems), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Route: GET /api/analytics - Get analytics with KV caching
      if (path === '/api/analytics' && method === 'GET') {
        const cacheKey = 'analytics:latest';

        // Check KV cache first
        const cached = await env.KV.get(cacheKey);
        if (cached) {
          console.log('Returning cached analytics');
          return new Response(cached, {
            status: 200,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
            },
          });
        }

        // Query database for analytics
        // Total feedback count
        const { results: totalResult } = await env.DB.prepare(
          'SELECT COUNT(*) as total FROM feedback'
        ).all();
        const totalCount = totalResult[0].total;

        // Sentiment breakdown
        const { results: sentimentResults } = await env.DB.prepare(
          'SELECT sentiment, COUNT(*) as count FROM feedback WHERE sentiment IS NOT NULL GROUP BY sentiment'
        ).all();
        const sentimentBreakdown = {
          positive: 0,
          neutral: 0,
          negative: 0,
        };
        sentimentResults.forEach(row => {
          if (row.sentiment) {
            sentimentBreakdown[row.sentiment] = row.count;
          }
        });

        // Average sentiment score
        const { results: avgScoreResult } = await env.DB.prepare(
          'SELECT AVG(sentiment_score) as avg_score FROM feedback WHERE sentiment_score IS NOT NULL'
        ).all();
        const avgSentimentScore = avgScoreResult[0].avg_score || 0;

        // Top 5 themes (extract from feedback themes JSON)
        const { results: feedbackWithThemes } = await env.DB.prepare(
          'SELECT themes FROM feedback WHERE themes IS NOT NULL'
        ).all();
        
        const themeCounts = {};
        feedbackWithThemes.forEach(row => {
          if (row.themes) {
            try {
              const themes = JSON.parse(row.themes);
              themes.forEach(theme => {
                themeCounts[theme] = (themeCounts[theme] || 0) + 1;
              });
            } catch (e) {
              console.error('Error parsing themes:', e);
            }
          }
        });

        const topThemes = Object.entries(themeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([theme, count]) => ({ theme, count }));

        // Last 7 days timeline
        const { results: timelineResults } = await env.DB.prepare(
          `SELECT DATE(created_at) as date, COUNT(*) as count 
           FROM feedback 
           WHERE created_at >= datetime('now', '-7 days')
           GROUP BY DATE(created_at)
           ORDER BY date DESC`
        ).all();

        const analytics = {
          totalFeedback: totalCount,
          sentimentBreakdown,
          avgSentimentScore: parseFloat(avgSentimentScore.toFixed(2)),
          topThemes,
          last7Days: timelineResults,
          generatedAt: new Date().toISOString(),
        };

        const analyticsJson = JSON.stringify(analytics);

        // Cache in KV for 5 minutes (300 seconds)
        await env.KV.put(cacheKey, analyticsJson, { expirationTtl: 300 });

        return new Response(analyticsJson, {
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'MISS',
          },
        });
      }

      // Route: GET /api/seed - Seed database with mock data
      if (path === '/api/seed' && method === 'GET') {
        try {
          const result = await seedDatabase(env);
          
          // Clear analytics cache so dashboard shows fresh data immediately
          await env.KV.delete('analytics:latest');
          console.log('Analytics cache cleared after seeding');
          
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Error seeding database:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to seed database', 
              message: error.message 
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Route: POST /api/analyze - Analyze all feedback (re-analyze if needed)
      if (path === '/api/analyze' && method === 'POST') {
        // Find all feedback (process or re-process)
        const { results: allFeedback } = await env.DB.prepare(
          'SELECT id, content FROM feedback'
        ).all();

        if (allFeedback.length === 0) {
          return new Response(
            JSON.stringify({ message: 'No feedback found in database', analyzed: 0 }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        let analyzedCount = 0;

        // Process each feedback item
        for (const feedback of allFeedback) {
          try {
            // 1. Analyze sentiment - use content-based analysis as primary method
            const content = feedback.content.toLowerCase();
            let sentiment = 'neutral';
            let sentimentScore = 0;
            
            // Comprehensive keyword-based sentiment detection
            const positiveWords = [
              'great', 'excellent', 'love', 'amazing', 'awesome', 'fantastic', 'good', 'helpful', 
              'perfect', 'wonderful', 'best', 'thank', 'appreciate', 'impressed', 'outstanding',
              'brilliant', 'superb', 'nice', 'beautiful', 'easy', 'smooth', 'fast', 'efficient',
              'reliable', 'solid', 'clean', 'intuitive', 'user-friendly', 'works well', 'happy',
              'satisfied', 'pleased', 'delighted', 'recommend', 'useful', 'valuable', 'quality'
            ];
            
            const negativeWords = [
              'bad', 'terrible', 'hate', 'awful', 'worst', 'horrible', 'broken', 'bug', 'crash',
              'error', 'issue', 'problem', 'frustrat', 'disappoint', 'annoying', 'useless', 'slow',
              'difficult', 'confusing', 'complicated', 'hard', 'poor', 'fail', 'wrong', 'mess',
              'sucks', 'waste', 'lacking', 'missing', 'unable', 'cannot', "can't", "doesn't work",
              'not working', 'stopped', 'freezes', 'laggy', 'buggy', 'glitch', 'unstable'
            ];
            
            // Also check for negation words that might flip sentiment
            const negationWords = ['not', 'no', "don't", "doesn't", "didn't", 'never', 'neither', 'nor', 'nothing'];
            const hasNegation = negationWords.some(word => content.includes(word));
            
            let positiveCount = 0;
            let negativeCount = 0;
            
            positiveWords.forEach(word => {
              if (content.includes(word)) positiveCount++;
            });
            
            negativeWords.forEach(word => {
              if (content.includes(word)) negativeCount++;
            });
            
            // Determine sentiment with lower threshold
            if (positiveCount > negativeCount) {
              sentiment = 'positive';
              sentimentScore = Math.min(0.4 + (positiveCount * 0.15), 1);
              // If negation is present with positive words, reduce score
              if (hasNegation && positiveCount <= 2) {
                sentimentScore *= 0.5;
                if (sentimentScore < 0.3) {
                  sentiment = 'neutral';
                  sentimentScore = 0;
                }
              }
            } else if (negativeCount > positiveCount) {
              sentiment = 'negative';
              sentimentScore = Math.max(-0.4 - (negativeCount * 0.15), -1);
            } else if (positiveCount > 0 && negativeCount > 0) {
              // Mixed sentiment - lean toward neutral but with slight bias
              sentiment = 'neutral';
              sentimentScore = (positiveCount - negativeCount) * 0.1;
            } else {
              // No clear indicators - truly neutral
              sentiment = 'neutral';
              sentimentScore = 0;
            }

            // 2. Extract themes - keyword-based (more reliable)
            let themes = [];
            
            // Theme detection based on keywords
            if (content.includes('slow') || content.includes('performance') || content.includes('speed') || content.includes('fast') || content.includes('lag')) {
              themes.push('performance');
            }
            if (content.includes('ui') || content.includes('design') || content.includes('interface') || content.includes('look') || content.includes('layout') || content.includes('ux')) {
              themes.push('ui_ux');
            }
            if (content.includes('price') || content.includes('cost') || content.includes('expensive') || content.includes('cheap') || content.includes('payment') || content.includes('subscription')) {
              themes.push('pricing');
            }
            if (content.includes('bug') || content.includes('error') || content.includes('crash') || content.includes('broken') || content.includes('issue') || content.includes('problem')) {
              themes.push('bugs');
            }
            if (content.includes('feature') || content.includes('request') || content.includes('add') || content.includes('need') || content.includes('want') || content.includes('wish')) {
              themes.push('features');
            }
            if (content.includes('doc') || content.includes('documentation') || content.includes('guide') || content.includes('tutorial') || content.includes('help')) {
              themes.push('documentation');
            }
            if (content.includes('support') || content.includes('customer service') || content.includes('response') || content.includes('help')) {
              themes.push('support');
            }
            if (content.includes('security') || content.includes('privacy') || content.includes('safe') || content.includes('data')) {
              themes.push('security');
            }
            if (content.includes('integrat') || content.includes('api') || content.includes('connect')) {
              themes.push('integration');
            }
            
            // If no themes detected, use general category
            if (themes.length === 0) {
              themes.push('general');
            }
            
            themes = themes.slice(0, 3);

            // 3. Classify urgency - keyword-based
            let urgency = 'medium';
            
            // Critical urgency keywords
            if (content.includes('crash') || content.includes('broken') || content.includes('urgent') || 
                content.includes('critical') || content.includes('down') || content.includes('not working') ||
                content.includes('can\'t use') || content.includes('cannot use')) {
              urgency = 'critical';
            }
            // High urgency keywords
            else if (content.includes('bug') || content.includes('error') || content.includes('issue') || 
                     content.includes('problem') || content.includes('fail') || content.includes('wrong')) {
              urgency = 'high';
            }
            // Low urgency keywords
            else if (content.includes('nice') || content.includes('would be') || content.includes('suggestion') ||
                     content.includes('could') || content.includes('maybe') || content.includes('consider') ||
                     content.includes('love to see')) {
              urgency = 'low';
            }
            // Medium is default for everything else

            // Update feedback record
            await env.DB.prepare(
              `UPDATE feedback 
               SET sentiment = ?, sentiment_score = ?, urgency = ?, themes = ?, processed = 1 
               WHERE id = ?`
            )
              .bind(sentiment, sentimentScore, urgency, JSON.stringify(themes), feedback.id)
              .run();

            // If critical, also insert into critical_feedback table
            if (urgency === 'critical') {
              await env.DB.prepare(
                `INSERT INTO critical_feedback (feedback_id, source, content, author, sentiment, sentiment_score, themes, created_at)
                 SELECT id, source, content, author, ?, ?, ?, created_at
                 FROM feedback WHERE id = ?`
              )
                .bind(sentiment, sentimentScore, JSON.stringify(themes), feedback.id)
                .run();
              console.log(`🚨 CRITICAL feedback ${feedback.id} flagged!`);
            }

            analyzedCount++;
            console.log(`Analyzed feedback ${feedback.id}: ${sentiment} (${sentimentScore}), urgency: ${urgency}, themes: ${themes.join(', ')}`);
          } catch (error) {
            console.error(`Error analyzing feedback ${feedback.id}:`, error);
            // Continue processing other items even if one fails
          }
        }

        // Invalidate analytics cache after processing
        await env.KV.delete('analytics:latest');

        return new Response(
          JSON.stringify({
            success: true,
            analyzed: analyzedCount,
            total: allFeedback.length,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Route not found
      return new Response(JSON.stringify({ error: 'Route not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // Global error handler
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error', 
          message: error.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
