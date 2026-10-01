import * as dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';

dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 *
 * Usage:
 * npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  // Validate command-line arguments
  if (!owner || !repo || !prStr) {
    console.error(
      'Usage: npm run dev <owner> <repo> <pr-number>'
    );
    process.exit(1);
  }

  const prNumber = Number(prStr);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    console.error('Error: PR number must be a positive integer.');
    process.exit(1);
  }

  // Validate authentication
  const hasAnthropicApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasAwsCredentials =
    Boolean(process.env.AWS_ACCESS_KEY_ID) &&
    Boolean(process.env.AWS_SECRET_ACCESS_KEY);

  if (!hasAnthropicApiKey && !hasAwsCredentials) {
    console.error(
      'Authentication is not configured.\n\n' +
      'Choose one of these options:\n' +
      '1. Set ANTHROPIC_API_KEY for Anthropic API authentication.\n' +
      '2. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for AWS Bedrock authentication.'
    );
    process.exit(1);
  }

  if (hasAwsCredentials && !hasAnthropicApiKey) {
    if (!process.env.AWS_REGION) {
      console.error(
        'AWS_REGION is required when using AWS Bedrock authentication.'
      );
      process.exit(1);
    }

    console.log('🔐 Using AWS Bedrock authentication');
  } else {
    console.log('�� Using Anthropic API authentication');
  }

  // Validate required model
  if (!process.env.ANTHROPIC_MODEL) {
    console.error(
      'Error: ANTHROPIC_MODEL environment variable is required.'
    );
    process.exit(1);
  }

  try {
    console.log(
      `🔍 Reviewing ${owner}/${repo}#${prNumber}...`
    );

    const orchestrator = new CodeReviewOrchestrator({
      model: process.env.ANTHROPIC_MODEL,
      cwd: process.env.PROJECT_ROOT || process.cwd(),
    });

    const report = await orchestrator.reviewPullRequest(
      owner,
      repo,
      prNumber
    );

    const reportGenerator = new ReportGenerator();

    const markdown = reportGenerator.generateMarkdownReport(report);
    const html = reportGenerator.generateHTMLReport(report);
    const json = reportGenerator.generateJSONReport(report);

    const reportsDir = 'reports';
    await mkdir(reportsDir, { recursive: true });

    const baseName = `${owner}-${repo}-pr-${prNumber}`;

    await Promise.all([
      writeFile(
        `${reportsDir}/${baseName}.md`,
        markdown,
        'utf8'
      ),
      writeFile(
        `${reportsDir}/${baseName}.html`,
        html,
        'utf8'
      ),
      writeFile(
        `${reportsDir}/${baseName}.json`,
        json,
        'utf8'
      ),
    ]);

    console.log('✅ Code review completed.');
    console.log(`📄 Reports saved to ${reportsDir}/`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(`❌ Error: ${message}`);
    process.exitCode = 1;
  }
}

main();
