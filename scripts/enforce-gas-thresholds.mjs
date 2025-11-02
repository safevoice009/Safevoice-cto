#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const reportPath = 'gas-report.txt';

const MAX_GAS_THRESHOLDS = {
  pause: Number(process.env.MAX_GAS_PAUSE || 50000),
  unpause: Number(process.env.MAX_GAS_UNPAUSE || 50000),
  transferOwnership: Number(process.env.MAX_GAS_TRANSFER_OWNERSHIP || 60000),
};

if (!existsSync(reportPath)) {
  console.warn('⚠️  Gas report not found. Skipping gas threshold enforcement.');
  console.log('Run "REPORT_GAS=true npx hardhat test" to generate gas reports.');
  process.exit(0);
}

const reportContent = readFileSync(reportPath, 'utf8');
const reportLines = reportContent.split(/\r?\n/);
const failures = [];

const findGasForMethod = (methodName) => {
  const line = reportLines.find((entry) => entry.includes(`::${methodName}`));

  if (!line) {
    return null;
  }

  const columns = line
    .split('|')
    .map((col) => col.trim())
    .filter(Boolean);

  if (columns.length < 4) {
    return null;
  }

  const avgGas = Number(columns[3].replace(/,/g, ''));
  return Number.isNaN(avgGas) ? null : avgGas;
};

for (const [method, threshold] of Object.entries(MAX_GAS_THRESHOLDS)) {
  const gasUsed = findGasForMethod(method);

  if (gasUsed === null) {
    console.warn(`⚠️  No gas measurement found for method: ${method}`);
    continue;
  }

  if (gasUsed > threshold) {
    failures.push(`${method} uses ${gasUsed} gas, exceeds threshold of ${threshold}`);
  }
}

if (failures.length > 0) {
  console.error('❌ Gas usage thresholds exceeded:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('✅ All gas usage thresholds met.');
