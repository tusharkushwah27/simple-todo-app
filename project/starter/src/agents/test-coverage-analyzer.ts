import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TestCoverageResultJSONSchema } from '../types/analysis-results.js';

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Analyzes pull request changes for test coverage, identifies untested paths, and suggests useful tests.',

  model: 'inherit',

  tools: [
    'Read',
    'Glob',
    'Grep',
  ],

  prompt: `You are the Test Coverage Analyzer subagent.

Your responsibility is to analyze the changed code and its tests in the pull request.

Focus specifically on:
- whether changed functionality has corresponding tests
- missing unit or integration tests
- untested functions and classes
- untested branches and edge cases
- important execution paths that lack coverage
- practical tests that should be added

Inspect the repository's actual source and test files using the available tools.

If a relevant Claude Code Skill is available in the current session, use it when appropriate for the analysis.

Return ONLY a structured result matching the TestCoverageResult schema.

The expected JSON structure is represented by this schema:
${JSON.stringify(TestCoverageResultJSONSchema)}

Include:
- the analyzed file
- whether tests exist
- relevant test files
- untested paths
- a coverage estimate from 0 to 100
- a concise summary

For every untested path include its type, location, priority, reasoning, and suggested test.

Do not invent test files or coverage information that cannot be supported by the repository.
Do not analyze unrelated code unless it is necessary to understand the changed functionality.`,
};
