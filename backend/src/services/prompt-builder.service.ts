import { AgentConfig, CafeContext, QueryType } from '../types/agent.types';
import { getPersonalityGuidelines, PERSONALITIES } from '../config/personalities';

/**
 * Prompt Builder Service
 * Constructs system prompts for the AI agent based on configuration and context
 */

export class PromptBuilderService {
  /**
   * Build the complete system prompt for the AI agent
   */
  buildSystemPrompt(config: AgentConfig, context: CafeContext): string {
    const personalitySection = this.buildPersonalitySection(config);
    const contextSection = this.buildContextSection(context);
    const guidelinesSection = this.buildGuidelinesSection(config);
    const capabilitiesSection = this.buildCapabilitiesSection(config);

    return `${personalitySection}

${contextSection}

${guidelinesSection}

${capabilitiesSection}`;
  }

  /**
   * Build the personality section of the prompt
   */
  private buildPersonalitySection(config: AgentConfig): string {
    if (config.personality === 'custom' && config.customPrompt) {
      return `You are the AI agent for a virtual cafe with a custom personality.

${config.customPrompt}`;
    }

    const personality = PERSONALITIES[config.personality];
    return `You are the AI agent for a virtual cafe, embodying the role of "${personality.name}".

${getPersonalityGuidelines(config.personality)}`;
  }

  /**
   * Build the context section with cafe data
   */
  private buildContextSection(context: CafeContext): string {
    let contextText = `CAFE INFORMATION:
Cafe Name: ${context.cafeName}
Cafe ID: ${context.cafeId}`;

    if (context.totalCustomers) {
      contextText += `\nTotal Customers: ${context.totalCustomers}`;
    }

    if (context.averageOrderValue) {
      contextText += `\nAverage Order Value: $${context.averageOrderValue.toFixed(2)}`;
    }

    // Popular orders
    if (context.orderStats.length > 0) {
      contextText += '\n\nPOPULAR ORDERS TODAY:';
      context.orderStats.slice(0, 5).forEach((stat, index) => {
        contextText += `\n${index + 1}. ${stat.item} (${stat.count} orders${stat.revenue ? `, $${stat.revenue.toFixed(2)}` : ''})`;
      });
    }

    // Peak hours
    if (context.peakHours.length > 0) {
      contextText += '\n\nPEAK HOURS:';
      context.peakHours.slice(0, 3).forEach(peak => {
        const hour = peak.hour % 12 || 12;
        const period = peak.hour < 12 ? 'AM' : 'PM';
        contextText += `\n- ${hour}:00 ${period}: ${peak.customerCount} customers, ${peak.orderCount} orders`;
      });
    }

    // Community interests
    if (context.popularInterests.length > 0) {
      contextText += `\n\nCOMMUNITY INTERESTS:\n${context.popularInterests.slice(0, 5).join(', ')}`;
    }

    // Upcoming events
    if (context.upcomingEvents.length > 0) {
      contextText += '\n\nUPCOMING EVENTS:';
      context.upcomingEvents.slice(0, 3).forEach(event => {
        const dateStr = event.date.toLocaleDateString();
        contextText += `\n- ${event.name} (${dateStr})`;
        if (event.description) {
          contextText += `: ${event.description}`;
        }
        if (event.attendeeCount) {
          contextText += ` - ${event.attendeeCount} attendees`;
        }
      });
    }

    // Custom knowledge
    if (context.customKnowledge) {
      contextText += `\n\nCUSTOM CAFE KNOWLEDGE:\n${context.customKnowledge}`;
    }

    return contextText;
  }

  /**
   * Build response guidelines section
   */
  private buildGuidelinesSection(config: AgentConfig): string {
    return `RESPONSE GUIDELINES:
- Keep responses concise (under 100 words unless the query requires detail)
- Be helpful, engaging, and respectful
- Reference cafe data when relevant to the question
- Never share personal information about users
- If you don't have information to answer a question, admit it politely
- Stay in character based on your personality
- Prioritize accuracy over speculation
- Format lists and data clearly when presenting statistics`;
  }

  /**
   * Build capabilities section based on enabled queries
   */
  private buildCapabilitiesSection(config: AgentConfig): string {
    let text = 'AVAILABLE QUERY TYPES:\n';

    const queryDescriptions: Record<QueryType, string> = {
      orders: 'Answer questions about popular orders, order history, and recommendations',
      stats: 'Provide statistics about cafe performance, customer counts, and trends',
      menu: 'Share information about menu items, ingredients, and pricing',
      events: 'Inform about upcoming events, past events, and event participation',
      community: 'Discuss community interests, member activities, and social aspects'
    };

    config.enabledQueries.forEach(queryType => {
      text += `- ${queryType}: ${queryDescriptions[queryType]}\n`;
    });

    if (config.enabledQueries.length === 0) {
      text += 'Note: No specific query types are enabled. Provide general assistance only.\n';
    }

    return text;
  }

  /**
   * Build a user message with context awareness
   */
  buildUserMessage(question: string, previousContext?: string): string {
    if (previousContext) {
      return `Previous context: ${previousContext}\n\nCurrent question: ${question}`;
    }
    return question;
  }

  /**
   * Build prompt for proactive messaging
   */
  buildProactivePrompt(
    config: AgentConfig,
    context: CafeContext,
    trigger: string,
    metadata?: Record<string, any>
  ): string {
    const systemPrompt = this.buildSystemPrompt(config, context);

    let userPrompt = `Generate a proactive message for the cafe community based on the following trigger: ${trigger}`;

    if (metadata) {
      userPrompt += `\n\nAdditional context: ${JSON.stringify(metadata, null, 2)}`;
    }

    userPrompt += '\n\nCreate an engaging message that would be interesting to the community. Keep it brief (1-2 sentences).';

    return systemPrompt + '\n\n' + userPrompt;
  }
}

export default new PromptBuilderService();
