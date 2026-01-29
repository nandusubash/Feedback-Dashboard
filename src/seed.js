
const mockFeedback = [
  // Performance Issues (10)
  { source: 'support_ticket', content: 'Dashboard takes 8+ seconds to load with large datasets. This is affecting our daily operations significantly.', author: 'admin_sarah' },
  { source: 'discord', content: 'API response times are terrible during peak hours. Getting 5-10 second delays on simple GET requests.', author: 'dev_mike' },
  { source: 'github', content: 'Memory leak in the worker causing it to crash after processing ~1000 requests. Need urgent fix.', author: 'backend_dev' },
  { source: 'twitter', content: 'Your CDN is slower than molasses. Images take forever to load. Losing customers because of this.', author: 'angry_user' },
  { source: 'email', content: 'The search functionality times out when we have more than 10k records. Can you optimize the queries?', author: 'enterprise_client' },
  { source: 'support_ticket', content: 'Workers AI requests are being rate-limited too aggressively. We need higher limits for our paid plan.', author: 'startup_cto' },
  { source: 'discord', content: 'Cold starts are killing us. First request after idle takes 3-5 seconds. This needs to be fixed ASAP.', author: 'performance_nerd' },
  { source: 'github', content: 'D1 database queries are slow for JOIN operations. Simple query takes 2+ seconds with just 50k rows.', author: 'data_engineer' },
  { source: 'email', content: 'Caching with KV is inconsistent. Sometimes stale data persists for hours despite setting 5min TTL.', author: 'concerned_dev' },
  { source: 'twitter', content: 'Build times have gotten progressively slower over the past month. Now takes 5 minutes vs 1 minute before.', author: 'frustrated_pm' },

  // UI/UX Issues (10)
  { source: 'discord', content: 'The new navigation is confusing. Can\'t find where you moved the API keys section. Please add breadcrumbs.', author: 'confused_user' },
  { source: 'support_ticket', content: 'Dark mode has terrible contrast. Can barely read the gray text on dark gray background.', author: 'accessibility_advocate' },
  { source: 'github', content: 'Mobile app UI is broken on iPad. Buttons are cut off and text overlaps. Needs responsive design fixes.', author: 'mobile_tester' },
  { source: 'twitter', content: 'Love the redesign but the sidebar takes up too much space. Give us an option to collapse it permanently.', author: 'minimalist_user' },
  { source: 'email', content: 'Error messages are cryptic. Got "Invalid binding" error with no explanation of what binding or how to fix it.', author: 'newbie_dev' },
  { source: 'discord', content: 'Would be great to have keyboard shortcuts for common actions. Currently everything requires clicking.', author: 'power_user' },
  { source: 'support_ticket', content: 'The dashboard colors clash with our brand. Please add theme customization or at least more color options.', author: 'design_lead' },
  { source: 'github', content: 'Form validation is overly strict. Won\'t let me use hyphens in worker names even though docs say it\'s allowed.', author: 'detail_oriented' },
  { source: 'twitter', content: 'Logs page needs better filtering. Can\'t search by date range or filter by log level. Very frustrating.', author: 'devops_engineer' },
  { source: 'email', content: 'Analytics charts are hard to read. Need better tooltips and legend. Also export to CSV would be amazing.', author: 'data_analyst' },

  // Pricing Concerns (8)
  { source: 'email', content: 'Free tier is too restrictive. 100k requests/day isn\'t enough to properly test our app before committing to paid.', author: 'bootstrapped_founder' },
  { source: 'twitter', content: 'Why did you increase prices by 40%? This is going to force us to look at alternatives like Vercel or Netlify.', author: 'budget_conscious' },
  { source: 'support_ticket', content: 'We need a non-profit discount. Our organization can\'t afford $200/month for what we\'re building.', author: 'nonprofit_director' },
  { source: 'discord', content: 'Pricing page is confusing. What counts as a "request"? Does a single page load count as 1 or multiple?', author: 'confused_buyer' },
  { source: 'github', content: 'Enterprise pricing isn\'t transparent. We need to know costs upfront before scheduling a sales call.', author: 'procurement_manager' },
  { source: 'email', content: 'Love the product but $20/month is steep for hobby projects. Any chance of a hobbyist tier at $5-10?', author: 'weekend_hacker' },
  { source: 'twitter', content: 'Hidden costs everywhere. Got charged $50 in overages this month with no warning. Please add spending alerts.', author: 'surprised_user' },
  { source: 'support_ticket', content: 'Academic pricing would be amazing. We want to use this for teaching but current costs are prohibitive.', author: 'professor_tech' },

  // Documentation Issues (7)
  { source: 'github', content: 'Workers AI documentation is incomplete. No examples for streaming responses or error handling.', author: 'ai_enthusiast' },
  { source: 'discord', content: 'Migration guide from Pages to Workers is outdated. Half the commands don\'t work anymore.', author: 'migrating_user' },
  { source: 'support_ticket', content: 'Need better TypeScript examples. All docs show JavaScript but we use TS exclusively.', author: 'typescript_fan' },
  { source: 'email', content: 'Authentication documentation jumps around. Can\'t find a simple end-to-end example of JWT auth.', author: 'security_engineer' },
  { source: 'github', content: 'API reference is missing parameters. The "options" object is mentioned but not documented anywhere.', author: 'thorough_reader' },
  { source: 'twitter', content: 'Video tutorials would be super helpful. Reading docs is fine but seeing it in action would be better.', author: 'visual_learner' },
  { source: 'discord', content: 'Changelog doesn\'t include breaking changes clearly. Nearly broke production because of undocumented API change.', author: 'cautious_dev' },

  // Bug Reports (8)
  { source: 'github', content: 'Workers fail silently when environment variables are missing. No error logs, just returns 500.', author: 'frustrated_debugger' },
  { source: 'support_ticket', content: 'D1 migrations randomly fail with "database locked" error. Have to retry 3-4 times before it works.', author: 'database_admin' },
  { source: 'discord', content: 'Wrangler CLI crashes on Windows when deploying workers with special characters in file names.', author: 'windows_user' },
  { source: 'email', content: 'KV writes aren\'t propagating globally. Data written in US-East isn\'t visible in EU-West for 10+ minutes.', author: 'global_app_dev' },
  { source: 'github', content: 'Source maps don\'t work properly. Stack traces point to wrong line numbers making debugging impossible.', author: 'debugger_pro' },
  { source: 'twitter', content: 'Dashboard shows stale metrics. Says I have 0 requests but I\'ve been hammering the API for an hour.', author: 'metrics_watcher' },
  { source: 'support_ticket', content: 'Workers AI sometimes returns garbled text. Looks like encoding issue with non-ASCII characters.', author: 'multilingual_app' },
  { source: 'discord', content: 'Deployment gets stuck at "Building..." for hours. Have to cancel and retry. Happens 30% of the time.', author: 'deploy_warrior' },

  // Feature Requests (7)
  { source: 'github', content: 'Please add WebSocket support for Workers. Would enable so many real-time use cases for us.', author: 'realtime_fan' },
  { source: 'discord', content: 'Scheduled cron jobs need more flexibility. Only supporting preset intervals is too limiting.', author: 'automation_engineer' },
  { source: 'email', content: 'Would love to see support for Deno or Bun runtimes, not just Node. Modern alternatives are faster.', author: 'early_adopter' },
  { source: 'twitter', content: 'Team collaboration features please! Can\'t share projects or give granular permissions to team members.', author: 'team_lead' },
  { source: 'support_ticket', content: 'Multi-region deployments should be easier. Having to manage separate workers per region is painful.', author: 'infrastructure_eng' },
  { source: 'github', content: 'Built-in monitoring/APM would be killer. Having to integrate third-party tools is extra work.', author: 'sre_engineer' },
  { source: 'discord', content: 'A/B testing framework built into Workers would save us so much time. Currently rolling our own.', author: 'growth_hacker' },

  // Positive Feedback (5)
  { source: 'twitter', content: 'Just deployed my first Worker and wow, the DX is incredible! So much easier than AWS Lambda.', author: 'happy_newbie' },
  { source: 'discord', content: 'Workers AI is a game changer. Built an entire sentiment analysis pipeline in under 2 hours.', author: 'impressed_dev' },
  { source: 'email', content: 'Your support team is amazing. Got a response in 15 minutes and they actually solved my problem.', author: 'grateful_customer' },
  { source: 'github', content: 'Edge computing at this scale is mind-blowing. Responses are instant from anywhere in the world.', author: 'performance_obsessed' },
  { source: 'support_ticket', content: 'The free tier is more than generous. Perfect for learning and side projects. Thank you!', author: 'student_dev' },
];

export async function seedDatabase(env) {
  try {
    console.log('Starting database seed...');
    
    const stmt = env.DB.prepare(
      'INSERT INTO feedback (source, content, author) VALUES (?, ?, ?)'
    );
    
    let count = 0;
    for (const item of mockFeedback) {
      await stmt.bind(item.source, item.content, item.author).run();
      count++;
    }
    
    console.log(`Successfully seeded ${count} feedback entries`);
    return { success: true, count };
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}