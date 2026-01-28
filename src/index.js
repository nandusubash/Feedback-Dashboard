/**
 * Feedback Dashboard API - Cloudflare Worker
 * 
 * This worker provides API endpoints for managing feedback data with:
 * - D1 database for storage
 * - Workers AI for sentiment analysis and theme extraction
 * - KV for caching analytics
 */

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
      // Route: GET / - Home page
      if (path === '/' && method === 'GET') {
        return new Response(
          '<html><body><h1>Feedback Dashboard API - Coming Soon</h1></body></html>',
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/html',
            },
          }
        );
      }

      // Route: POST /api/feedback - Create new feedback
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

      // Route: POST /api/analyze - Analyze unprocessed feedback with Workers AI
      if (path === '/api/analyze' && method === 'POST') {
        // Find all unprocessed feedback
        const { results: unprocessedFeedback } = await env.DB.prepare(
          'SELECT id, content FROM feedback WHERE processed = 0'
        ).all();

        if (unprocessedFeedback.length === 0) {
          return new Response(
            JSON.stringify({ message: 'No unprocessed feedback found', analyzed: 0 }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        let analyzedCount = 0;

        // Process each feedback item
        for (const feedback of unprocessedFeedback) {
          try {
            // 1. Analyze sentiment
            const sentimentPrompt = `Analyze sentiment of this feedback. Return JSON: {sentiment: 'positive'|'neutral'|'negative', score: -1 to 1}. Feedback: ${feedback.content}`;
            const sentimentResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
              messages: [{ role: 'user', content: sentimentPrompt }],
            });
            
            let sentiment = 'neutral';
            let sentimentScore = 0;
            
            try {
              const sentimentData = JSON.parse(sentimentResponse.response);
              sentiment = sentimentData.sentiment || 'neutral';
              sentimentScore = sentimentData.score || 0;
            } catch (e) {
              console.error('Error parsing sentiment response:', e);
            }

            // 2. Extract themes
            const themesPrompt = `Extract 1-3 key themes from this feedback as lowercase strings. Return JSON array like: ['performance', 'ui_ux']. Feedback: ${feedback.content}`;
            const themesResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
              messages: [{ role: 'user', content: themesPrompt }],
            });
            
            let themes = [];
            try {
              themes = JSON.parse(themesResponse.response);
              if (!Array.isArray(themes)) {
                themes = [];
              }
            } catch (e) {
              console.error('Error parsing themes response:', e);
            }

            // 3. Classify urgency
            const urgencyPrompt = `Classify urgency as: low, medium, high, or critical. Return only one word. Feedback: ${feedback.content}`;
            const urgencyResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
              messages: [{ role: 'user', content: urgencyPrompt }],
            });
            
            let urgency = 'medium';
            const urgencyText = urgencyResponse.response.trim().toLowerCase();
            if (['low', 'medium', 'high', 'critical'].includes(urgencyText)) {
              urgency = urgencyText;
            }

            // Update feedback record
            await env.DB.prepare(
              `UPDATE feedback 
               SET sentiment = ?, sentiment_score = ?, urgency = ?, themes = ?, processed = 1 
               WHERE id = ?`
            )
              .bind(sentiment, sentimentScore, urgency, JSON.stringify(themes), feedback.id)
              .run();

            analyzedCount++;
          } catch (error) {
            console.error(`Error analyzing feedback ${feedback.id}:`, error);
          }
        }

        // Invalidate analytics cache after processing
        await env.KV.delete('analytics:latest');

        return new Response(
          JSON.stringify({
            success: true,
            analyzed: analyzedCount,
            total: unprocessedFeedback.length,
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
