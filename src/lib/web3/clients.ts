import { http, createPublicClient, createWalletClient, type Address, type Hash, type PublicClient, type WalletClient } from 'viem';
import {
  arbitrum,
  base,
  bsc,
  type Chain,
  localhost,
  mainnet,
  optimism,
  polygon,
} from 'viem/chains';
import { getAccount, watchAccount } from '@wagmi/core';
import type { ChainConfig, ContractAddresses } from './types';

const isBrowser = typeof window !== 'undefined';

const defaultChains: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [polygon.id]: polygon,
  [bsc.id]: bsc,
  [arbitrum.id]: arbitrum,
  [optimism.id]: optimism,
  [base.id]: base,
  [localhost.id]: localhost,
};

const publicClientCache = new Map<number, PublicClient>();
const walletClientCache = new Map<number, WalletClient>();

export interface Web3Clients {
  publicClient: PublicClient;
  walletClient: WalletClient | null;
  account: Address | null;
  chain: Chain;
}

export function resolveChain(chainId: number): Chain {
  const chain = defaultChains[chainId];
  if (chain) {
    return chain;
  }

  throw new Error(`Unsupported chainId: ${chainId}`);
}

export function createClient(chainId: number, rpcUrl?: string): PublicClient {
  if (publicClientCache.has(chainId)) {
    return publicClientCache.get(chainId)!;
  }

  const chain = resolveChain(chainId);

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl || chain.rpcUrls.default.http[0], {
      fetchOptions: {
        keepalive: true,
      },
    }),
  });

  publicClientCache.set(chainId, client);

  return client;
}

export function createWallet(chainId: number): WalletClient | null {
  if (!isBrowser) {
    return null;
  }

  if (walletClientCache.has(chainId)) {
    return walletClientCache.get(chainId)!;
  }

  const account = getAccount();
  if (!account || !account.address) {
    return null;
  }

  const chain = resolveChain(chainId);

  const walletClient = createWalletClient({
    account: account.address as Address,
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });

  walletClientCache.set(chainId, walletClient);

  return walletClient;
}

export function getWeb3Clients(chainId: number, rpcUrl?: string): Web3Clients {
  const publicClient = createClient(chainId, rpcUrl);
  const accountInfo = isBrowser ? getAccount() : null;
  const walletClient = isBrowser ? createWallet(chainId) : null;
  return {
    publicClient,
    walletClient,
    account: accountInfo?.address ?? null,
    chain: resolveChain(chainId),
  };
}

export function createContract<TAbi extends readonly unknown[] = readonly unknown[]>(
  address: Address,
  abi: TAbi,
  chainId: number,
  rpcUrl?: string,
) {
  const { publicClient, walletClient } = getWeb3Clients(chainId, rpcUrl);

  const readContract = publicClient.readContract as unknown as (params: {
    address: Address;
    abi: TAbi;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;

  const writeContract = walletClient?.writeContract as
    | ((params: {
        address: Address;
        abi: TAbi;
        functionName: string;
        args?: readonly unknown[];
      }) => Promise<Hash>)
    | undefined;

  return {
    read: {
      async call(functionName: string, args: readonly unknown[] = []) {
        return await readContract({
          address,
          abi,
          functionName,
          args,
        });
      },
    },
    write: {
      async call(functionName: string, args: readonly unknown[] = []) {
        if (!writeContract) {
          throw new Error('Wallet not connected');
        }
        return await writeContract({
          address,
          abi,
          functionName,
          args,
        });
      },
    },
    publicClient,
    walletClient,
  };
}

export function resolveContracts(chainConfig: ChainConfig): ContractAddresses {
  return chainConfig.contracts;
}

export function watchAccountChanges(callback: (account: Address | null) => void) {
  if (!isBrowser) {
    return () => {};
  }

  const unwatch = watchAccount((data) => {
    callback(data.address ? (data.address as Address) : null);
  });

  return unwatch;
}
