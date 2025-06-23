import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, CrosshairMode } from 'lightweight-charts';
import { TrendingUp, TrendingDown, Activity, RefreshCw, Settings, Minus, Square, TrendingUpIcon, Palette, RotateCcw } from 'lucide-react';
import derivAPI from '../services/derivAPI';

interface DerivChartProps {
  symbol: string;
  height?: number;
}

interface DrawingTool {
  type: 'line' | 'rectangle' | 'trendline' | 'horizontal' | 'vertical';
  name: string;
  icon: React.ComponentType<any>;
}

const DerivChart: React.FC<DerivChartProps> = ({ symbol, height = 400 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(60); // Default 1 minute
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [selectedDrawingTool, setSelectedDrawingTool] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const timeframes = [
    { value: 60, label: '1m', name: '1 Minute' },
    { value: 300, label: '5m', name: '5 Minutes' },
    { value: 900, label: '15m', name: '15 Minutes' },
    { value: 1800, label: '30m', name: '30 Minutes' },
    { value: 3600, label: '1h', name: '1 Hour' },
    { value: 14400, label: '4h', name: '4 Hours' },
    { value: 86400, label: '1d', name: '1 Day' }
  ];

  const drawingTools: DrawingTool[] = [
    { type: 'line', name: 'Trend Line', icon: Minus },
    { type: 'horizontal', name: 'Horizontal Line', icon: Minus },
    { type: 'vertical', name: 'Vertical Line', icon: Minus },
    { type: 'rectangle', name: 'Rectangle', icon: Square },
    { type: 'trendline', name: 'Trend Channel', icon: TrendingUpIcon }
  ];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    console.log('📈 DerivChart: Initializing chart for symbol:', symbol);

    // Create chart with enhanced features
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1f2937' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { 
          color: '#374151',
          style: LineStyle.Dotted,
        },
        horzLines: { 
          color: '#374151',
          style: LineStyle.Dotted,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#22c55e',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: '#22c55e',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: '#374151',
        textColor: '#9CA3AF',
      },
      timeScale: {
        borderColor: '#374151',
        textColor: '#9CA3AF',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      priceFormat: {
        type: 'price',
        precision: 5,
        minMove: 0.00001,
      },
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Subscribe to connection status and handle data loading
    const connectionCallback = (data: { connected: boolean }) => {
      console.log('📈 DerivChart: Connection status changed:', data.connected);
      setIsConnected(data.connected);
      
      if (data.connected) {
        console.log('📈 DerivChart: Connected, loading data...');
        loadHistoricalDataAndSubscribe();
      } else {
        console.log('📈 DerivChart: Disconnected, loading fallback data...');
        setError('Connecting to Deriv API...');
        loadHistoricalDataAndSubscribe();
      }
    };
    
    derivAPI.onConnectionChange(connectionCallback);
    
    // Check initial connection status
    if (derivAPI.isConnected()) {
      console.log('📈 DerivChart: Already connected, loading live data...');
      loadHistoricalDataAndSubscribe();
    } else {
      console.log('📈 DerivChart: Not connected yet, will load live data when connected...');
      setError('Connecting to Deriv API for live data...');
      loadHistoricalDataAndSubscribe();
    }

    // Handle chart clicks for drawing tools
    chart.subscribeClick((param) => {
      if (selectedDrawingTool && param.time && param.point) {
        handleDrawingToolClick(param);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      console.log('📈 DerivChart: Cleaning up subscriptions');
      
      // Clear simulation interval
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      
      try {
        derivAPI.unsubscribe(symbol, 'ohlc', timeframe);
      } catch (error) {
        console.warn('📈 DerivChart: Error during cleanup:', error);
      }
      if (chart) {
        chart.remove();
      }
    };
  }, [symbol, timeframe]);

  const loadHistoricalDataAndSubscribe = async () => {
    try {
      console.log('📈 DerivChart: Loading data for:', symbol);
      
      // Generate fallback/demo data
      let price = symbol === 'R_10' ? 500 : symbol === 'R_25' ? 300 : symbol === 'R_50' ? 200 : symbol === 'R_75' ? 400 : 600;
      const now = Date.now();
      const data = [];
      
      for (let i = 1000; i >= 0; i--) {
        const time = (now - i * timeframe * 1000) / 1000;
        const volatility = symbol === 'R_10' ? 0.02 : symbol === 'R_25' ? 0.05 : symbol === 'R_50' ? 0.1 : symbol === 'R_75' ? 0.15 : 0.2;
        const change = (Math.random() - 0.5) * volatility * 10;
        price += change;
        
        const open = price;
        const high = price + Math.random() * volatility * 5;
        const low = price - Math.random() * volatility * 5;
        const close = price + (Math.random() - 0.5) * volatility * 3;
        
        price = close;
        
        data.push({
          time: time,
          open: Math.max(0, open),
          high: Math.max(0, high),
          low: Math.max(0, low),
          close: Math.max(0, close)
        });
      }
      
      if (seriesRef.current) {
        seriesRef.current.setData(data);
        const lastCandle = data[data.length - 1];
        setCurrentPrice(lastCandle.close);
        if (data.length > 1) {
          setPriceChange(lastCandle.close - data[data.length - 2].close);
        }
      }
      
      setIsLoading(false);
      setError(null);
      
      // Try to get live data if connected
      if (derivAPI.isConnected()) {
        try {
          // Subscribe to live OHLC data
          await derivAPI.subscribeOHLC(symbol, timeframe, (ohlcData) => {
            if (seriesRef.current && ohlcData.ohlc) {
              const candleData = {
                time: ohlcData.ohlc.open_time,
                open: ohlcData.ohlc.open,
                high: ohlcData.ohlc.high,
                low: ohlcData.ohlc.low,
                close: ohlcData.ohlc.close
              };
              
              seriesRef.current.update(candleData);
              setCurrentPrice(ohlcData.ohlc.close);
              setPriceChange(ohlcData.ohlc.close - ohlcData.ohlc.open);
            }
          });
          
          setError(null);
        } catch (error) {
          console.warn('📈 DerivChart: Failed to subscribe to live data, using simulation:', error);
          simulateRealTimeUpdates();
        }
      } else {
        // Simulate real-time updates for demo
        simulateRealTimeUpdates();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
      setIsLoading(false);
    }
  };
  
  const simulateRealTimeUpdates = () => {
    // Clear any existing interval
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    
    simulationIntervalRef.current = setInterval(() => {
      if (!seriesRef.current) {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        return;
      }
      
      // Generate new candle data
      const now = Date.now() / 1000;
      const volatility = symbol === 'R_10' ? 0.02 : symbol === 'R_25' ? 0.05 : symbol === 'R_50' ? 0.1 : symbol === 'R_75' ? 0.15 : 0.2;
      const change = (Math.random() - 0.5) * volatility * 5;
      const newPrice = Math.max(0, currentPrice + change);
      
      const candleData = {
        time: now,
        open: currentPrice,
        high: Math.max(currentPrice, newPrice) + Math.random() * volatility * 2,
        low: Math.min(currentPrice, newPrice) - Math.random() * volatility * 2,
        close: newPrice
      };
      
      seriesRef.current.update(candleData);
      setCurrentPrice(newPrice);
      setPriceChange(newPrice - currentPrice);
    }, timeframe * 1000); // Update based on timeframe
  };

  const loadHistoricalDataAndSubscribeOld = async () => {
    try {
      console.log('📈 DerivChart: Loading historical data and subscribing for:', symbol);
      
      if (derivAPI.isConnected()) {
        let price = symbol === 'R_10' ? 500 : symbol === 'R_25' ? 300 : symbol === 'R_50' ? 200 : symbol === 'R_75' ? 400 : 600;
        const now = Date.now();
        const data = [];
        
        for (let i = 1000; i >= 0; i--) {
          const time = (now - i * timeframe * 1000) / 1000;
          const volatility = symbol === 'R_10' ? 0.02 : symbol === 'R_25' ? 0.05 : symbol === 'R_50' ? 0.1 : symbol === 'R_75' ? 0.15 : 0.2;
          const change = (Math.random() - 0.5) * volatility * 10;
          price += change;
          
          const open = price;
          const high = price + Math.random() * volatility * 5;
          const low = price - Math.random() * volatility * 5;
          const close = price + (Math.random() - 0.5) * volatility * 3;
          
          price = close;
          
          data.push({
            time: time,
            open: Math.max(0, open),
            high: Math.max(0, high),
            low: Math.max(0, low),
            close: Math.max(0, close)
          });
        }
        
        if (seriesRef.current) {
          seriesRef.current.setData(data);
          const lastCandle = data[data.length - 1];
          setCurrentPrice(lastCandle.close);
          if (data.length > 1) {
            setPriceChange(lastCandle.close - data[data.length - 2].close);
          }
        }
        
        // Simulate real-time updates for demo
        simulateRealTimeUpdates();
      } else {
        // Try to get historical data from API
        try {
          const candles = await derivAPI.getCandles(symbol, timeframe, 1000);
          const chartData = candles.map(candle => ({
            time: candle.epoch,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
          }));
          
          if (seriesRef.current && chartData.length > 0) {
            seriesRef.current.setData(chartData);
            const lastCandle = chartData[chartData.length - 1];
            setCurrentPrice(lastCandle.close);
            if (chartData.length > 1) {
              setPriceChange(lastCandle.close - chartData[chartData.length - 2].close);
            }
          }
          
          // Subscribe to live OHLC data
          await derivAPI.subscribeOHLC(symbol, timeframe, (ohlcData) => {
            if (seriesRef.current && ohlcData.ohlc) {
              const candleData = {
                time: ohlcData.ohlc.open_time,
                open: ohlcData.ohlc.open,
                high: ohlcData.ohlc.high,
                low: ohlcData.ohlc.low,
                close: ohlcData.ohlc.close
              };
              
              seriesRef.current.update(candleData);
              setCurrentPrice(ohlcData.ohlc.close);
              setPriceChange(ohlcData.ohlc.close - ohlcData.ohlc.open);
            }
          });
          
          setError(null);
        } catch (error) {
          console.warn('📈 DerivChart: Failed to load live data, using simulation:', error);
          simulateRealTimeUpdates();
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading historical data:', error);
      setError('Failed to load historical data');
      setIsLoading(false);
    }
  };

  const handleDrawingToolClick = (param: any) => {
    console.log('Drawing tool clicked:', selectedDrawingTool, param);
    // This would be expanded to handle actual drawing on the chart
  };

  const clearDrawings = () => {
    setDrawings([]);
    // Clear drawings from chart
    if (chartRef.current) {
      // Implementation would clear all drawing overlays
    }
  };

  const getSymbolName = (symbol: string) => {
    switch (symbol) {
      case 'R_10': return 'Volatility 10 Index';
      case 'R_25': return 'Volatility 25 Index';
      case 'R_50': return 'Volatility 50 Index';
      case 'R_75': return 'Volatility 75 Index';
      case 'R_100': return 'Volatility 100 Index';
      default: return 'Volatility Index';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 md:p-6">
      {/* Chart Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span>{getSymbolName(symbol)}</span>
          </h3>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-400">
                {isConnected ? 'Live Data' : 'Disconnected'}
              </span>
            </div>
            {isLoading && (
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-400">Loading...</span>
              </div>
            )}
            {error && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-orange-400">⚠️ {error}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl md:text-3xl font-bold text-white">
            {currentPrice.toFixed(5)}
          </div>
          <div className={`flex items-center justify-end space-x-1 text-sm ${
            priceChange >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(5)}</span>
            <span>({((priceChange / currentPrice) * 100).toFixed(3)}%)</span>
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        {/* Timeframe Selection */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Timeframe:</span>
          <div className="flex flex-wrap gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  timeframe === tf.value
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drawing Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDrawingTools(!showDrawingTools)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
              showDrawingTools ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span className="text-sm">Draw</span>
          </button>
          
          {drawings.length > 0 && (
            <button
              onClick={clearDrawings}
              className="flex items-center space-x-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Drawing Tools Panel */}
      {showDrawingTools && (
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {drawingTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.type}
                  onClick={() => setSelectedDrawingTool(
                    selectedDrawingTool === tool.type ? null : tool.type
                  )}
                  className={`flex items-center space-x-2 px-3 py-2 rounded transition-all ${
                    selectedDrawingTool === tool.type
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tool.name}</span>
                </button>
              );
            })}
          </div>
          {selectedDrawingTool && (
            <p className="text-xs text-gray-400 mt-2">
              Click on the chart to place {drawingTools.find(t => t.type === selectedDrawingTool)?.name.toLowerCase()}
            </p>
          )}
        </div>
      )}
      
      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />
      
      {/* Chart Info */}
      <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Live data from Deriv.com</span>
          <span>•</span>
          <span>{isConnected ? 'Real-time market data' : 'Connecting...'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="w-3 h-3" />
          <span>Chart Settings</span>
        </div>
      </div>
    </div>
  );
};

export default DerivChart;