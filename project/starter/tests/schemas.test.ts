import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
} from '../src/types/analysis-results.js';
import { ReviewReportSchema } from '../src/types/report-types.js';

describe('Zod schema validation', () => {
  it('accepts valid CodeQualityResult data', () => {
    const data = {
      file: 'src/app.js',
      issues: [],
      overallScore: 90,
      summary: 'Code quality is good',
    };

    expect(() => CodeQualityResultSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid CodeQualityResult data', () => {
    expect(() =>
      CodeQualityResultSchema.parse({
        file: 'src/app.js',
        issues: [],
        overallScore: 150,
        summary: 'Invalid score',
      }),
    ).toThrow(z.ZodError);
  });

  it('accepts valid TestCoverageResult data', () => {
    const data = {
      file: 'src/app.js',
      hasTests: true,
      testFiles: ['tests/app.test.ts'],
      untestedPaths: [],
      coverageEstimate: 100,
      summary: 'Good test coverage',
    };

    expect(() => TestCoverageResultSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid TestCoverageResult data', () => {
    expect(() =>
      TestCoverageResultSchema.parse({
        file: 'src/app.js',
        hasTests: true,
        testFiles: [],
        untestedPaths: [],
        coverageEstimate: 150,
        summary: 'Invalid coverage',
      }),
    ).toThrow(z.ZodError);
  });

  it('accepts valid RefactoringSuggestion data', () => {
    const data = {
      file: 'src/app.js',
      suggestions: [],
      summary: 'No refactoring required',
    };

    expect(() => RefactoringSuggestionSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid RefactoringSuggestion data', () => {
    expect(() =>
      RefactoringSuggestionSchema.parse({
        file: 'src/app.js',
        suggestions: [],
        summary: 123,
      }),
    ).toThrow(z.ZodError);
  });

  it('rejects invalid ReviewReport data', () => {
    expect(() =>
      ReviewReportSchema.parse({}),
    ).toThrow(z.ZodError);
  });

  it('accepts boundary scores', () => {
    expect(() =>
      CodeQualityResultSchema.parse({
        file: 'src/app.js',
        issues: [],
        overallScore: 0,
        summary: 'Low score',
      }),
    ).not.toThrow();

    expect(() =>
      TestCoverageResultSchema.parse({
        file: 'src/app.js',
        hasTests: false,
        testFiles: [],
        untestedPaths: [],
        coverageEstimate: 100,
        summary: 'Full coverage',
      }),
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() =>
      CodeQualityResultSchema.parse({
        file: 'src/app.js',
      }),
    ).toThrow(z.ZodError);
  });
});
