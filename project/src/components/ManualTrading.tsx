import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, Target, AlertCircle, Calculator, Zap, ArrowUp, ArrowDown, BarChart3, Activity, Hash } from 'lucide-react';
import RiseFallTrading from './RiseFallTrading';
import HigherLowerTrading from './HigherLowerTrading';
import TouchNoTouchTrading from './TouchNoTouchTrading';
import MatchesDiffersTrading from './MatchesDiffersTrading';
import EvenOddTrading from './EvenOddTrading';
import OverUnderTrading from './OverUnderTrading';
import DigitPredictionTrading from './DigitPredictionTrading';
import StaysInGoesOutTrading from './StaysInGoesOutTrading';
import AsianUpDownTrading from './AsianUpDownTrading';
import ResetCallPutTrading from './ResetCallPutTrading';
import AccumulatorsTrading from './AccumulatorsTrading';

const ManualTrading: React.FC = () => {
  const [activeTradeType, setActiveTradeType] = useState('rise_fall');

  // Deriv symbols
  const symbols = [
    { value: 'R_10', name: 'Volatility 10 Index', category: 'Volatility Indices' },
    { value: 'R_25', name: 'Volatility 25 Index', category: 'Volatility Indices' },
    { value: 'R_50', name: 'Volatility 50 Index', category: 'Volatility Indices' },
    { value: 'R_75', name: 'Volatility 75 Index', category: 'Volatility Indices' },
    { value: 'R_100', name: 'Volatility 100 Index', category: 'Volatility Indices' },
    { value: 'RDBEAR', name: 'Bear Market Index', category: 'Daily Reset Indices' },
    { value: 'RDBULL', name: 'Bull Market Index', category: 'Daily Reset Indices' },
    { value: 'frxEURUSD', name: 'EUR/USD', category: 'Forex' },
    { value: 'frxGBPUSD', name: 'GBP/USD', category: 'Forex' },
    { value: 'frxUSDJPY', name: 'USD/JPY', category: 'Forex' },
    { value: 'frxAUDUSD', name: 'AUD/USD', category: 'Forex' },
    { value: 'frxUSDCHF', name: 'USD/CHF', category: 'Forex' },
    { value: 'cryBTCUSD', name: 'Bitcoin', category: 'Cryptocurrencies' },
    { value: 'cryETHUSD', name: 'Ethereum', category: 'Cryptocurrencies' },
    { value: 'cryLTCUSD', name: 'Litecoin', category: 'Cryptocurrencies' },
  ];

  // Binary trade types offered by Deriv
  const tradeTypes = [
    {
      id: 'rise_fall',
      name: 'Rise/Fall',
      description: 'Predict if the market will rise or fall',
      icon: TrendingUp,
      options: [
        { value: 'CALL', label: 'Rise', color: 'bg-green-500', description: 'Market will be higher' },
        { value: 'PUT', label: 'Fall', color: 'bg-red-500', description: 'Market will be lower' }
      ],
      durations: ['t', 's', 'm', 'h', 'd'],
      minDuration: { t: 5, s: 15, m: 1, h: 1, d: 1 },
      maxDuration: { t: 10, s: 3600, m: 1440, h: 24, d: 365 }
    },
    {
      id: 'higher_lower',
      name: 'Higher/Lower',
      description: 'Predict if the exit spot will be higher or lower than the barrier',
      icon: BarChart3,
      options: [
        { value: 'CALL', label: 'Higher', color: 'bg-green-500', description: 'Exit spot higher than barrier' },
        { value: 'PUT', label: 'Lower', color: 'bg-red-500', description: 'Exit spot lower than barrier' }
      ],
      durations: ['s', 'm', 'h', 'd'],
      minDuration: { s: 15, m: 1, h: 1, d: 1 },
      maxDuration: { s: 3600, m: 1440, h: 24, d: 365 }
    },
    {
      id: 'touch_no_touch',
      name: 'Touch/No Touch',
      description: 'Predict if the market will touch or not touch a target',
      icon: Target,
      options: [
        { value: 'ONETOUCH', label: 'Touch', color: 'bg-blue-500', description: 'Market will touch the barrier' },
        { value: 'NOTOUCH', label: 'No Touch', color: 'bg-purple-500', description: 'Market will not touch the barrier' }
      ],
      durations: ['s', 'm', 'h', 'd'],
      minDuration: { s: 15, m: 1, h: 1, d: 1 },
      maxDuration: { s: 3600, m: 1440, h: 24, d: 365 }
    },
    {
      id: 'matches_differs',
      name: 'Matches/Differs',
      description: 'Predict if the last digit will match or differ from your prediction',
      icon: Calculator,
      options: [
        { value: 'DIGITMATCH', label: 'Matches', color: 'bg-green-500', description: 'Last digit matches prediction' },
        { value: 'DIGITDIFF', label: 'Differs', color: 'bg-red-500', description: 'Last digit differs from prediction' }
      ],
      durations: ['t'],
      minDuration: { t: 1 },
      maxDuration: { t: 10 },
      requiresPrediction: true,
      predictionType: 'digit'
    },
    {
      id: 'even_odd',
      name: 'Even/Odd',
      description: 'Predict if the last digit will be even or odd',
      icon: Calculator,
      options: [
        { value: 'DIGITEVEN', label: 'Even', color: 'bg-green-500', description: 'Last digit is even (0,2,4,6,8)' },
        { value: 'DIGITODD', label: 'Odd', color: 'bg-purple-500', description: 'Last digit is odd (1,3,5,7,9)' }
      ],
      durations: ['t'],
      minDuration: { t: 1 },
      maxDuration: { t: 10 }
    },
    {
      id: 'over_under',
      name: 'Over/Under',
      description: 'Predict if the last digit will be over or under 5',
      icon: ArrowUp,
      options: [
        { value: 'DIGITOVER', label: 'Over', color: 'bg-blue-500', description: 'Last digit over 5 (6,7,8,9)' },
        { value: 'DIGITUNDER', label: 'Under', color: 'bg-orange-500', description: 'Last digit under 5 (0,1,2,3,4)' }
      ],
      durations: ['t'],
      minDuration: { t: 1 },
      maxDuration: { t: 10 }
    },
    {
      id: 'digit_prediction',
      name: 'Digit Prediction',
      description: 'Predict the exact last digit (0-9)',
      icon: Hash,
      options: [
        { value: 'DIGITMATCH', label: 'Predict Digit', color: 'bg-green-500', description: 'Choose any digit 0-9' }
      ],
      durations: ['t'],
      minDuration: { t: 1 },
      maxDuration: { t: 10 },
      requiresPrediction: true,
      predictionType: 'digit'
    },
    {
      id: 'in_out',
      name: 'Stays In/Goes Out',
      description: 'Predict if the market stays between or goes outside two barriers',
      icon: BarChart3,
      options: [
        { value: 'EXPIRYMISS', label: 'Stays In', color: 'bg-green-500', description: 'Market stays between barriers' },
        { value: 'EXPIRYRANGE', label: 'Goes Out', color: 'bg-red-500', description: 'Market goes outside barriers' }
      ],
      durations: ['s', 'm', 'h', 'd'],
      minDuration: { s: 15, m: 1, h: 1, d: 1 },
      maxDuration: { s: 3600, m: 1440, h: 24, d: 365 }
    },
    {
      id: 'asian',
      name: 'Asian Up/Down',
      description: 'Predict if the average will be higher or lower than the spot',
      icon: Activity,
      options: [
        { value: 'ASIANU', label: 'Asian Up', color: 'bg-green-500', description: 'Average higher than spot' },
        { value: 'ASIAND', label: 'Asian Down', color: 'bg-red-500', description: 'Average lower than spot' }
      ],
      durations: ['s', 'm', 'h'],
      minDuration: { s: 15, m: 1, h: 1 },
      maxDuration: { s: 3600, m: 1440, h: 24 }
    },
    {
      id: 'accumulators',
      name: 'Accumulators',
      description: 'Accumulate profits while price stays within barriers',
      icon: TrendingUp,
      options: [
        { value: 'ACCU', label: 'Start Accumulator', color: 'bg-green-500', description: 'Grow stake per tick until knock out' }
      ],
      durations: ['continuous'],
      minDuration: { continuous: 1 },
      maxDuration: { continuous: 1 },
      requiresBarrier: true
    },
    {
      id: 'reset',
      name: 'Reset Call/Put',
      description: 'Get a new barrier if the market moves against you',
      icon: Zap,
      options: [
        { value: 'RESETCALL', label: 'Reset Call', color: 'bg-green-500', description: 'Call with reset barrier' },
        { value: 'RESETPUT', label: 'Reset Put', color: 'bg-red-500', description: 'Put with reset barrier' }
      ],
      durations: ['s', 'm', 'h'],
      minDuration: { s: 15, m: 1, h: 1 },
      maxDuration: { s: 3600, m: 1440, h: 24 }
    }
  ];

  const currentTradeType = tradeTypes.find(t => t.id === activeTradeType);

  const recentTrades = [
    { type: 'Rise/Fall', symbol: 'R_10', amount: '$25', result: 'Win', profit: '+$21.25', time: '2 min ago', status: 'success' },
    { type: 'Even/Odd', symbol: 'R_25', amount: '$50', result: 'Loss', profit: '-$50.00', time: '5 min ago', status: 'failed' },
    { type: 'Matches/Differs', symbol: 'R_50', amount: '$10', result: 'Win', profit: '+$90.00', time: '8 min ago', status: 'success' },
    { type: 'Over/Under', symbol: 'R_75', amount: '$30', result: 'Pending', profit: 'TBD', time: '12 min ago', status: 'pending' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-green-400">Manual Trading</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Clock className="w-4 h-4 text-green-400" />
          <span>Binary Options Trading</span>
        </div>
      </div>

      {/* Trade Type Selector */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Select Trade Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {tradeTypes.map((tradeType) => {
            const Icon = tradeType.icon;
            return (
              <button
                key={tradeType.id}
                onClick={() => setActiveTradeType(tradeType.id)}
                className={`p-3 rounded-lg transition-all text-center ${
                  activeTradeType === tradeType.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">{tradeType.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Trade Type Component */}
      {activeTradeType === 'rise_fall' && <RiseFallTrading />}
      {activeTradeType === 'higher_lower' && <HigherLowerTrading />}
      {activeTradeType === 'touch_no_touch' && <TouchNoTouchTrading />}
      {activeTradeType === 'matches_differs' && <MatchesDiffersTrading />}
      {activeTradeType === 'even_odd' && <EvenOddTrading />}
      {activeTradeType === 'over_under' && <OverUnderTrading />}
      {activeTradeType === 'digit_prediction' && <DigitPredictionTrading />}
      {activeTradeType === 'in_out' && <StaysInGoesOutTrading />}
      {activeTradeType === 'asian' && <AsianUpDownTrading />}
      {activeTradeType === 'reset' && <ResetCallPutTrading />}
      {activeTradeType === 'accumulators' && <AccumulatorsTrading />}

      {/* Risk Disclaimer */}
      <div className="bg-gray-800 border border-orange-500 p-4 rounded-xl bg-orange-500/10">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 font-medium text-sm md:text-base">Trading Disclaimer</p>
            <p className="text-gray-300 text-xs md:text-sm mt-1">
              Binary options trading involves substantial risk and may result in loss of capital. 
              Past performance does not guarantee future results. Only trade with money you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualTrading;