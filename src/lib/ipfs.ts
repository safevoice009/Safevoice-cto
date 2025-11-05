import { create } from 'ipfs-http-client';
import type { IPFSHTTPClient } from 'ipfs-http-client';

export interface IPFSUploadResult {
  success: boolean;
  cid?: string;
  error?: string;
}

let ipfsClient: IPFSHTTPClient | null = null;

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

/**
 * Initialize IPFS HTTP client
 * Tries to connect to local node first, falls back to public gateway
 */
function getIPFSClient(): IPFSHTTPClient | null {
  if (ipfsClient) {
    return ipfsClient;
  }

  try {
    // Try local IPFS node first
    ipfsClient = create({
      url: 'http://localhost:5001',
      timeout: 10000,
    });
    return ipfsClient;
  } catch (error) {
    console.warn('Failed to create IPFS client:', error);
    return null;
  }
}

/**
 * Upload content to IPFS with graceful failure handling
 * @param content - The text content to upload
 * @param userOptedIn - Whether the user opted in to IPFS storage
 * @returns IPFSUploadResult with success status and CID if successful
 */
export async function uploadToIPFS(
  content: string,
  userOptedIn: boolean = false
): Promise<IPFSUploadResult> {
  // If user didn't opt in, don't upload
  if (!userOptedIn) {
    return {
      success: false,
      error: 'User did not opt in to IPFS storage',
    };
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    return {
      success: false,
      error: 'Content is empty',
    };
  }

  const client = getIPFSClient();
  if (!client) {
    return {
      success: false,
      error: 'IPFS client not available',
    };
  }

  try {
    // Convert content to buffer
    const buffer = new TextEncoder().encode(content);

    // Upload to IPFS
    const result = await client.add(buffer, {
      timeout: 15000, // 15 second timeout
    });

    if (result && result.cid) {
      return {
        success: true,
        cid: result.cid.toString(),
      };
    }

    return {
      success: false,
      error: 'No CID returned from IPFS',
    };
  } catch (error) {
    console.error('IPFS upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload',
    };
  }
}

/**
 * Get IPFS gateway URL for a given CID
 * @param cid - The IPFS content identifier
 * @param gatewayIndex - Index of the gateway to use (0-3)
 * @returns Full URL to access the content via gateway
 */
export function getIPFSGatewayUrl(cid: string, gatewayIndex: number = 0): string {
  const gateway = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length];
  return `${gateway}${cid}`;
}

/**
 * Get all available gateway URLs for a CID
 * @param cid - The IPFS content identifier
 * @returns Array of gateway URLs
 */
export function getAllGatewayUrls(cid: string): string[] {
  return IPFS_GATEWAYS.map((gateway) => `${gateway}${cid}`);
}

/**
 * Verify that content at a CID matches the original
 * @param cid - The IPFS content identifier
 * @param originalContent - The original content to compare against
 * @returns Promise that resolves to true if content matches
 */
export async function verifyIPFSContent(
  cid: string,
  originalContent: string
): Promise<boolean> {
  try {
    // Try each gateway until one works
    for (const gatewayUrl of getAllGatewayUrls(cid)) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(gatewayUrl, {
          method: 'GET',
          signal: controller.signal,
        });

        if (response.ok) {
          const retrievedContent = await response.text();
          clearTimeout(timeoutId);
          return retrievedContent.trim() === originalContent.trim();
        }
      } catch {
        // Try next gateway on network errors or timeouts
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return false;
  } catch (error) {
    console.error('IPFS verification failed:', error);
    return false;
  }
}

/**
 * Reset IPFS client (testing utility)
 */
export function resetIPFSClientForTesting(): void {
  ipfsClient = null;
}
