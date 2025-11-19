/**
 * Mock Anthropic Claude API client for testing
 */

export const createMockAnthropicClient = () => {
  const mockCreate = jest.fn();
  const mockStream = jest.fn();

  return {
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
  };
};

export const mockAnthropicClient = createMockAnthropicClient();

// Mock successful AI response
export const mockAnthropicSuccess = (responseText: string) => {
  mockAnthropicClient.messages.create.mockResolvedValue({
    id: 'msg_test123',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: responseText,
      },
    ],
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
    },
  });
};

// Mock failed AI response
export const mockAnthropicError = (error: Error) => {
  mockAnthropicClient.messages.create.mockRejectedValue(error);
};

// Reset mocks
export const resetAnthropicMocks = () => {
  mockAnthropicClient.messages.create.mockReset();
  mockAnthropicClient.messages.stream.mockReset();
};
