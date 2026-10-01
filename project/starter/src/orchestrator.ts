import { query } from '@anthropic-ai/claude-agent-sdk';
import { mcpServersConfig } from './config/mcp.config.js';
import { buildOrchestratorPrompt } from './prompts/index.js';
import { withRetry, withTimeout } from './utils/error-handler.js';
import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester,
} from './agents/index.js';
import {
  ReviewReportSchema,
  type ReviewReport,
  ReviewReportJSONSchema,
} from './types/report-types.js';

export interface OrchestratorOptions {
  model?: string;
  cwd?: string;
}

export class CodeReviewOrchestrator {
  private readonly options: OrchestratorOptions;

  constructor(options: OrchestratorOptions = {}) {
    this.options = options;
  }

  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startedAt = Date.now();

    const prompt = buildOrchestratorPrompt(
      owner,
      repo,
      prNumber
    );

    try {
      const executeReview = async (): Promise<ReviewReport> => {
        const result = query({
          prompt,
          options: {
            model:
              this.options.model ||
              process.env.ANTHROPIC_MODEL ||
              'claude-sonnet-4-5-20250929',
            cwd:
              this.options.cwd ||
              process.env.PROJECT_ROOT ||
              process.cwd(),
            mcpServers: mcpServersConfig,
            tools: ['Read', 'Glob', 'Grep', 'Task'],
            allowedTools: [
              'Read',
              'Glob',
              'Grep',
              'Task',
              'mcp__github__*',
              'mcp__eslint__*',
            ],
            agents: {
              'code-quality-analyzer': codeQualityAnalyzer,
              'test-coverage-analyzer': testCoverageAnalyzer,
              'refactoring-suggester': refactoringSuggester,
            },
            outputFormat: {
              type: 'json_schema',
              schema: ReviewReportJSONSchema,
            },
            maxTurns: 30,
          },
        });

        for await (const message of result) {
          if (
            message.type === 'result' &&
            'structured_output' in message &&
            message.structured_output
          ) {
            const parsed = ReviewReportSchema.safeParse(
              message.structured_output
            );

            if (!parsed.success) {
              throw new Error(
                `Review report validation failed: ${parsed.error.message}`
              );
            }

            return {
              ...parsed.data,
              metadata: {
                ...parsed.data.metadata,
                duration: Date.now() - startedAt,
              },
            };
          }

          if (
            message.type === 'result' &&
            'subtype' in message &&
            typeof message.subtype === 'string' &&
            message.subtype.startsWith('error_')
          ) {
            throw new Error(
              `Claude Agent SDK execution failed: ${message.subtype}`
            );
          }
        }

        throw new Error('No structured review report was returned.');
      };

      return await withRetry(
        () => withTimeout(executeReview, 120000),
        3,
        1000
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      throw new Error(
        `Failed to review ${owner}/${repo}#${prNumber}: ${message}`
      );
    }
  }
}
