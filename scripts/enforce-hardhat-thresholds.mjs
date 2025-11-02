#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const summaryPath = resolve('coverage', 'coverage-summary.json');

const DEFAULT_THRESHOLDS = {
  statements: Number(process.env.MIN_STATEMENT_COVERAGE || 90),
  branches: Number(process.env.MIN_BRANCH_COVERAGE || 80),
  functions: Number(process.env.MIN_FUNCTION_COVERAGE || 90),
  lines: Number(process.env.MIN_LINE_COVERAGE || 90),
};

if (!existsSync(summaryPath)) {
  console.error(`❌ Coverage summary not found at ${summaryPath}`);
  console.error('Make sure you run "npx hardhat coverage" before enforcing thresholds.');
  process.exit(1);
}

const summaryRaw = readFileSync(summaryPath, 'utf8');
let summary;

try {
  summary = JSON.parse(summaryRaw);
} catch (error) {
  console.error('❌ Failed to parse coverage summary JSON.');
  console.error(error);
  process.exit(1);
}

const total = summary.total || summary;
const failures = [];

for (const [metric, threshold] of Object.entries(DEFAULT_THRESHOLDS)) {
  const data = total[metric];
  if (!data) {
    failures.push(`${metric} coverage data missing`);
    continue;
  }

  const percentage = typeof data.pct === 'number'
    ? data.pct
    : ((data.covered || 0) / Math.max(data.total || 1, 1)) * 100;

  if (Number.isNaN(percentage)) {
    failures.push(`${metric} coverage is not a number`);
    continue;
  }

  if (percentage < threshold) {
    failures.push(`${metric} coverage ${percentage.toFixed(2)}% below threshold ${threshold}%`);
  }
}

if (failures.length > 0) {
  console.error('❌ Hardhat coverage thresholds not met:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('✅ All Hardhat coverage thresholds met.');
