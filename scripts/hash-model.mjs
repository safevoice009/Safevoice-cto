#!/usr/bin/env node
/**
 * Script to generate SHA-256 checksums for model files
 * Used to create checksums.json manifest for TensorFlow.js crisis detection model
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

/**
 * @typedef {Object} ChecksumEntry
 * @property {string} [filename] - SHA-256 hash of the file
 */

async function computeSHA256Hash(filePath) {
  const fileBuffer = await readFile(filePath);
  const hash = createHash('sha256');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

async function generateChecksums(modelDir) {
  const checksums = {};
  
  // Common TensorFlow.js model files
  const modelFiles = [
    'model.json',
    'weight-shard-1.bin',
    'weight-shard-2.bin',
    'weight-shard-3.bin',
    'weight-shard-4.bin',
    'weight-shard-5.bin'
  ];

  for (const filename of modelFiles) {
    try {
      const filePath = join(modelDir, filename);
      const hash = await computeSHA256Hash(filePath);
      checksums[filename] = hash;
      console.log(`${filename}: ${hash}`);
    } catch (error) {
      // Skip files that don't exist
      console.log(`Skipping ${filename} (file not found)`);
    }
  }

  return checksums;
}

async function main() {
  const modelDir = process.argv[2] || './public/models/crisis-detector';
  
  try {
    console.log(`Generating checksums for files in: ${modelDir}`);
    const checksums = await generateChecksums(modelDir);
    
    const outputPath = join(modelDir, 'checksums.json');
    await writeFile(outputPath, JSON.stringify(checksums, null, 2));
    
    console.log(`\nChecksums written to: ${outputPath}`);
    console.log('\nGenerated checksums:');
    console.log(JSON.stringify(checksums, null, 2));
    
  } catch (error) {
    console.error('Error generating checksums:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}