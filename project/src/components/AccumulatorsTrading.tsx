import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, DollarSign, Clock, AlertCircle, Play, CheckCircle, XCircle, RefreshCw, BarChart3, Zap, Settings, Pause } from 'lucide-react';
import derivAPI from '../services/derivAPI';

interface AccumulatorParams {
  symbol: string;
  amount: number;
  growthRate: number;
  barrier: string;
  barrierType: 'up' | 'down';
}

interface ActiveAccumulator {
  id: string;
  contractId?: number;
  symbol: string;
  amount: number;
  growthRate: number;
  barrier: string;
  barrierType: 'up' | 'down';
  entrySpot?: number;
  currentSpot?: number;
  accumulatedValue?: number;
  tickCount?: number;
  profit?: number;
  status: 'pending' | 'active' | 'knocked_out' | 'closed';
  startTime: number;
  endTime?: number;
  knockOutTime?: number;
  isKnockedOut?: boolean;
}

interface BarrierConfig {
  symbol: string;
  name: string;
  defaultUpOffset: number;
  defaultDownOffset: number;
  minOffset: number;
  maxOffset: number;
  pipSize: number;
}

const AccumulatorsTrading: React.FC = () => {
  const [accumulatorParams, setAccumulatorParams] = useState<AccumulatorParams>({
    symbol: 'R_10',
    amount: 10,
    growthRate: 3,
    barrier: '',
    barrierType: 'up'
  });

  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [activeAccumulators, setActiveAccumulators] = useState<ActiveAccumulator[]>([]);
  const [isPlacingTrade, setIsPlacingTrade] = useState(false);
  const [accumulatorHistory, setAccumulatorHistory] = useState<ActiveAccumulator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processedContracts, setProcessedContracts] = useState<Set<number>>(new Set());
  const [showBarrierSettings, setShowBarrierSettings] = useState(false);
  const [customBarrierOffsets, setCustomBarrierOffsets] = useState<{[key: string]: {up: number, down: number}}>({});

  // Barrier configurations for different volatility indices
  const barrierConfigs: BarrierConfig[] = [
    {
      symbol: 'R_10',
      name: 'Volatility 10 Index',
      defaultUpOffset: 0.05,
      defaultDownOffset: 0.05,
      minOffset: 0.01,
      maxOffset: 0.5,
      pipSize: 0.001
    },
    {
      symbol: 'R_25',
      name: 'Volatility 25 Index',
      defaultUpOffset: 0.1,
      defaultDownOffset: 0.1,
      minOffset: 0.02,
      maxOffset: 1.0,
      pipSize: 0.001
    },
    {
      symbol: 'R_50',
      name: 'Volatility 50 Index',
      defaultUpOffset: 0.2,
      defaultDownOffset: 0.2,
      minOffset: 0.05,
      maxOffset: 2.0,
      pipSize: 0.001
    },
    {
      symbol: 'R_75',
      name: 'Volatility 75 Index',
      defaultUpOffset: 0.3,
      defaultDownOffset: 0.3,
      minOffset: 0.08,
      maxOffset: 3.0,
      pipSize: 0.001
    },
    {
      symbol: 'R_100',
      name: 'Volatility 100 Index',
      defaultUpOffset: 0.4,
      defaultDownOffset: 0.4,
      minOffset: 0.1,
      maxOffset: 4.0,
      pipSize: 0.001
    }
  ];

  const symbols = barrierConfigs.map(config => ({
    value: config.symbol,
    name: config.name,
    description: `${config.symbol.replace('R_', '')}% volatility`
  }));

  // Growth rates available for accumulators
  const growthRates = [1, 2, 3, 4, 5];

  useEffect(() => {
    // Subscribe to connection status
    derivAPI.onConnectionChange((data) => {
      setIsConnected(data.connected);
      if (data.connected) {
        const info = derivAPI.getAccountInfo();
        setAccountInfo(info);
        subscribeToPriceUpdates();
      } else {
        setAccountInfo(null);
        setCurrentPrice(null);
      }
    });

    // Check initial connection
    if (derivAPI.isConnected()) {
      setIsConnected(true);
      const info = derivAPI.getAccountInfo();
      setAccountInfo(info);
      subscribeToPriceUpdates();
    }

    return () => {
      derivAPI.unsubscribe(accumulatorParams.symbol, 'tick');
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      subscribeToPriceUpdates();
    }
  }, [accumulatorParams.symbol, isConnected]);

  useEffect(() => {
    // Update barrier when price or symbol changes
    if (currentPrice) {
      updateBarrier();
    }
  }, [currentPrice, accumulatorParams.symbol, accumulatorParams.barrierType]);

  const subscribeToPriceUpdates = () => {
    if (!isConnected) return;

    derivAPI.unsubscribe(accumulatorParams.symbol, 'tick');

    derivAPI.subscribeTicks(accumulatorParams.symbol, (data) => {
      if (data.tick && typeof data.tick.quote === 'number') {
        const price = data.tick.quote;
        setCurrentPrice(price);
        
        // Update active accumulators with current spot and simulate accumulation
        setActiveAccumulators(prev => prev.map(accumulator => {
          if (accumulator.status === 'active') {
            const updatedAccumulator = { ...accumulator, currentSpot: price };
            
            // Check if price hits barrier (knock out condition)
            const barrier = parseFloat(accumulator.barrier);
            const isKnockedOut = accumulator.barrierType === 'up' 
              ? price >= barrier 
              : price <= barrier;
            
            if (isKnockedOut && !accumulator.isKnockedOut) {
              updatedAccumulator.isKnockedOut = true;
              updatedAccumulator.status = 'knocked_out';
              updatedAccumulator.knockOutTime = Date.now();
              
              // Move to history
              setAccumulatorHistory(prevHistory => {
                const exists = prevHistory.some(h => h.id === accumulator.id);
                if (!exists) {
                  return [...prevHistory, updatedAccumulator];
                }
                return prevHistory;
              });
              
              return null; // Will be filtered out
            } else if (!isKnockedOut) {
              // Accumulate value (simulate growth)
              const tickCount = (updatedAccumulator.tickCount || 0) + 1;
              const growthPerTick = accumulator.growthRate / 100;
              const accumulatedValue = accumulator.amount * (1 + (growthPerTick * tickCount / 100));
              
              updatedAccumulator.tickCount = tickCount;
              updatedAccumulator.accumulatedValue = accumulatedValue;
              updatedAccumulator.profit = accumulatedValue - accumulator.amount;
            }
            
            return updatedAccumulator;
          }
          return accumulator;
        }).filter(Boolean) as ActiveAccumulator[]);
      }
    }).catch(error => {
      console.error('Failed to subscribe to price updates:', error);
    });
  };

  const getCurrentBarrierConfig = (): BarrierConfig => {
    return barrierConfigs.find(config => config.symbol === accumulatorParams.symbol) || barrierConfigs[0];
  };

  const getBarrierOffset = (type: 'up' | 'down'): number => {
    const config = getCurrentBarrierConfig();
    const customOffsets = customBarrierOffsets[accumulatorParams.symbol];
    
    if (customOffsets) {
      return type === 'up' ? customOffsets.up : customOffsets.down;
    }
    
    return type === 'up' ? config.defaultUpOffset : config.defaultDownOffset;
  };

  const updateBarrier = () => {
    if (!currentPrice) return;
    
    const offset = getBarrierOffset(accumulatorParams.barrierType);
    const newBarrier = accumulatorParams.barrierType === 'up' 
      ? (currentPrice + offset).toFixed(5)
      : (currentPrice - offset).toFixed(5);
    
    setAccumulatorParams(prev => ({ ...prev, barrier: newBarrier }));
  };

  const calculateMaxPayout = (): number => {
    // Accumulators can theoretically accumulate indefinitely, but we'll show a reasonable estimate
    const estimatedTicks = 100; // Assume 100 ticks before knock out
    const growthPerTick = accumulatorParams.growthRate / 100;
    return accumulatorParams.amount * (1 + (growthPerTick * estimatedTicks / 100));
  };

  const buyAccumulator = (proposalId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const buyParams = {
        buy: proposalId,
        price: accumulatorParams.amount
      };

      console.log('💰 Buying Accumulator contract with params:', buyParams);

      const timeout = setTimeout(() => {
        reject(new Error('Buy request timeout'));
      }, 15000);

      const messageHandler = (data: any) => {
        if (data.buy && data.echo_req && 
            data.echo_req.buy === buyParams.buy &&
            data.echo_req.price === buyParams.price) {
          clearTimeout(timeout);
          derivAPI.removeMessageHandler?.(messageHandler);
          resolve(data);
        }
      };

      derivAPI.addMessageHandler?.(messageHandler);
      
      const success = derivAPI.send(buyParams);
      if (!success) {
        clearTimeout(timeout);
        reject(new Error('Failed to send buy request'));
      }
    });
  };

  const subscribeToContractUpdates = (contractId: number, accumulatorId: string) => {
    console.log('📈 Subscribing to Accumulator contract updates for:', contractId);
    
    if (processedContracts.has(contractId)) {
      console.log('📈 Already processing contract:', contractId);
      return;
    }
    
    setProcessedContracts(prev => new Set(prev).add(contractId));
    
    derivAPI.subscribeToContract(contractId);
    
    const contractHandler = (data: any) => {
      if (data.proposal_open_contract && data.proposal_open_contract.contract_id === contractId) {
        const contract = data.proposal_open_contract;
        console.log('📊 Accumulator contract update received:', contract);
        
        setActiveAccumulators(prev => prev.map(accumulator => {
          if (accumulator.id === accumulatorId) {
            const updatedAccumulator = {
              ...accumulator,
              currentSpot: contract.current_spot,
              profit: contract.profit,
              accumulatedValue: contract.current_spot_display_value ? parseFloat(contract.current_spot_display_value) : accumulator.accumulatedValue
            };

            // Check if contract is closed or knocked out
            if (contract.is_expired || contract.is_sold) {
              updatedAccumulator.status = contract.is_sold ? 'closed' : 'knocked_out';
              
              setAccumulatorHistory(prevHistory => {
                const exists = prevHistory.some(h => h.contractId === contractId);
                if (!exists) {
                  return [...prevHistory, updatedAccumulator];
                }
                return prevHistory;
              });
              return null;
            }

            return updatedAccumulator;
          }
          return accumulator;
        }).filter(Boolean) as ActiveAccumulator[]);
      }
    };

    derivAPI.addMessageHandler?.(contractHandler);
  };

  const quickTrade = async (barrierType: 'up' | 'down') => {
    const quickTradeParams = {
      ...accumulatorParams,
      barrierType
    };
    
    setAccumulatorParams(quickTradeParams);
    await placeTradeWithParams(quickTradeParams);
  };

  const placeTradeWithParams = async (params: AccumulatorParams = accumulatorParams) => {
    if (!isConnected || !accountInfo) {
      setError('Please connect your API token first');
      return;
    }

    if (!currentPrice) {
      setError('Waiting for price data...');
      return;
    }

    if (params.amount <= 0) {
      setError('Please enter a valid stake amount');
      return;
    }

    if (!params.barrier) {
      setError('Barrier not set. Please wait for price data.');
      return;
    }

    setIsPlacingTrade(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🎯 Placing Accumulator trade:', params);

      const proposal = await createTradeProposalWithParams(params);
      
      if (proposal.error) {
        throw new Error(proposal.error.message || 'Failed to create trade proposal');
      }

      const buyResult = await buyAccumulator(proposal.proposal.id);
      
      if (buyResult.error) {
        throw new Error(buyResult.error.message || 'Failed to buy contract');
      }

      const newAccumulator: ActiveAccumulator = {
        id: `accumulator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contractId: buyResult.buy.contract_id,
        symbol: params.symbol,
        amount: params.amount,
        growthRate: params.growthRate,
        barrier: params.barrier,
        barrierType: params.barrierType,
        entrySpot: currentPrice,
        currentSpot: currentPrice,
        accumulatedValue: params.amount,
        tickCount: 0,
        status: 'active',
        startTime: Date.now(),
        isKnockedOut: false
      };

      setActiveAccumulators(prev => [...prev, newAccumulator]);
      setSuccess(`Accumulator started successfully! Growth rate: ${params.growthRate}%, Barrier: ${params.barrier}. Contract ID: ${buyResult.buy.contract_id}`);

      subscribeToContractUpdates(buyResult.buy.contract_id, newAccumulator.id);

      console.log('✅ Accumulator placed successfully:', newAccumulator);

    } catch (error) {
      console.error('❌ Failed to place Accumulator:', error);
      setError(error instanceof Error ? error.message : 'Failed to place accumulator');
    } finally {
      setIsPlacingTrade(false);
    }
  };

  const placeTrade = async () => {
    await placeTradeWithParams();
  };

  const createTradeProposalWithParams = (params: AccumulatorParams): Promise<any> => {
    return new Promise((resolve, reject) => {
      const proposalParams: any = {
        proposal: 1,
        amount: params.amount,
        basis: 'stake',
        contract_type: 'ACCU',
        currency: accountInfo.currency,
        symbol: params.symbol,
        barrier: params.barrier,
        growth_rate: params.growthRate / 100 // Convert percentage to decimal
      };

      console.log('📋 Creating Accumulator proposal with params:', proposalParams);

      const timeout = setTimeout(() => {
        reject(new Error('Proposal request timeout - please try again'));
      }, 45000);

      const messageHandler = (data: any) => {
        if (data.proposal && data.echo_req && 
            data.echo_req.proposal === proposalParams.proposal &&
            data.echo_req.symbol === proposalParams.symbol &&
            data.echo_req.contract_type === proposalParams.contract_type) {
          clearTimeout(timeout);
          derivAPI.removeMessageHandler?.(messageHandler);
          resolve(data);
        }
        
        // Handle error responses
        if (data.error && data.echo_req && 
            data.echo_req.proposal === proposalParams.proposal &&
            data.echo_req.symbol === proposalParams.symbol) {
          clearTimeout(timeout);
          derivAPI.removeMessageHandler?.(messageHandler);
          reject(new Error(data.error.message || 'Proposal request failed'));
        }
      };

      derivAPI.addMessageHandler?.(messageHandler);
      
      const success = derivAPI.send(proposalParams);
      if (!success) {
        clearTimeout(timeout);
        reject(new Error('Failed to send proposal request'));
      }
    });
  };

  const closeAccumulator = async (accumulatorId: string) => {
    const accumulator = activeAccumulators.find(a => a.id === accumulatorId);
    if (!accumulator || !accumulator.contractId) return;

    try {
      // Send sell request to close the accumulator
      const sellParams = {
        sell: accumulator.contractId,
        price: 0 // Market price
      };

      const success = derivAPI.send(sellParams);
      if (success) {
        setSuccess('Accumulator closed successfully!');
        
        // Update status locally
        setActiveAccumulators(prev => prev.map(a => 
          a.id === accumulatorId 
            ? { ...a, status: 'closed', endTime: Date.now() }
            : a
        ));
      }
    } catch (error) {
      setError('Failed to close accumulator');
    }
  };

  const updateCustomBarrierOffset = (type: 'up' | 'down', value: number) => {
    const config = getCurrentBarrierConfig();
    const clampedValue = Math.max(config.minOffset, Math.min(config.maxOffset, value));
    
    setCustomBarrierOffsets(prev => ({
      ...prev,
      [accumulatorParams.symbol]: {
        ...prev[accumulatorParams.symbol],
        [type]: clampedValue
      }
    }));
  };

  const resetToDefaultBarriers = () => {
    setCustomBarrierOffsets(prev => {
      const newOffsets = { ...prev };
      delete newOffsets[accumulatorParams.symbol];
      return newOffsets;
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getAccumulatorStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-400';
      case 'knocked_out': return 'text-red-400';
      case 'closed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const currentConfig = getCurrentBarrierConfig();
  const upBarrier = currentPrice ? (currentPrice + getBarrierOffset('up')).toFixed(5) : '0.00000';
  const downBarrier = currentPrice ? (currentPrice - getBarrierOffset('down')).toFixed(5) : '0.00000';

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-green-400">Accumulators Trading</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span>Accumulate Profits While Price Stays in Range</span>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">API Connection Required</span>
          </div>
          <p className="text-red-300 text-sm mt-1">
            Please go to Settings and add your Deriv API token to enable live trading.
          </p>
        </div>
      )}

      {isConnected && !accountInfo && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Authorization Required</span>
          </div>
          <p className="text-yellow-300 text-sm mt-1">
            Connected to Deriv API but not authorized. Please check your API token in Settings.
          </p>
        </div>
      )}

      {/* Account Info */}
      {accountInfo && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">
                {accountInfo.currency} {parseFloat(accountInfo.balance || 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Account Balance</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{accountInfo.loginid}</div>
              <div className="text-sm text-gray-400">Login ID</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">
                {currentPrice ? currentPrice.toFixed(5) : 'Loading...'}
              </div>
              <div className="text-sm text-gray-400">Current Price ({accumulatorParams.symbol})</div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Explanation */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-blue-400 font-medium mb-2">How Accumulators Work:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-300">
          <div>
            <p className="font-medium text-green-400 mb-1">Accumulation:</p>
            <p>Your stake grows at the selected growth rate for every tick the price stays within the barrier range.</p>
          </div>
          <div>
            <p className="font-medium text-red-400 mb-1">Knock Out:</p>
            <p>If the price touches the barrier, the accumulator is knocked out and you receive the accumulated amount.</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-400 text-sm">
            <strong>Strategy:</strong> Choose barriers close to current price for higher growth rates but higher knock-out risk, 
            or farther barriers for lower growth but longer accumulation time.
          </p>
        </div>
      </div>

      {/* Current Barriers Display */}
      {currentPrice && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold">Current Barriers</h4>
            <button
              onClick={() => setShowBarrierSettings(!showBarrierSettings)}
              className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Adjust</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-red-400 font-medium text-sm">Up Barrier</div>
              <div className="text-xl font-bold text-white">{upBarrier}</div>
              <div className="text-xs text-gray-400">+{getBarrierOffset('up').toFixed(3)}</div>
            </div>
            
            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-blue-400 font-medium text-sm">Current Price</div>
              <div className="text-xl font-bold text-white">{currentPrice.toFixed(5)}</div>
              <div className="text-xs text-gray-400">Entry Spot</div>
            </div>
            
            <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-green-400 font-medium text-sm">Down Barrier</div>
              <div className="text-xl font-bold text-white">{downBarrier}</div>
              <div className="text-xs text-gray-400">-{getBarrierOffset('down').toFixed(3)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Barrier Settings */}
      {showBarrierSettings && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-4">Barrier Settings for {currentConfig.name}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Up Barrier Offset
              </label>
              <input
                type="number"
                value={getBarrierOffset('up')}
                onChange={(e) => updateCustomBarrierOffset('up', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                min={currentConfig.minOffset}
                max={currentConfig.maxOffset}
                step={currentConfig.pipSize}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Down Barrier Offset
              </label>
              <input
                type="number"
                value={getBarrierOffset('down')}
                onChange={(e) => updateCustomBarrierOffset('down', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                min={currentConfig.minOffset}
                max={currentConfig.maxOffset}
                step={currentConfig.pipSize}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={resetToDefaultBarriers}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => setShowBarrierSettings(false)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Trading Panel */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 p-4 md:p-6 rounded-xl">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span>Start Accumulator</span>
          </h3>
          
          <div className="space-y-4">
            {/* Symbol Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Asset</label>
              <select 
                value={accumulatorParams.symbol}
                onChange={(e) => setAccumulatorParams(prev => ({ ...prev, symbol: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                {symbols.map(symbol => (
                  <option key={symbol.value} value={symbol.value}>
                    {symbol.name} - {symbol.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Growth Rate Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Growth Rate per Tick</label>
              <div className="grid grid-cols-5 gap-2">
                {growthRates.map(rate => (
                  <button
                    key={rate}
                    onClick={() => setAccumulatorParams(prev => ({ ...prev, growthRate: rate }))}
                    className={`py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                      accumulatorParams.growthRate === rate
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Higher growth rates mean faster accumulation but typically closer barriers.
              </p>
            </div>

            {/* Barrier Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Barrier Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAccumulatorParams(prev => ({ ...prev, barrierType: 'up' }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    accumulatorParams.barrierType === 'up'
                      ? 'bg-red-500/20 text-red-400 border border-red-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Up Barrier</span>
                </button>
                <button
                  onClick={() => setAccumulatorParams(prev => ({ ...prev, barrierType: 'down' }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    accumulatorParams.barrierType === 'down'
                      ? 'bg-green-500/20 text-green-400 border border-green-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <TrendingDown className="w-3 h-3" />
                  <span>Down Barrier</span>
                </button>
              </div>
            </div>

            {/* Stake Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Initial Stake</label>
              <input
                type="number"
                value={accumulatorParams.amount}
                onChange={(e) => setAccumulatorParams(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                placeholder="Enter initial stake"
                min="1"
                step="0.01"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {[5, 10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setAccumulatorParams(prev => ({ ...prev, amount }))}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 text-xs rounded transition-colors"
                  >
                    {accountInfo?.currency || '$'}{amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Accumulator Info */}
            <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Growth Rate:</span>
                <span className="text-green-400 font-semibold">
                  {accumulatorParams.growthRate}% per tick
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Barrier:</span>
                <span className="text-blue-400 font-semibold">
                  {accumulatorParams.barrier || 'Calculating...'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Max Potential (100 ticks):</span>
                <span className="text-yellow-400 font-semibold">
                  {accountInfo?.currency || '$'}{calculateMaxPayout().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Risk:</span>
                <span className="text-orange-400 font-semibold">
                  Knock out if barrier touched
                </span>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                  <button onClick={clearMessages} className="text-red-400 hover:text-red-300">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">{success}</span>
                  </div>
                  <button onClick={clearMessages} className="text-green-400 hover:text-green-300">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Start Accumulator Button */}
            <button 
              onClick={placeTrade}
              disabled={!isConnected || !accountInfo || isPlacingTrade || !currentPrice || accumulatorParams.amount <= 0}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isPlacingTrade ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Starting Accumulator...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Accumulator</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Accumulators & History */}
        <div className="space-y-4">
          {/* Active Accumulators */}
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Active Accumulators ({activeAccumulators.length})</span>
            </h4>
            
            {activeAccumulators.length === 0 ? (
              <p className="text-gray-400 text-sm">No active accumulators</p>
            ) : (
              <div className="space-y-3">
                {activeAccumulators.map((accumulator) => (
                  <div key={accumulator.id} className="p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-white font-medium text-sm">
                          {accumulator.symbol} {accumulator.growthRate}%
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium ${getAccumulatorStatusColor(accumulator.status)}`}>
                          {accumulator.status.toUpperCase()}
                        </span>
                        {accumulator.status === 'active' && (
                          <button
                            onClick={() => closeAccumulator(accumulator.id)}
                            className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Initial:</span>
                        <span className="text-white ml-1">{accountInfo?.currency || '$'}{accumulator.amount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Current Value:</span>
                        <span className="text-green-400 ml-1 font-medium">
                          {accountInfo?.currency || '$'}{(accumulator.accumulatedValue || accumulator.amount).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Ticks:</span>
                        <span className="text-white ml-1">{accumulator.tickCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Profit:</span>
                        <span className={`ml-1 font-medium ${(accumulator.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {accountInfo?.currency || '$'}{(accumulator.profit || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Barrier:</span>
                        <span className="text-blue-400">{accumulator.barrier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current:</span>
                        <span className="text-white">{accumulator.currentSpot?.toFixed(5)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-400">
                      Started: {formatTime(accumulator.startTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accumulator History */}
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <h4 className="text-lg font-semibold text-white mb-3">Recent History</h4>
            
            {accumulatorHistory.length === 0 ? (
              <p className="text-gray-400 text-sm">No completed accumulators</p>
            ) : (
              <div className="space-y-2">
                {accumulatorHistory.slice(-5).map((accumulator) => (
                  <div key={accumulator.id} className="p-2 bg-gray-700/30 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-white text-xs">{accumulator.symbol}</span>
                        <span className="text-gray-400 text-xs">({accumulator.growthRate}%)</span>
                      </div>
                      <span className={`text-xs font-medium ${getAccumulatorStatusColor(accumulator.status)}`}>
                        {accumulator.status === 'knocked_out' ? 'KNOCKED OUT' : 'CLOSED'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-400">{accountInfo?.currency || '$'}{accumulator.amount}</span>
                      <span className={accumulator.profit && accumulator.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {accumulator.profit ? `${accountInfo?.currency || '$'}${accumulator.profit.toFixed(2)}` : '0.00'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Ticks: {accumulator.tickCount || 0}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accumulator Info */}
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Accumulator Info</span>
            </h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Growth Method:</span>
                <span className="text-white">Per tick accumulation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Knock Out:</span>
                <span className="text-white">When barrier touched</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Duration:</span>
                <span className="text-green-400">Until knocked out or closed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Best Strategy:</span>
                <span className="text-blue-400">Monitor and close manually</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 font-medium">Risk Warning</p>
            <p className="text-orange-300 text-sm mt-1">
              Accumulators involve substantial risk and may result in loss of capital. 
              While they can accumulate significant profits, they can be knocked out instantly if the price touches the barrier.
              Higher growth rates typically come with barriers closer to the current price, increasing knock-out risk.
              Monitor your positions actively and consider closing manually to secure profits.
              Only trade with money you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccumulatorsTrading;