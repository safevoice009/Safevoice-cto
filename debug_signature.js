// Debug script to test signature verification
import { createDraft, verifyCosignerSignature } from './src/lib/memorial/TributeService.js';
import * as ed25519 from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha2.js';

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  clear() { this.store = {}; }
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

async function testSignature() {
  console.log('Creating draft...');
  const draft = createDraft(
    'Student#1234',
    'John Doe', 
    'In loving memory of a great friend.'
  );
  
  if (!draft.success) {
    console.error('Failed to create draft:', draft.error);
    return;
  }
  
  console.log('Draft created:', draft.draft);
  
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  
  console.log('Creating signature...');
  // Create signature matching the test helper
  const message = JSON.stringify({
    id: draft.draft.id,
    creator: draft.draft.creator,
    honoree: draft.draft.honoree,
    message: draft.draft.message,
    version: draft.draft.version || 0,
  });
  
  console.log('Message to sign:', message);
  const messageHash = sha256(new TextEncoder().encode(message));
  const signature = await ed25519.sign(messageHash, privateKey);
  const signatureHex = Buffer.from(signature).toString('hex');
  const publicKeyHex = Buffer.from(publicKey).toString('hex');
  
  console.log('Verifying signature...');
  const verification = await verifyCosignerSignature(
    draft.draft.id,
    'testPeer',
    signatureHex,
    publicKeyHex
  );
  
  console.log('Verification result:', verification);
}

testSignature().catch(console.error);