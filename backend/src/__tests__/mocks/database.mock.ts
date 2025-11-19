/**
 * Mock database client for testing
 */
import { Pool, PoolClient, QueryResult } from 'pg';

export const mockQueryResult = <T = any>(rows: T[]): QueryResult<T> => ({
  rows,
  command: 'SELECT',
  rowCount: rows.length,
  oid: 0,
  fields: [],
});

export const createMockPool = () => {
  const mockQuery = jest.fn();
  const mockConnect = jest.fn();
  const mockEnd = jest.fn();

  const pool = {
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
    on: jest.fn(),
    removeListener: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  } as unknown as Pool;

  return { pool, mockQuery, mockConnect, mockEnd };
};

export const createMockClient = (): PoolClient => {
  const mockQuery = jest.fn();
  const mockRelease = jest.fn();

  return {
    query: mockQuery,
    release: mockRelease,
    on: jest.fn(),
    removeListener: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    escapeIdentifier: jest.fn(),
    escapeLiteral: jest.fn(),
  } as unknown as PoolClient;
};

// Mock the database connection
export const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  getClient: jest.fn(),
};

// Helper to mock successful queries
export const mockSuccessfulQuery = <T = any>(data: T[]) => {
  mockDb.query.mockResolvedValueOnce(mockQueryResult(data));
};

// Helper to mock failed queries
export const mockFailedQuery = (error: Error) => {
  mockDb.query.mockRejectedValueOnce(error);
};

// Reset all mocks
export const resetDatabaseMocks = () => {
  mockDb.query.mockReset();
  mockDb.connect.mockReset();
  mockDb.end.mockReset();
  mockDb.getClient.mockReset();
};
