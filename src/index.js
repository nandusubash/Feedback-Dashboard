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
import { seedDatabaseWithAttachments } from './seed-with-attachments.js';
import { searchSimilar, indexAllFeedback } from './embeddings.js';
import { uploadFile, downloadFile } from './uploads.js';
import indexHtml from '../public/index.html';
import stylesCss from '../public/styles.css';
import toastCss from '../public/toast.css';

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
    '/toast.css': toastCss,
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
              'Content-Type': 'text/css',
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        } catch (error) {
          return new Response('CSS not found', {
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
              'Content-Type': 'text/css',
            },
          });
        } catch (error) {
          return new Response('CSS not found', {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          });
        }
      }

      // Route: GET /toast.css - Serve Toast CSS
      if (path === '/toast.css' && method === 'GET') {
        try {
          const content = readFile('/toast.css');
          return new Response(content, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/css',
              'Cache-Control': 'no-cache',
            },
          });
        } catch (error) {
          return new Response('CSS not found', {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          });
        }
      }

      // Route: GET /toast.js - Serve Toast JS
      if (path === '/toast.js' && method === 'GET') {
        const toastJsContent = `/**
 * Toast Notification System
 * Modern, elegant toast notifications with animations
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  show(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = \`toast toast-\${type}\`;
    
    const icon = this.getIcon(type);
    
    toast.innerHTML = \`
      <div class="toast-icon">\${icon}</div>
      <div class="toast-content">
        <div class="toast-message">\${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    \`;

    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('toast-show'), 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// Global toast instance
const toast = new ToastManager();`;
        
        return new Response(toastJsContent, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache',
          },
        });
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

      // Route: GET /api/seed-enhanced - Seed database with enhanced data including attachments
      if (path === '/api/seed-enhanced' && method === 'GET') {
        try {
          console.log('🌱 Starting enhanced database seed...');
          const result = await seedDatabaseWithAttachments(env);
          
          // Clear analytics cache so dashboard shows fresh data immediately
          await env.KV.delete('analytics:latest');
          console.log('Analytics cache cleared after seeding');
          
          return new Response(
            JSON.stringify({
              success: true,
              ...result,
              message: `Successfully seeded ${result.total} feedback items (${result.withAttachments} with attachments) and indexed ${result.indexed} for semantic search`
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('Error seeding enhanced database:', error);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to seed enhanced database', 
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
            const content = feedback.content.toLowerCase();
            let sentiment = 'neutral';
            let sentimentScore = 0;
            
            // 1. AI-powered sentiment analysis using Llama 3.1
            try {
              const aiPrompt = `Analyze the sentiment of this customer feedback and respond with ONLY a JSON object.

Feedback: "${feedback.content}"

Respond with this exact JSON format:
{
  "sentiment": "positive" or "neutral" or "negative",
  "score": a number between -1.0 and 1.0
}`;

              const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                messages: [
                  { role: 'system', content: 'You are a sentiment analysis expert. Always respond with valid JSON only.' },
                  { role: 'user', content: aiPrompt }
                ],
                temperature: 0.3,
                max_tokens: 100
              });

              // Parse AI response
              const responseText = aiResponse.response.trim();
              const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
              
              if (jsonMatch) {
                const aiResult = JSON.parse(jsonMatch[0]);
                sentiment = aiResult.sentiment || 'neutral';
                sentimentScore = aiResult.score || 0;
                
                // Validate and normalize
                if (!['positive', 'neutral', 'negative'].includes(sentiment)) {
                  sentiment = 'neutral';
                }
                sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
              } else {
                throw new Error('No JSON found in AI response');
              }
            } catch (aiError) {
              console.error(`AI sentiment analysis failed for feedback ${feedback.id}, using keyword fallback:`, aiError.message);
              
              // Fallback to keyword-based analysis if AI fails
              const positiveWords = ['great', 'excellent', 'love', 'amazing', 'awesome', 'fantastic', 'good', 'helpful', 'perfect', 'wonderful', 'best', 'thank', 'appreciate', 'happy', 'satisfied', 'recommend'];
              const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'worst', 'horrible', 'broken', 'bug', 'crash', 'error', 'issue', 'problem', 'frustrat', 'disappoint', 'annoying', 'useless', 'slow', 'difficult'];
              
              let positiveCount = 0;
              let negativeCount = 0;
              
              positiveWords.forEach(word => {
                if (content.includes(word)) positiveCount++;
              });
              
              negativeWords.forEach(word => {
                if (content.includes(word)) negativeCount++;
              });
              
              if (positiveCount > negativeCount && positiveCount > 0) {
                sentiment = 'positive';
                sentimentScore = Math.min(0.4 + (positiveCount * 0.15), 1);
              } else if (negativeCount > positiveCount && negativeCount > 0) {
                sentiment = 'negative';
                sentimentScore = Math.max(-0.4 - (negativeCount * 0.15), -1);
              } else {
                sentiment = 'neutral';
                sentimentScore = 0;
              }
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

            // Log critical feedback for visibility
            if (urgency === 'critical') {
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

      // Route: POST /api/ai-summarize - AI-powered summarization of multiple feedback items
      if (path === '/api/ai-summarize' && method === 'POST') {
        try {
          const { filters } = await request.json();
          
          // Build query based on filters
          let query = 'SELECT id, content, source, sentiment, urgency, created_at FROM feedback WHERE 1=1';
          const params = [];

          if (filters?.source) {
            query += ' AND source = ?';
            params.push(filters.source);
          }
          if (filters?.sentiment) {
            query += ' AND sentiment = ?';
            params.push(filters.sentiment);
          }
          if (filters?.urgency) {
            query += ' AND urgency = ?';
            params.push(filters.urgency);
          }

          query += ' ORDER BY created_at DESC LIMIT 20';

          const { results: feedbackItems } = await env.DB.prepare(query).bind(...params).all();

          if (feedbackItems.length === 0) {
            return new Response(
              JSON.stringify({ error: 'No feedback found matching filters' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Prepare feedback for AI summarization
          const feedbackText = feedbackItems.map((item, idx) => 
            `${idx + 1}. [${item.source}] ${item.content}`
          ).join('\n\n');

          // Use Workers AI (Llama 3) for summarization
          const summaryPrompt = `You are analyzing customer feedback. Summarize the following ${feedbackItems.length} feedback items into key insights.

Feedback items:
${feedbackText}

Provide a summary with:
1. Main themes (2-3 key topics)
2. Overall sentiment trend
3. Critical issues mentioned
4. Positive highlights
5. Actionable recommendations

Keep it concise and structured.`;

          const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
              { role: 'system', content: 'You are a customer feedback analyst. Provide clear, actionable insights.' },
              { role: 'user', content: summaryPrompt }
            ],
            temperature: 0.5,
            max_tokens: 500
          });

          // Also get sentiment breakdown
          const sentimentCounts = {
            positive: feedbackItems.filter(f => f.sentiment === 'positive').length,
            neutral: feedbackItems.filter(f => f.sentiment === 'neutral').length,
            negative: feedbackItems.filter(f => f.sentiment === 'negative').length,
          };

          const urgencyCounts = {
            critical: feedbackItems.filter(f => f.urgency === 'critical').length,
            high: feedbackItems.filter(f => f.urgency === 'high').length,
            medium: feedbackItems.filter(f => f.urgency === 'medium').length,
            low: feedbackItems.filter(f => f.urgency === 'low').length,
          };

          return new Response(
            JSON.stringify({
              summary: aiResponse.response,
              stats: {
                totalItems: feedbackItems.length,
                sentimentBreakdown: sentimentCounts,
                urgencyBreakdown: urgencyCounts,
                dateRange: {
                  from: feedbackItems[feedbackItems.length - 1]?.created_at,
                  to: feedbackItems[0]?.created_at
                }
              },
              filters: filters || {}
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('AI summarization error:', error);
          return new Response(
            JSON.stringify({ error: 'AI summarization failed', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /api/workflow/trigger - Trigger feedback analysis workflow
      if (path === '/api/workflow/trigger' && method === 'POST') {
        try {
          console.log('🚀 Triggering feedback analysis workflow...');
          
          // Create a new workflow instance
          const instance = await env.WORKFLOW.create();
          
          console.log(`✅ Workflow instance created: ${instance.id}`);
          
          return new Response(
            JSON.stringify({
              success: true,
              instanceId: instance.id,
              message: 'Workflow started'
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('❌ Workflow trigger error:', error);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to start workflow', 
              message: error.message 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      // Route: GET /api/workflow/status - Get workflow analysis status
      if (path === '/api/workflow/status' && method === 'GET') {
        try {
          // Count unprocessed feedback
          const { results: unprocessedResult } = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM feedback WHERE processed = 0'
          ).all();
          const unprocessed = unprocessedResult[0]?.count || 0;

          // Count recently processed (last hour)
          const { results: recentResult } = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM feedback WHERE processed = 1 AND created_at > datetime('now', '-1 hour')"
          ).all();
          const recentlyProcessed = recentResult[0]?.count || 0;

          return new Response(
            JSON.stringify({
              unprocessed,
              recentlyProcessed,
              needsAnalysis: unprocessed > 0
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('Workflow status error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to get workflow status', 
              message: error.message 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      // Route: POST /api/search/similar - Semantic search for similar feedback
      if (path === '/api/search/similar' && method === 'POST') {
        try {
          const { query, limit = 10 } = await request.json();
          
          if (!query) {
            return new Response(
              JSON.stringify({ error: 'Query is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`🔎 Semantic search for: "${query}"`);

          // Search for similar feedback using embeddings
          const similarResults = await searchSimilar(query, limit, env);

          // Fetch full feedback details from D1 for each result
          const feedbackWithDetails = [];
          
          for (const result of similarResults) {
            const { results } = await env.DB.prepare(
              'SELECT * FROM feedback WHERE id = ?'
            ).bind(result.id).all();
            
            if (results.length > 0) {
              feedbackWithDetails.push({
                ...results[0],
                similarity: result.similarity,
                themes: JSON.parse(results[0].themes || '[]')
              });
            }
          }

          return new Response(
            JSON.stringify({
              query,
              results: feedbackWithDetails,
              count: feedbackWithDetails.length
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('Semantic search error:', error);
          return new Response(
            JSON.stringify({ error: 'Semantic search failed', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /api/feedback/upload - Upload file attachment
      if (path === '/api/feedback/upload' && method === 'POST') {
        try {
          const formData = await request.formData();
          const file = formData.get('file');
          const feedbackId = formData.get('feedbackId');

          if (!file) {
            return new Response(
              JSON.stringify({ error: 'No file provided' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!feedbackId) {
            return new Response(
              JSON.stringify({ error: 'Feedback ID is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`📤 Uploading file for feedback ${feedbackId}`);

          // Prepare file object
          const fileObj = {
            name: file.name,
            type: file.type,
            data: await file.arrayBuffer()
          };

          // Upload to R2
          const key = await uploadFile(fileObj, parseInt(feedbackId), env);

          // Update feedback with attachment URL
          await env.DB.prepare(
            'UPDATE feedback SET attachment_url = ? WHERE id = ?'
          ).bind(key, feedbackId).run();

          return new Response(
            JSON.stringify({ 
              success: true, 
              url: key,
              message: 'File uploaded successfully'
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('File upload error:', error);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'File upload failed', 
              message: error.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /api/feedback/file/:key - Serve uploaded file
      if (path.startsWith('/api/feedback/file/') && method === 'GET') {
        try {
          const key = decodeURIComponent(path.replace('/api/feedback/file/', ''));
          
          console.log(`⬇️ Serving file: ${key}`);

          // Download file from R2
          const file = await downloadFile(key, env);

          return new Response(file.data, {
            headers: {
              'Content-Type': file.contentType,
              'Content-Length': file.size.toString(),
              'Cache-Control': 'public, max-age=3600'
            }
          });
        } catch (error) {
          console.error('File download error:', error);
          return new Response(
            JSON.stringify({ error: 'File not found', message: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /api/embeddings/index-all - Index all feedback for semantic search
      if (path === '/api/embeddings/index-all' && method === 'POST') {
        try {
          console.log('🚀 Starting batch indexing of all feedback...');

          const result = await indexAllFeedback(env);

          return new Response(
            JSON.stringify({
              success: true,
              ...result,
              message: `Successfully indexed ${result.indexed} feedback items`
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('Batch indexing error:', error);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Batch indexing failed', 
              message: error.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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

// Export the FeedbackWorkflow class so Cloudflare can find it
export { FeedbackWorkflow } from './workflow.js';
