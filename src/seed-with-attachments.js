/**
 * Enhanced Seed Data with Attachments
 * 
 * Generates 60 diverse feedback entries with realistic content.
 * 33% (20 items) include mock screenshot/image attachments.
 */

import { indexAllFeedback } from './embeddings.js';

export async function seedDatabaseWithAttachments(env) {
  // Mock feedback with varied sources, content, and some with attachments
  const mockFeedback = [
    // Bug Reports with Screenshots (10 items)
    {
      source: 'support_ticket',
      content: "I'm getting a 500 Internal Server Error when trying to export my data. I've attached a screenshot showing the exact error message and stack trace.",
      author: 'Sarah Chen',
      attachment_url: 'https://placehold.co/800x600/FF0000/FFFFFF?text=500+Error+Screenshot'
    },
    {
      source: 'github',
      content: "The dashboard crashes when I click on the analytics tab. See attached screenshot of the console errors - looks like a null pointer exception.",
      author: 'Mike Johnson',
      attachment_url: 'https://via.placeholder.com/800x600/DC143C/FFFFFF?text=Console+Error'
    },
    {
      source: 'discord',
      content: "Found a critical bug where user data is exposed in the API response. Screenshot attached showing sensitive information in the network tab.",
      author: 'Alex Rivera',
      attachment_url: 'https://picsum.photos/800/600?random=1'
    },
    {
      source: 'support_ticket',
      content: "The login page shows a blank white screen on Safari. I've attached a screenshot of what I'm seeing - just completely blank.",
      author: 'Emma Wilson',
      attachment_url: 'https://placehold.co/800x600/FFFFFF/000000?text=Blank+Screen'
    },
    {
      source: 'email',
      content: "Database connection timeout error appearing randomly. Please see the attached error log screenshot - happens about 3-4 times per day.",
      author: 'David Park',
      attachment_url: 'https://via.placeholder.com/800x600/FF4500/FFFFFF?text=Database+Timeout'
    },
    {
      source: 'github',
      content: "Memory leak detected in the real-time updates feature. Attaching Chrome DevTools screenshot showing heap growing continuously.",
      author: 'Lisa Anderson',
      attachment_url: 'https://picsum.photos/800/600?random=2'
    },
    {
      source: 'support_ticket',
      content: "Getting CORS errors when making API calls from localhost. Screenshot attached showing the exact error in the browser console.",
      author: 'Tom Martinez',
      attachment_url: 'https://placehold.co/800x600/8B0000/FFFFFF?text=CORS+Error'
    },
    {
      source: 'discord',
      content: "The file upload feature breaks with files over 5MB. I've attached a screenshot of the error message that appears.",
      author: 'Rachel Kim',
      attachment_url: 'https://via.placeholder.com/800x600/B22222/FFFFFF?text=Upload+Failed'
    },
    {
      source: 'twitter',
      content: "Your app is completely broken on mobile Chrome. See attached screenshot - buttons are overlapping and text is cut off.",
      author: 'James Lee',
      attachment_url: 'https://picsum.photos/400/800?random=3'
    },
    {
      source: 'email',
      content: "Pagination doesn't work correctly - it skips items. Screenshot attached showing items 10-15 missing from the list.",
      author: 'Nina Patel',
      attachment_url: 'https://placehold.co/800x600/CD5C5C/FFFFFF?text=Pagination+Bug'
    },

    // UI Issues with Screenshots (6 items)
    {
      source: 'support_ticket',
      content: "The buttons on mobile are way too small to tap accurately. I've attached a screenshot showing how tiny they appear on my iPhone.",
      author: 'Chris Taylor',
      attachment_url: 'https://picsum.photos/400/800?random=4'
    },
    {
      source: 'discord',
      content: "Dark mode has terrible contrast - can barely read the text. Please see the attached screenshot, the gray on gray is almost invisible.",
      author: 'Sophia Zhang',
      attachment_url: 'https://placehold.co/800x600/2F4F4F/696969?text=Dark+Mode+Issue'
    },
    {
      source: 'twitter',
      content: "The sidebar menu overlaps the main content on tablet screens. Screenshot attached showing the layout breaking at 768px width.",
      author: 'Marcus Brown',
      attachment_url: 'https://via.placeholder.com/768x1024/4682B4/FFFFFF?text=Tablet+Layout'
    },
    {
      source: 'email',
      content: "Form validation errors are shown in red text that's too small to read. I've attached a screenshot highlighting the tiny error messages.",
      author: 'Olivia Garcia',
      attachment_url: 'https://picsum.photos/800/600?random=5'
    },

    // Performance Issues with Screenshots (4 items)
    {
      source: 'support_ticket',
      content: "The dashboard takes 10+ seconds to load this view. Screenshot attached showing the Chrome performance profiler - massive JavaScript execution time.",
      author: 'Kevin Wu',
      attachment_url: 'https://placehold.co/800x600/FF8C00/FFFFFF?text=Performance+Profile'
    },
    {
      source: 'github',
      content: "Infinite scroll causes the page to freeze after loading 100 items. See attached screenshot of the browser becoming unresponsive.",
      author: 'Amanda Foster',
      attachment_url: 'https://via.placeholder.com/800x600/FFA500/FFFFFF?text=Browser+Freeze'
    },
    {
      source: 'discord',
      content: "Images take forever to load - like 30 seconds each. I've attached a screenshot showing the network waterfall, images are 5MB+ each!",
      author: 'Ryan Cooper',
      attachment_url: 'https://picsum.photos/800/600?random=6'
    },
    {
      source: 'email',
      content: "The search feature is incredibly slow with large datasets. Screenshot attached showing a 8-second query time for a simple search.",
      author: 'Jessica Nguyen',
      attachment_url: 'https://placehold.co/800x600/DAA520/FFFFFF?text=Slow+Search'
    },

    // Bug Reports without Screenshots (15 items)
    {
      source: 'support_ticket',
      content: "When I try to delete my account, nothing happens. The button just spins forever and the account is never deleted.",
      author: 'Daniel Smith'
    },
    {
      source: 'github',
      content: "Timezone handling is broken - all timestamps show in UTC instead of user's local time.",
      author: 'Maria Rodriguez'
    },
    {
      source: 'discord',
      content: "Email notifications are being sent multiple times for the same event. I received 5 copies of the same notification yesterday.",
      author: 'Tyler Johnson'
    },
    {
      source: 'email',
      content: "The password reset link expires immediately. I click it within seconds and it says the link is invalid.",
      author: 'Hannah Lee'
    },
    {
      source: 'twitter',
      content: "Your API returns 200 OK even when there's an error. This makes error handling impossible on the client side.",
      author: 'Brandon Chen'
    },
    {
      source: 'support_ticket',
      content: "Autocomplete suggestions are completely wrong and irrelevant to what I'm typing.",
      author: 'Megan Taylor'
    },
    {
      source: 'github',
      content: "WebSocket connection drops every few minutes and doesn't reconnect automatically.",
      author: 'Jason Park'
    },
    {
      source: 'discord',
      content: "The export to CSV feature includes HTML tags in the data fields, making the CSV unusable.",
      author: 'Lauren Martinez'
    },
    {
      source: 'email',
      content: "Session expires way too quickly - I get logged out every 5 minutes while actively using the app.",
      author: 'Eric Kim'
    },
    {
      source: 'support_ticket',
      content: "Drag and drop doesn't work at all in Firefox. Works fine in Chrome though.",
      author: 'Samantha White'
    },
    {
      source: 'github',
      content: "API rate limiting is too aggressive - I hit the limit just doing normal usage.",
      author: 'Andrew Garcia'
    },
    {
      source: 'twitter',
      content: "The mobile app crashes immediately on launch on Android 12. Completely unusable.",
      author: 'Michelle Wong'
    },
    {
      source: 'discord',
      content: "Keyboard shortcuts don't work when focus is in certain input fields.",
      author: 'Robert Davis'
    },
    {
      source: 'email',
      content: "The undo feature doesn't actually undo the last action - it seems to undo random things.",
      author: 'Jennifer Liu'
    },
    {
      source: 'support_ticket',
      content: "Copy/paste functionality is broken in the rich text editor. Text loses all formatting.",
      author: 'William Brown'
    },

    // Feature Requests (10 items)
    {
      source: 'discord',
      content: "Please add bulk actions - selecting and deleting multiple items one by one is tedious.",
      author: 'Ashley Thompson'
    },
    {
      source: 'github',
      content: "Would love to see a dark mode option. The bright white background is harsh on the eyes during long sessions.",
      author: 'Matthew Wilson'
    },
    {
      source: 'email',
      content: "Can you add keyboard shortcuts for common actions? Would make power users much more productive.",
      author: 'Stephanie Moore'
    },
    {
      source: 'twitter',
      content: "Need an API endpoint to fetch historical data. Currently can only get current state.",
      author: 'Joshua Anderson'
    },
    {
      source: 'support_ticket',
      content: "Please add the ability to customize the dashboard layout. Everyone has different priorities.",
      author: 'Rebecca Martinez'
    },
    {
      source: 'discord',
      content: "Would be great to have real-time collaboration features like Google Docs.",
      author: 'Nicholas Taylor'
    },
    {
      source: 'github',
      content: "Add support for custom webhooks so we can integrate with our internal tools.",
      author: 'Victoria Chen'
    },
    {
      source: 'email',
      content: "Please implement two-factor authentication for better security.",
      author: 'Benjamin Lee'
    },
    {
      source: 'twitter',
      content: "Need a mobile app! The mobile web version is okay but a native app would be much better.",
      author: 'Kimberly Park'
    },
    {
      source: 'support_ticket',
      content: "Can you add advanced filtering options? Need to filter by multiple criteria at once.",
      author: 'Jonathan Kim'
    },

    // Positive Feedback (10 items)
    {
      source: 'twitter',
      content: "Absolutely love the new UI redesign! So much cleaner and easier to navigate than before.",
      author: 'Emily Rodriguez'
    },
    {
      source: 'email',
      content: "The customer support team is amazing! They resolved my issue within 10 minutes.",
      author: 'Michael Garcia'
    },
    {
      source: 'discord',
      content: "This tool has saved our team so much time. We've cut our workflow time in half!",
      author: 'Sarah Johnson'
    },
    {
      source: 'support_ticket',
      content: "Thank you for the recent performance improvements. The app is noticeably faster now.",
      author: 'David Martinez'
    },
    {
      source: 'github',
      content: "Great documentation! Everything is well explained with clear examples.",
      author: 'Laura Wilson'
    },
    {
      source: 'twitter',
      content: "The API is so well designed and easy to use. Integration took us less than a day.",
      author: 'Christopher Lee'
    },
    {
      source: 'email',
      content: "Love the new analytics dashboard. Finally can see all the metrics I need in one place.",
      author: 'Amanda Chen'
    },
    {
      source: 'discord',
      content: "The export feature works perfectly. Exactly what we needed for our reporting.",
      author: 'Ryan Taylor'
    },
    {
      source: 'support_ticket',
      content: "Impressed by how stable the platform is. Haven't experienced any downtime in months.",
      author: 'Nicole Park'
    },
    {
      source: 'twitter',
      content: "Your product is a game changer for our industry. Keep up the excellent work!",
      author: 'Kevin Anderson'
    },

    // General Feedback (5 items)
    {
      source: 'email',
      content: "The onboarding process could be more intuitive. Took me a while to figure out where to start.",
      author: 'Patricia White'
    },
    {
      source: 'discord',
      content: "Pricing seems a bit high compared to competitors, but the features justify it.",
      author: 'Timothy Brown'
    },
    {
      source: 'support_ticket',
      content: "The mobile experience needs work, but the desktop version is solid.",
      author: 'Elizabeth Davis'
    },
    {
      source: 'github',
      content: "Documentation is good but could use more real-world examples and use cases.",
      author: 'Richard Thompson'
    },
    {
      source: 'twitter',
      content: "Overall great product but the learning curve is steep for new users.",
      author: 'Karen Martinez'
    }
  ];

  try {
    console.log('🌱 Starting enhanced database seed with attachments...');
    
    const stmt = env.DB.prepare(
      'INSERT INTO feedback (source, content, author, attachment_url) VALUES (?, ?, ?, ?)'
    );
    
    let count = 0;
    let withAttachments = 0;
    
    for (const item of mockFeedback) {
      await stmt.bind(
        item.source, 
        item.content, 
        item.author,
        item.attachment_url || null
      ).run();
      
      count++;
      if (item.attachment_url) {
        withAttachments++;
      }
    }
    
    console.log(`✅ Seeded ${count} feedback entries (${withAttachments} with attachments)`);

    // Automatically index all feedback for semantic search
    console.log('🔍 Indexing feedback for semantic search...');
    const indexResult = await indexAllFeedback(env);
    
    console.log(`✅ Indexed ${indexResult.indexed} feedback items for semantic search`);

    return { 
      success: true, 
      total: count,
      withAttachments,
      indexed: indexResult.indexed,
      failed: indexResult.failed
    };
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}
