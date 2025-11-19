import { Page } from '@playwright/test';

/**
 * Mocks the WebSocket connection to prevent connection errors during tests
 */
export async function mockWebSocket(page: Page) {
  await page.addInitScript(() => {
    // Mock Socket.IO client
    (window as any).io = () => {
      const mockSocket = {
        on: (event: string, handler: Function) => {
          // Simulate successful connection
          if (event === 'connect') {
            setTimeout(() => handler(), 100);
          }
          return mockSocket;
        },
        emit: (event: string, ...args: any[]) => {
          // Mock emit - does nothing
          return mockSocket;
        },
        disconnect: () => {
          // Mock disconnect
          return mockSocket;
        },
        connected: true,
        id: 'mock-socket-id',
      };
      return mockSocket;
    };
  });
}

/**
 * Mocks WebSocket with initial stats data
 */
export async function mockWebSocketWithStats(page: Page, stats?: {
  activeUsers?: number;
  totalMessages?: number;
  agentQueries?: number;
  flaggedMessages?: number;
}) {
  const defaultStats = {
    activeUsers: 42,
    totalMessages: 1337,
    agentQueries: 89,
    flaggedMessages: 3,
    ...stats,
  };

  await page.addInitScript((initialStats) => {
    // Mock Socket.IO client with stats
    (window as any).io = () => {
      const mockSocket = {
        handlers: {} as Record<string, Function[]>,
        on: function(event: string, handler: Function) {
          if (!this.handlers[event]) {
            this.handlers[event] = [];
          }
          this.handlers[event].push(handler);

          // Simulate events
          if (event === 'connect') {
            setTimeout(() => handler(), 100);
          } else if (event === 'stats:update') {
            setTimeout(() => handler(initialStats), 200);
          }

          return this;
        },
        emit: function(event: string, ...args: any[]) {
          return this;
        },
        disconnect: function() {
          if (this.handlers['disconnect']) {
            this.handlers['disconnect'].forEach((h: Function) => h());
          }
          return this;
        },
        connected: true,
        id: 'mock-socket-id',
      };
      return mockSocket;
    };
  }, defaultStats);
}
