import { useEffect, useState } from 'react';
import { Fuel, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePublicClient, useNetwork } from 'wagmi';
import { formatGwei } from 'viem';

interface GasEstimateDisplayProps {
  className?: string;
}

type GasPriceLevel = 'low' | 'medium' | 'high';

export default function GasEstimateDisplay({ className = '' }: GasEstimateDisplayProps) {
  const publicClient = usePublicClient();
  const { chain } = useNetwork();
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchGasPrice = async () => {
      if (!publicClient || !chain) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const price = await publicClient.getGasPrice();
        if (mounted) {
          setGasPrice(price);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch gas price');
          setIsLoading(false);
        }
      }
    };

    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 15000); // Update every 15 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [publicClient, chain]);

  const getGasPriceLevel = (price: bigint): GasPriceLevel => {
    const gwei = Number(formatGwei(price));
    if (gwei < 20) return 'low';
    if (gwei < 50) return 'medium';
    return 'high';
  };

  const getGasPriceColor = (level: GasPriceLevel): string => {
    switch (level) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
    }
  };

  const getGasPriceIcon = (level: GasPriceLevel) => {
    switch (level) {
      case 'low':
        return <TrendingDown className="w-4 h-4" />;
      case 'medium':
        return <Fuel className="w-4 h-4" />;
      case 'high':
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-surface/50 rounded-lg ${className}`}>
        <Fuel className="w-4 h-4 text-gray-400 animate-pulse" />
        <span className="text-xs text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error || !gasPrice) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-surface/50 rounded-lg ${className}`}>
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        <span className="text-xs text-gray-400">Gas unavailable</span>
      </div>
    );
  }

  const level = getGasPriceLevel(gasPrice);
  const colorClass = getGasPriceColor(level);
  const gweiValue = formatGwei(gasPrice);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center space-x-2 px-3 py-2 bg-surface/50 rounded-lg border border-white/5 ${className}`}
    >
      <div className={colorClass}>{getGasPriceIcon(level)}</div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-400">Gas</span>
        <span className={`text-sm font-semibold ${colorClass}`}>
          {parseFloat(gweiValue).toFixed(1)} Gwei
        </span>
      </div>
    </motion.div>
  );
}
