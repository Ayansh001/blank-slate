export interface Quote {
  id: string;
  text: string;
  author: string;
  category: QuoteCategory;
  tags: string[];
}

export type QuoteCategory = 'motivation' | 'achievement' | 'perseverance' | 'study_habits' | 'success' | 'focus' | 'learning';

export type QuoteTrigger = 'session_start' | 'session_end' | 'milestone' | 'break_time' | 'activity_completed' | 'daily_goal';

export class MotivationalQuoteService {
  private quotes: Quote[] = [
    {
      id: '1',
      text: 'The expert in anything was once a beginner.',
      author: 'Helen Hayes',
      category: 'learning',
      tags: ['beginner', 'expertise', 'growth']
    },
    {
      id: '2',
      text: 'Success is the sum of small efforts repeated day in and day out.',
      author: 'Robert Collier',
      category: 'perseverance',
      tags: ['consistency', 'effort', 'daily']
    },
    {
      id: '3',
      text: 'The beautiful thing about learning is that no one can take it away from you.',
      author: 'B.B. King',
      category: 'learning',
      tags: ['knowledge', 'permanent', 'value']
    },
    {
      id: '4',
      text: 'Study while others are sleeping; work while others are loafing.',
      author: 'William A. Ward',
      category: 'study_habits',
      tags: ['dedication', 'discipline', 'hard work']
    },
    {
      id: '5',
      text: 'The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.',
      author: 'Brian Herbert',
      category: 'motivation',
      tags: ['choice', 'skill', 'willingness']
    },
    {
      id: '6',
      text: 'Focus on progress, not perfection.',
      author: 'Unknown',
      category: 'focus',
      tags: ['progress', 'improvement', 'growth']
    },
    {
      id: '7',
      text: 'Every accomplishment starts with the decision to try.',
      author: 'Unknown',
      category: 'achievement',
      tags: ['decision', 'trying', 'accomplishment']
    },
    {
      id: '8',
      text: 'Learning never exhausts the mind.',
      author: 'Leonardo da Vinci',
      category: 'learning',
      tags: ['mind', 'continuous', 'energy']
    },
    {
      id: '9',
      text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
      author: 'Winston Churchill',
      category: 'perseverance',
      tags: ['courage', 'continue', 'resilience']
    },
    {
      id: '10',
      text: 'The only way to do great work is to love what you do.',
      author: 'Steve Jobs',
      category: 'success',
      tags: ['passion', 'great work', 'love']
    }
  ];

  private usedQuotes: Set<string> = new Set();
  private lastQuoteTime: number = 0;
  private readonly MIN_QUOTE_INTERVAL = 5000; // 5 seconds minimum between quotes
  private preferences = {
    categories: ['motivation', 'achievement', 'learning'] as QuoteCategory[],
    frequency: 'medium' as 'high' | 'medium' | 'low' | 'off'
  };

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences() {
    const saved = localStorage.getItem('motivational_quotes_preferences');
    if (saved) {
      this.preferences = { ...this.preferences, ...JSON.parse(saved) };
    }
  }

  public savePreferences(preferences: Partial<typeof this.preferences>) {
    this.preferences = { ...this.preferences, ...preferences };
    localStorage.setItem('motivational_quotes_preferences', JSON.stringify(this.preferences));
  }

  public getQuoteForTrigger(trigger: QuoteTrigger, timeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon'): Quote | null {
    if (this.preferences.frequency === 'off') return null;

    // Prevent spam - minimum 5 seconds between quotes
    const now = Date.now();
    if (now - this.lastQuoteTime < this.MIN_QUOTE_INTERVAL) {
      console.log('Quote request too soon, skipping');
      return null;
    }

    const availableQuotes = this.quotes.filter(quote => {
      if (this.usedQuotes.has(quote.id)) return false;
      if (!this.preferences.categories.includes(quote.category)) return false;
      return this.isQuoteAppropriateForTrigger(quote, trigger, timeOfDay);
    });

    if (availableQuotes.length === 0) {
      // Reset used quotes if we've exhausted the pool
      this.usedQuotes.clear();
      return this.getQuoteForTrigger(trigger, timeOfDay);
    }

    const randomQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
    this.usedQuotes.add(randomQuote.id);
    this.lastQuoteTime = now;
    
    // Keep only last 50% of quotes in used set to allow some repetition
    if (this.usedQuotes.size > this.quotes.length * 0.5) {
      const toRemove = Array.from(this.usedQuotes).slice(0, Math.floor(this.usedQuotes.size * 0.3));
      toRemove.forEach(id => this.usedQuotes.delete(id));
    }

    console.log('Selected quote:', randomQuote.text, 'for trigger:', trigger);
    return randomQuote;
  }

  private isQuoteAppropriateForTrigger(quote: Quote, trigger: QuoteTrigger, timeOfDay: string): boolean {
    // Simple logic to match quotes with triggers and time of day
    if (trigger === 'session_start' && timeOfDay === 'morning') {
      return quote.category === 'motivation' || quote.category === 'focus';
    }
    if (trigger === 'session_end') {
      return quote.category === 'achievement' || quote.category === 'success';
    }
    if (trigger === 'milestone') {
      return quote.category === 'achievement' || quote.category === 'perseverance';
    }
    if (trigger === 'break_time') {
      return quote.category === 'motivation' || quote.category === 'learning';
    }
    
    return true; // Default to showing any appropriate quote
  }

  public getCategories(): QuoteCategory[] {
    return ['motivation', 'achievement', 'perseverance', 'study_habits', 'success', 'focus', 'learning'];
  }

  public getPreferences() {
    return { ...this.preferences };
  }
}

export const motivationalQuoteService = new MotivationalQuoteService();
