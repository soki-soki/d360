import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Target, DollarSign, Clock, AlertCircle, Play, CheckCircle, XCircle, RefreshCw, Hash, Zap } from 'lucide-react';
import derivAPI from '../services/derivAPI';

interface TradeParams {
  symbol: string;
  tradeType: 'DIGITOVER' | 'DIGITUNDER';
  amount: number;
  duration: number;
  durationType: 't' | 's';
  prediction: number; // The threshold digit (0-9)
}

interface ActiveTrade {
  id: string;
  contractId?: number;
  symbol: string;
  tradeType: 'DIGITOVER' | 'DIGITUNDER';
  amount: number;
  duration: number;
  durationType: string;
  prediction: number;
  entrySpot?: number;
  currentSpot?: number;
  finalDigit?: number;
  profit?: number;
  status: 'pending' | 'active' | 'won' | 'lost';
  startTime: number;
  endTime?: number;
  payout?: number;
}

const OverUnderTrading: React.FC = () => {
  const [tradeParams, setTradeParams] = useState<TradeParams>({
    symbol: 'R_10',
    tradeType: 'DIGITOVER',
    amount: 10,
    duration: 5,
    durationType: 's',
    prediction: 5
  });

  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [currentDigit, setCurrentDigit] = useState<number | null>(null);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [isPlacingTrade, setIsPlacingTrade] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<ActiveTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processedContracts, setProcessedContracts] = useState<Set<number>>(new Set());
  const [digitStats, setDigitStats] = useState<{over: number, under: number}>({over: 0, under: 0});

  // Available symbols for digit trading
  const symbols = [
    { value: 'R_10', name: 'Volatility 10 Index', description: '10% volatility' },
    { value: 'R_25', name: 'Volatility 25 Index', description: '25% volatility' },
    { value: 'R_50', name: 'Volatility 50 Index', description: '50% volatility' },
    { value: 'R_75', name: 'Volatility 75 Index', description: '75% volatility' },
    { value: 'R_100', name: 'Volatility 100 Index', description: '100% volatility' }
  ];

  // Digits 0-9 for threshold selection
  const digits = Array.from({ length: 10 }, (_, i) => i);

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
        setCurrentDigit(null);
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
      derivAPI.unsubscribe(tradeParams.symbol, 'tick');
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      subscribeToPriceUpdates();
    }
  }, [tradeParams.symbol, isConnected]);

  const subscribeToPriceUpdates = () => {
    if (!isConnected) return;

    derivAPI.unsubscribe(tradeParams.symbol, 'tick');

    derivAPI.subscribeTicks(tradeParams.symbol, (data) => {
      if (data.tick && typeof data.tick.quote === 'number') {
        const price = data.tick.quote;
        setCurrentPrice(price);
        
        // Extract last digit
        const lastDigit = extractLastDigit(price);
        setCurrentDigit(lastDigit);
        
        // Update digit statistics
        if (lastDigit !== null) {
          setDigitStats(prev => ({
            ...prev,
            [lastDigit > tradeParams.prediction ? 'over' : 'under']: prev[lastDigit > tradeParams.prediction ? 'over' : 'under'] + 1
          }));
        }
        
        // Update active trades with current spot
        setActiveTrades(prev => prev.map(trade => ({
          ...trade,
          currentSpot: price
        })));
      }
    }).catch(error => {
      console.error('Failed to subscribe to price updates:', error);
    });
  };

  const extractLastDigit = (price: number): number | null => {
    try {
      const priceStr = price.toString();
      const cleanStr = priceStr.replace('.', '');
      const lastChar = cleanStr.slice(-1);
      const digit = parseInt(lastChar);
      
      if (isNaN(digit) || digit < 0 || digit > 9) {
        return null;
      }
      
      return digit;
    } catch (error) {
      console.error('Error extracting digit:', error);
      return null;
    }
  };

  const calculatePayout = (): number => {
    // Over/Under payouts vary based on threshold
    // Over 5: ~1.8x (4 winning digits: 6,7,8,9)
    // Under 5: ~2.5x (5 winning digits: 0,1,2,3,4)
    const overDigits = 9 - tradeParams.prediction; // digits above threshold
    const underDigits = tradeParams.prediction + 1; // digits at or below threshold
    
    let multiplier = 1.0;
    if (tradeParams.tradeType === 'DIGITOVER') {
      multiplier = overDigits > 0 ? 10 / overDigits * 0.85 : 1.0; // 85% payout ratio
    } else {
      multiplier = underDigits > 0 ? 10 / underDigits * 0.85 : 1.0;
    }
    
    return tradeParams.amount * Math.max(1.1, multiplier);
  };

  const getWinProbability = (): number => {
    if (tradeParams.tradeType === 'DIGITOVER') {
      return ((9 - tradeParams.prediction) / 10) * 100;
    } else {
      return ((tradeParams.prediction + 1) / 10) * 100;
    }
  };

  const buyContract = (proposalId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const buyParams = {
        buy: proposalId,
        price: tradeParams.amount
      };

      console.log('💰 Buying Over/Under contract with params:', buyParams);

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

  const subscribeToContractUpdates = (contractId: number, tradeId: string) => {
    console.log('📈 Subscribing to Over/Under contract updates for:', contractId);
    
    if (processedContracts.has(contractId)) {
      console.log('📈 Already processing contract:', contractId);
      return;
    }
    
    setProcessedContracts(prev => new Set(prev).add(contractId));
    
    derivAPI.subscribeToContract(contractId);
    
    const contractHandler = (data: any) => {
      if (data.proposal_open_contract && data.proposal_open_contract.contract_id === contractId) {
        const contract = data.proposal_open_contract;
        console.log('📊 Over/Under contract update received:', contract);
        
        setActiveTrades(prev => prev.map(trade => {
          if (trade.id === tradeId) {
            const updatedTrade = {
              ...trade,
              currentSpot: contract.current_spot,
              profit: contract.profit,
              status: contract.is_expired ? 
                (contract.profit > 0 ? 'won' : 'lost') : 'active'
            };

            // Extract final digit if contract is expired
            if (contract.is_expired && contract.exit_tick_display_value) {
              const finalDigit = extractLastDigit(parseFloat(contract.exit_tick_display_value));
              updatedTrade.finalDigit = finalDigit;
            }

            if (contract.is_expired) {
              setTradeHistory(prevHistory => {
                const exists = prevHistory.some(h => h.contractId === contractId);
                if (!exists) {
                  return [...prevHistory, updatedTrade];
                }
                return prevHistory;
              });
              return null;
            }

            return updatedTrade;
          }
          return trade;
        }).filter(Boolean) as ActiveTrade[]);
      }
    };

    derivAPI.addMessageHandler?.(contractHandler);
  };

  const quickTrade = async (direction: 'DIGITOVER' | 'DIGITUNDER') => {
    const quickTradeParams = {
      ...tradeParams,
      tradeType: direction
    };
    
    setTradeParams(quickTradeParams);
    await placeTradeWithParams(quickTradeParams);
  };

  const placeTradeWithParams = async (params: TradeParams = tradeParams) => {
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

    if (params.prediction < 0 || params.prediction > 9) {
      setError('Please select a valid threshold digit (0-9)');
      return;
    }

    if (params.durationType === 't' && (params.duration < 1 || params.duration > 10)) {
      setError('Duration must be between 1 and 10 ticks for tick-based contracts');
      return;
    }

    setIsPlacingTrade(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🎯 Placing Over/Under trade:', params);

      const proposal = await createTradeProposalWithParams(params);
      
      if (proposal.error) {
        throw new Error(proposal.error.message || 'Failed to create trade proposal');
      }

      const buyResult = await buyContract(proposal.proposal.id);
      
      if (buyResult.error) {
        throw new Error(buyResult.error.message || 'Failed to buy contract');
      }

      const newTrade: ActiveTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contractId: buyResult.buy.contract_id,
        symbol: params.symbol,
        tradeType: params.tradeType,
        amount: params.amount,
        duration: params.duration,
        durationType: params.durationType,
        prediction: params.prediction,
        entrySpot: currentPrice,
        currentSpot: currentPrice,
        status: 'active',
        startTime: Date.now(),
        endTime: Date.now() + (params.durationType === 't' ? params.duration * 2000 : params.duration * 1000),
        payout: calculatePayout()
      };

      setActiveTrades(prev => [...prev, newTrade]);
      setSuccess(`${params.tradeType === 'DIGITOVER' ? 'Over' : 'Under'} ${params.prediction} trade placed successfully! Contract ID: ${buyResult.buy.contract_id}`);

      subscribeToContractUpdates(buyResult.buy.contract_id, newTrade.id);

      console.log('✅ Over/Under trade placed successfully:', newTrade);

    } catch (error) {
      console.error('❌ Failed to place Over/Under trade:', error);
      setError(error instanceof Error ? error.message : 'Failed to place trade');
    } finally {
      setIsPlacingTrade(false);
    }
  };

  const placeTrade = async () => {
    await placeTradeWithParams();
  };

  const createTradeProposalWithParams = (params: TradeParams): Promise<any> => {
    return new Promise((resolve, reject) => {
      const proposalParams: any = {
        proposal: 1,
        amount: params.amount,
        basis: 'stake',
        contract_type: params.tradeType,
        currency: accountInfo.currency,
        symbol: params.symbol,
        duration: params.duration,
        duration_unit: params.durationType
      };

      // For over/under contracts, the prediction is passed as 'barrier'
      proposalParams.barrier = params.prediction.toString();

      console.log('📋 Creating Over/Under proposal with params:', proposalParams);

      const timeout = setTimeout(() => {
        reject(new Error('Proposal request timeout - please try again'));
      }, 45000);

      const messageHandler = (data: any) => {
        if (data.proposal && data.echo_req && 
            data.echo_req.proposal === proposalParams.proposal &&
            data.echo_req.symbol === proposalParams.symbol &&
            data.echo_req.contract_type === proposalParams.contract_type &&
            data.echo_req.barrier === proposalParams.barrier) {
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

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTradeStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-400';
      case 'won': return 'text-green-400';
      case 'lost': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const getDigitColor = (digit: number) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500'
    ];
    return colors[digit];
  };

  const totalDigits = digitStats.over + digitStats.under;
  const overPercentage = totalDigits > 0 ? (digitStats.over / totalDigits) * 100 : 0;
  const underPercentage = totalDigits > 0 ? (digitStats.under / totalDigits) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-green-400">Over/Under Trading</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <ArrowUp className="w-4 h-4 text-green-400" />
          <span>Last Digit Over/Under Threshold</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <div className="text-sm text-gray-400">Current Price ({tradeParams.symbol})</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${currentDigit !== null ? getDigitColor(currentDigit).replace('bg-', 'text-') : 'text-gray-400'}`}>
                {currentDigit !== null ? currentDigit : '?'}
              </div>
              <div className="text-sm text-gray-400">Current Last Digit</div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Explanation */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-blue-400 font-medium mb-2">How Over/Under Trading Works:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-300">
          <div>
            <p className="font-medium text-green-400 mb-1">Over:</p>
            <p>Win if the last digit is higher than your chosen threshold.</p>
            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-gray-400 text-sm">Current Threshold: </span>
              <span className="text-white font-bold">{tradeParams.prediction}</span>
              <span className="text-gray-400 text-sm"> (Over: &gt;{tradeParams.prediction}, Under: ≤{tradeParams.prediction})</span>
            </div>
          </div>
          <div>
            <p className="font-medium text-red-400 mb-1">Under:</p>
            <p>Win if the last digit is equal to or lower than your chosen threshold.</p>
          </div>
        </div>
      </div>

      {/* Threshold Selection */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h4 className="text-white font-semibold mb-3">Choose Your Threshold (0-9)</h4>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-4">
          {digits.map(digit => (
            <button
              key={digit}
              onClick={() => setTradeParams(prev => ({ ...prev, prediction: digit }))}
              className={`w-12 h-12 ${getDigitColor(digit)} rounded-lg flex items-center justify-center text-white font-bold transition-all ${
                tradeParams.prediction === digit 
                  ? 'ring-2 ring-white scale-110' 
                  : 'hover:scale-105'
              }`}
            >
              {digit}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-blue-400 font-medium text-sm">Over {tradeParams.prediction}</div>
            <div className="text-white text-lg font-bold">
              {tradeParams.prediction < 9 ? `${tradeParams.prediction + 1}-9` : 'None'}
            </div>
            <div className="text-gray-400 text-xs">
              {tradeParams.prediction < 9 ? `${9 - tradeParams.prediction} digits` : '0 digits'} 
              ({getWinProbability().toFixed(0)}% if Over)
            </div>
          </div>
          
          <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="text-red-400 font-medium text-sm">Under/Equal {tradeParams.prediction}</div>
            <div className="text-white text-lg font-bold">
              0-{tradeParams.prediction}
            </div>
            <div className="text-gray-400 text-xs">
              {tradeParams.prediction + 1} digits 
              ({(100 - getWinProbability()).toFixed(0)}% if Under)
            </div>
          </div>
        </div>

        {/* Popular Thresholds */}
        <div className="mt-4">
          <p className="text-gray-400 text-sm mb-2">Popular Thresholds:</p>
          <div className="flex gap-2">
            {[3, 5, 7].map(threshold => (
              <button
                key={threshold}
                onClick={() => setTradeParams(prev => ({ ...prev, prediction: threshold }))}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
              >
                {threshold}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Over/Under Statistics */}
      {totalDigits > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-3">Recent Over/Under Statistics (Threshold: {tradeParams.prediction})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-blue-400 font-medium text-sm">Over {tradeParams.prediction}</div>
              <div className="text-2xl font-bold text-white">{digitStats.over}</div>
              <div className="text-sm text-gray-400">{overPercentage.toFixed(1)}%</div>
            </div>
            <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-red-400 font-medium text-sm">Under/Equal {tradeParams.prediction}</div>
              <div className="text-2xl font-bold text-white">{digitStats.under}</div>
              <div className="text-sm text-gray-400">{underPercentage.toFixed(1)}%</div>
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-600 rounded-full h-3 flex overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${overPercentage}%` }}></div>
            <div className="bg-red-500 h-full" style={{ width: `${underPercentage}%` }}></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Trading Panel */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 p-4 md:p-6 rounded-xl">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <ArrowUp className="w-5 h-5 text-green-400" />
            <span>Place Over/Under Trade</span>
          </h3>
          
          <div className="space-y-4">
            {/* Symbol Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Asset</label>
              <select 
                value={tradeParams.symbol}
                onChange={(e) => setTradeParams(prev => ({ ...prev, symbol: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                {symbols.map(symbol => (
                  <option key={symbol.value} value={symbol.value}>
                    {symbol.name} - {symbol.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Trade Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Quick Trade (Threshold: {tradeParams.prediction})</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => quickTrade('DIGITOVER')}
                  disabled={!isConnected || !accountInfo || isPlacingTrade || !currentPrice || tradeParams.amount <= 0 || tradeParams.prediction >= 9}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    isPlacingTrade || !isConnected || !accountInfo || !currentPrice || tradeParams.amount <= 0 || tradeParams.prediction >= 9
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>{isPlacingTrade && tradeParams.tradeType === 'DIGITOVER' ? 'Placing...' : `Over ${tradeParams.prediction}`}</span>
                </button>
                <button
                  onClick={() => quickTrade('DIGITUNDER')}
                  disabled={!isConnected || !accountInfo || isPlacingTrade || !currentPrice || tradeParams.amount <= 0}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    isPlacingTrade || !isConnected || !accountInfo || !currentPrice || tradeParams.amount <= 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  <ArrowDown className="w-4 h-4" />
                  <span>{isPlacingTrade && tradeParams.tradeType === 'DIGITUNDER' ? 'Placing...' : `Under ${tradeParams.prediction}`}</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click Over or Under to instantly place a trade with threshold {tradeParams.prediction}.
              </p>
            </div>

            {/* Trade Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Selected Type (for form)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeParams(prev => ({ ...prev, tradeType: 'DIGITOVER' }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    tradeParams.tradeType === 'DIGITOVER'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Over</span>
                </button>
                <button
                  onClick={() => setTradeParams(prev => ({ ...prev, tradeType: 'DIGITUNDER' }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    tradeParams.tradeType === 'DIGITUNDER'
                      ? 'bg-red-500/20 text-red-400 border border-red-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Under</span>
                </button>
              </div>
            </div>

            {/* Stake Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Stake Amount</label>
              <input
                type="number"
                value={tradeParams.amount}
                onChange={(e) => setTradeParams(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                placeholder="Enter stake amount"
                min="1"
                step="0.01"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {[5, 10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTradeParams(prev => ({ ...prev, amount }))}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 text-xs rounded transition-colors"
                  >
                    {accountInfo?.currency || '$'}{amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={tradeParams.duration}
                  onChange={(e) => setTradeParams(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  min={tradeParams.durationType === 't' ? 1 : 15}
                  max={tradeParams.durationType === 't' ? 10 : 3600}
                />
                <select 
                  value={tradeParams.durationType}
                  onChange={(e) => setTradeParams(prev => ({ 
                    ...prev, 
                    durationType: e.target.value as 't' | 's',
                    duration: e.target.value === 't' ? 5 : 60
                  }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="t">Ticks</option>
                  <option value="s">Seconds</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(tradeParams.durationType === 't' ? [1, 3, 5, 7, 10] : [15, 30, 60, 120, 300]).map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setTradeParams(prev => ({ ...prev, duration }))}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 text-xs rounded transition-colors"
                  >
                    {duration} {tradeParams.durationType === 't' ? 'tick' : 'sec'}{duration > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {tradeParams.durationType === 't' ? 'Range: 1-10 ticks (1 tick ≈ 2 seconds)' : 'Range: 15-3600 seconds'}
              </p>
            </div>

            {/* Potential Payout */}
            <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Potential Payout:</span>
                <span className="text-green-400 font-semibold">
                  {accountInfo?.currency || '$'}{calculatePayout().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Potential Profit:</span>
                <span className="text-green-400 font-semibold">
                  +{accountInfo?.currency || '$'}{(calculatePayout() - tradeParams.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Prediction:</span>
                <span className="text-blue-400 font-semibold">
                  {tradeParams.tradeType === 'DIGITOVER' ? `Over ${tradeParams.prediction}` : `Under/Equal ${tradeParams.prediction}`}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Win Probability:</span>
                <span className="text-yellow-400 font-semibold">~{getWinProbability().toFixed(0)}%</span>
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

            {/* Place Trade Button */}
            <button 
              onClick={placeTrade}
              disabled={!isConnected || !accountInfo || isPlacingTrade || !currentPrice || tradeParams.amount <= 0}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isPlacingTrade ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Placing Trade...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Place {tradeParams.tradeType === 'DIGITOVER' ? 'Over' : 'Under'} {tradeParams.prediction} Trade</span>
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-400 text-center">
              Use the Over/Under buttons above for instant trading, or this button to place with current form settings.
            </p>
          </div>
        </div>

        {/* Active Trades & History */}
        <div className="space-y-4">
          {/* Active Trades */}
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Active Trades ({activeTrades.length})</span>
            </h4>
            
            {activeTrades.length === 0 ? (
              <p className="text-gray-400 text-sm">No active trades</p>
            ) : (
              <div className="space-y-3">
                {activeTrades.map((trade) => (
                  <div key={trade.id} className="p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {trade.tradeType === 'DIGITOVER' ? (
                          <ArrowUp className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-white font-medium text-sm">
                          {trade.symbol} {trade.tradeType === 'DIGITOVER' ? 'Over' : 'Under'} {trade.prediction}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${getTradeStatusColor(trade.status)}`}>
                        {trade.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Stake:</span>
                        <span className="text-white ml-1">{accountInfo?.currency || '$'}{trade.amount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Threshold:</span>
                        <span className="text-white ml-1">{trade.prediction}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Current Digit:</span>
                        <span className="text-white ml-1">{currentDigit !== null ? currentDigit : '?'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">P&L:</span>
                        <span className={`ml-1 ${trade.profit && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit ? `${accountInfo?.currency || '$'}${trade.profit.toFixed(2)}` : 'TBD'}
                        </span>
                      </div>
                    </div>
                    
                    {trade.finalDigit !== undefined && (
                      <div className="mt-2 p-2 bg-gray-600 rounded text-xs">
                        <span className="text-gray-400">Final Digit: </span>
                        <span className={`font-bold ${
                          trade.tradeType === 'DIGITOVER' 
                            ? (trade.finalDigit > trade.prediction ? 'text-green-400' : 'text-red-400')
                            : (trade.finalDigit <= trade.prediction ? 'text-green-400' : 'text-red-400')
                        }`}>
                          {trade.finalDigit} {
                            trade.tradeType === 'DIGITOVER' 
                              ? (trade.finalDigit > trade.prediction ? '✓ OVER' : '✗ NOT OVER')
                              : (trade.finalDigit <= trade.prediction ? '✓ UNDER' : '✗ NOT UNDER')
                          }
                        </span>
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-400">
                      Started: {formatTime(trade.startTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trade History */}
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <h4 className="text-lg font-semibold text-white mb-3">Recent History</h4>
            
            {tradeHistory.length === 0 ? (
              <p className="text-gray-400 text-sm">No completed trades</p>
            ) : (
              <div className="space-y-2">
                {tradeHistory.slice(-5).map((trade) => (
                  <div key={trade.id} className="p-2 bg-gray-700/30 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {trade.tradeType === 'DIGITOVER' ? (
                          <ArrowUp className="w-3 h-3 text-blue-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-red-400" />
                        )}
                        <span className="text-white text-xs">{trade.symbol}</span>
                        <span className="text-gray-400 text-xs">({trade.tradeType === 'DIGITOVER' ? 'Over' : 'Under'} {trade.prediction})</span>
                      </div>
                      <span className={`text-xs font-medium ${getTradeStatusColor(trade.status)}`}>
                        {trade.status === 'won' ? 'WON' : 'LOST'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-400">{accountInfo?.currency || '$'}{trade.amount}</span>
                      <span className={trade.profit && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {trade.profit ? `${accountInfo?.currency || '$'}${trade.profit.toFixed(2)}` : '0.00'}
                      </span>
                    </div>
                    {trade.finalDigit !== undefined && (
                      <div className="text-xs text-gray-400 mt-1">
                        Final: {trade.finalDigit} (Threshold: {trade.prediction})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
              Over/Under trading involves substantial risk and may result in loss of capital. 
              Payouts vary based on your chosen threshold - lower thresholds offer higher payouts for "Over" but lower win probability.
              Choose your threshold carefully and only trade with money you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverUnderTrading;