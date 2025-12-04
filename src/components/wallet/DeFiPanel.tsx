import { useState } from 'react';
import { useStore } from '../../lib/store';
import { useDeFiIntegrations } from '../../lib/web3/hooks';
import type { Address } from 'viem';

export function DeFiPanel() {
  const { connectedAddress, selectedChainId } = useStore();
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  
  const {
    protocols,
    yields,
    deposit,
    withdraw,
    loading,
    totalDeposited,
    totalEarned,
  } = useDeFiIntegrations(
    connectedAddress as Address | undefined,
    selectedChainId
  );

  const handleDeposit = async () => {
    if (!selectedProtocol || !depositAmount) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    await deposit(selectedProtocol, amount);
    setDepositAmount('');
    setSelectedProtocol(null);
  };

  const handleWithdraw = async (protocolId: string, amount: number) => {
    await withdraw(protocolId, amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">DeFi Integrations</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {protocols.length} protocols available
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Deposited</div>
          <div className="text-2xl font-bold mt-1">
            {totalDeposited.toFixed(2)} VOICE
          </div>
        </div>
        <div className="rounded-lg border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4">
          <div className="text-sm text-green-600 dark:text-green-400">Total Earned</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            +{totalEarned.toFixed(2)} VOICE
          </div>
        </div>
      </div>

      {/* Active Positions */}
      {yields.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Active Positions</h4>
          {yields.map((position) => (
            <div
              key={position.protocolId}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{position.protocolName}</div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  APY: {position.apy.toFixed(2)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Deposited</div>
                  <div className="font-semibold">{position.deposited.toFixed(2)} VOICE</div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Earned</div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    +{position.earned.toFixed(2)} VOICE
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleWithdraw(position.protocolId, position.deposited)}
                disabled={loading}
                className="mt-3 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Withdraw
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available Protocols */}
      <div className="space-y-3">
        <h4 className="font-medium">Available Protocols</h4>
        <div className="grid gap-3">
          {protocols.map((protocol) => {
            const hasPosition = yields.some(y => y.protocolId === protocol.id);
            
            return (
              <div
                key={protocol.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">{protocol.logo}</div>
                    <div>
                      <div className="font-medium">{protocol.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {protocol.type}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {protocol.apy.toFixed(2)}% APY
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      TVL: ${(protocol.tvl / 1_000_000).toFixed(0)}M
                    </div>
                  </div>
                </div>

                {!hasPosition && (
                  <div className="space-y-2">
                    {selectedProtocol === protocol.id ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="Amount"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                          min="0"
                          step="0.01"
                        />
                        <button
                          onClick={handleDeposit}
                          disabled={loading || !depositAmount}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Deposit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProtocol(null);
                            setDepositAmount('');
                          }}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedProtocol(protocol.id)}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Deposit Tokens
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {protocols.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No DeFi protocols available on this chain
        </div>
      )}
    </div>
  );
}
