import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CodeQualityResultJSONSchema } from '../types/analysis-results.js';

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes changed code in a pull request for security, performance, maintainability, style, bug risks, and best-practice issues.',

  model: 'inherit',

  tools: [
    'Read',
    'Glob',
    'Grep',
    'Skill',
    'mcp__eslint__lint',
  ],

  prompt: `You are the Code Quality Analyzer subagent.

Your responsibility is to analyze the changed files in the pull request for code-quality issues.

Focus specifically on:
- security vulnerabilities and unsafe patterns
- performance problems
- maintainability concerns
- style and consistency issues
- potential bugs and bug risks
- violations of established best practices

Use the available repository and ESLint tools to inspect the actual changed code rather than guessing.

For JavaScript files, invoke the 'javascript-best-practices' Skill and apply its guidance during the analysis.

Return ONLY a structured result matching the CodeQualityResult schema.

The expected JSON structure is represented by this schema:
${JSON.stringify(CodeQualityResultJSONSchema)}

For every issue include:
- file
- line
- severity
- category
- description
- suggestion

Also provide an overallScore from 0 to 100 and a concise summary.

Do not analyze unrelated files unless they are necessary to understand a reported issue.
Do not invent issues that are not supported by the code.`,
};
