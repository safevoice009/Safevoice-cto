import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACTS_TO_EXPORT = ['VoiceToken', 'SafeVoiceVault', 'VoiceVesting', 'VoiceStaking', 'VoiceVotingToken', 'VoiceGovernor', 'VoiceAchievementNFT'];

async function exportAbis() {
  console.log('Exporting contract ABIs...\n');

  const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts', 'src');
  const outputDir = path.join(__dirname, '..', 'src', 'lib', 'contracts');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}\n`);
  }

  const abiMap = {};

  for (const contractName of CONTRACTS_TO_EXPORT) {
    const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);

    if (!fs.existsSync(artifactPath)) {
      console.warn(`⚠️  Artifact not found: ${contractName}`);
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    abiMap[contractName] = {
      contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
    };

    console.log(`✅ Exported ${contractName}`);
    console.log(`   - ABI entries: ${artifact.abi.length}`);
    console.log(`   - Bytecode size: ${artifact.bytecode.length} bytes\n`);
  }

  const outputPath = path.join(outputDir, 'abis.json');
  fs.writeFileSync(outputPath, JSON.stringify(abiMap, null, 2));
  console.log(`📄 ABIs exported to: ${outputPath}\n`);

  const tsOutputPath = path.join(outputDir, 'abis.ts');
  const tsContent = `// Auto-generated contract ABIs
// Do not edit manually - run 'npm run export:abis' to regenerate

export const CONTRACTS = ${JSON.stringify(abiMap, null, 2)} as const;

export type ContractName = ${CONTRACTS_TO_EXPORT.map(name => `'${name}'`).join(' | ')};

export function getContractAbi(contractName: ContractName) {
  return CONTRACTS[contractName]?.abi || [];
}

export function getContractBytecode(contractName: ContractName) {
  return CONTRACTS[contractName]?.bytecode || '';
}
`;

  fs.writeFileSync(tsOutputPath, tsContent);
  console.log(`📄 TypeScript exports generated: ${tsOutputPath}\n`);

  console.log('✨ ABI export completed successfully!');
}

exportAbis().catch((error) => {
  console.error('❌ ABI export failed:', error);
  process.exit(1);
});
