/**
 * MessageParser Service
 * Parses chat messages to detect agent mentions, extract context, and determine triggers
 */

export interface MentionParseResult {
  hasAgentMention: boolean;
  mentionedAgents: string[];
  cleanedContent: string;
  originalContent: string;
}

export interface MessageIntent {
  type: 'question' | 'statement' | 'command' | 'greeting' | 'unknown';
  confidence: number;
  keywords: string[];
}

export class MessageParserService {
  // Pattern to match @username mentions
  private static readonly MENTION_PATTERN = /@(\w+)/g;

  // Keywords that indicate questions
  private static readonly QUESTION_KEYWORDS = [
    'what', 'when', 'where', 'why', 'how', 'who', 'which',
    'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does',
    'tell', 'explain', 'help', 'recommend', 'suggest'
  ];

  // Keywords that indicate commands
  private static readonly COMMAND_KEYWORDS = [
    'show', 'list', 'give', 'find', 'search', 'get', 'create',
    'make', 'play', 'stop', 'start'
  ];

  // Greeting patterns
  private static readonly GREETING_KEYWORDS = [
    'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon',
    'good evening', 'howdy', 'sup', "what's up", 'yo'
  ];

  /**
   * Parse message content to extract agent mentions
   */
  static parseMentions(content: string): MentionParseResult {
    const mentions: string[] = [];
    let match;

    // Find all @mentions
    const mentionPattern = new RegExp(this.MENTION_PATTERN);
    while ((match = mentionPattern.exec(content)) !== null) {
      const username = match[1].toLowerCase();
      if (!mentions.includes(username)) {
        mentions.push(username);
      }
    }

    // Clean content by removing @mentions for processing
    const cleanedContent = content.replace(this.MENTION_PATTERN, '').trim();

    return {
      hasAgentMention: mentions.length > 0,
      mentionedAgents: mentions,
      cleanedContent,
      originalContent: content,
    };
  }

  /**
   * Extract intent from message content
   */
  static extractIntent(content: string): MessageIntent {
    const lowerContent = content.toLowerCase().trim();
    const words = lowerContent.split(/\s+/);
    const firstWord = words[0];

    // Check for questions
    if (lowerContent.endsWith('?')) {
      return {
        type: 'question',
        confidence: 0.9,
        keywords: words.filter(w => this.QUESTION_KEYWORDS.includes(w)),
      };
    }

    if (this.QUESTION_KEYWORDS.some(kw => lowerContent.startsWith(kw))) {
      return {
        type: 'question',
        confidence: 0.8,
        keywords: words.filter(w => this.QUESTION_KEYWORDS.includes(w)),
      };
    }

    // Check for commands
    if (this.COMMAND_KEYWORDS.some(kw => firstWord === kw)) {
      return {
        type: 'command',
        confidence: 0.8,
        keywords: words.filter(w => this.COMMAND_KEYWORDS.includes(w)),
      };
    }

    // Check for greetings
    if (this.GREETING_KEYWORDS.some(kw => lowerContent.includes(kw))) {
      return {
        type: 'greeting',
        confidence: 0.7,
        keywords: words.filter(w => this.GREETING_KEYWORDS.includes(w)),
      };
    }

    // Default to statement
    return {
      type: 'statement',
      confidence: 0.5,
      keywords: [],
    };
  }

  /**
   * Determine if message should trigger agent response
   * Checks for direct mentions, questions, or context-based triggers
   */
  static shouldTriggerAgent(
    content: string,
    agentUsername: string,
    contextKeywords: string[] = []
  ): {
    shouldTrigger: boolean;
    reason: 'mention' | 'keyword' | 'question' | 'none';
    confidence: number;
  } {
    const parseResult = this.parseMentions(content);

    // Direct mention - always trigger
    if (parseResult.mentionedAgents.includes(agentUsername.toLowerCase())) {
      return {
        shouldTrigger: true,
        reason: 'mention',
        confidence: 1.0,
      };
    }

    const intent = this.extractIntent(content);
    const lowerContent = content.toLowerCase();

    // Check for context keywords
    if (contextKeywords.length > 0) {
      const hasKeyword = contextKeywords.some(kw =>
        lowerContent.includes(kw.toLowerCase())
      );

      if (hasKeyword && (intent.type === 'question' || intent.type === 'command')) {
        return {
          shouldTrigger: true,
          reason: 'keyword',
          confidence: 0.7,
        };
      }
    }

    // Don't auto-trigger on general conversation
    return {
      shouldTrigger: false,
      reason: 'none',
      confidence: 0,
    };
  }

  /**
   * Extract relevant topics/keywords from message
   * Used for context-aware responses
   */
  static extractTopics(content: string, minLength: number = 4): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= minLength);

    // Remove common stop words
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'they', 'have', 'been',
      'were', 'will', 'there', 'their', 'about', 'would', 'could',
      'should', 'these', 'those'
    ]);

    return Array.from(new Set(
      words.filter(word => !stopWords.has(word))
    ));
  }

  /**
   * Validate if content is appropriate for agent processing
   */
  static validateContent(content: string): {
    valid: boolean;
    reason?: string;
  } {
    // Empty or too short
    if (!content || content.trim().length < 2) {
      return { valid: false, reason: 'Content too short' };
    }

    // Too long (safety check)
    if (content.length > 2000) {
      return { valid: false, reason: 'Content too long (max 2000 characters)' };
    }

    // Check for spam patterns (repeated characters)
    const repeatedPattern = /(.)\1{10,}/;
    if (repeatedPattern.test(content)) {
      return { valid: false, reason: 'Spam detected' };
    }

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 20) {
      return { valid: false, reason: 'Excessive capitalization' };
    }

    return { valid: true };
  }

  /**
   * Extract agent username from mention text
   */
  static extractAgentUsername(mention: string): string {
    return mention.replace('@', '').trim().toLowerCase();
  }

  /**
   * Check if message is a direct reply to agent
   */
  static isReplyToAgent(replyToUsername?: string, agentUsername?: string): boolean {
    if (!replyToUsername || !agentUsername) {
      return false;
    }

    return replyToUsername.toLowerCase() === agentUsername.toLowerCase();
  }

  /**
   * Format agent response with proper styling
   */
  static formatAgentResponse(response: string, agentName: string): string {
    // Ensure response is properly formatted
    let formatted = response.trim();

    // Add greeting if response is very short
    if (formatted.length < 50 && !formatted.match(/^(hi|hello|hey)/i)) {
      // Response is already complete, just return it
      return formatted;
    }

    return formatted;
  }

  /**
   * Detect if message contains multiple questions
   */
  static hasMultipleQuestions(content: string): boolean {
    const questionMarks = (content.match(/\?/g) || []).length;
    return questionMarks > 1;
  }

  /**
   * Extract question from content
   */
  static extractQuestion(content: string): string | null {
    const sentences = content.split(/[.!?]+/).map(s => s.trim());
    const question = sentences.find(s => s.endsWith('?') ||
      this.QUESTION_KEYWORDS.some(kw => s.toLowerCase().startsWith(kw)));

    return question || null;
  }
}
