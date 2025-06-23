interface DerivTick {
  tick: {
    ask: number;
    bid: number;
    epoch: number;
    id: string;
    pip_size: number;
    quote: number;
    symbol: string;
  };
}

interface DerivCandle {
  candles: Array<{
    close: number;
    epoch: number;
    high: number;
    low: number;
    open: number;
  }>;
}

interface DerivOHLC {
  ohlc: {
    close: number;
    epoch: number;
    granularity: number;
    high: number;
    id: string;
    low: number;
    open: number;
    open_time: number;
    symbol: string;
  };
}

interface DerivBalance {
  balance: {
    balance: number;
    currency: string;
    id: string;
    loginid: string;
  };
}

interface DerivPortfolio {
  portfolio: {
    contracts: Array<{
      app_id: number;
      buy_price: number;
      contract_id: number;
      contract_type: string;
      currency: string;
      date_start: number;
      expiry_time: number;
      longcode: string;
      payout: number;
      purchase_time: number;
      shortcode: string;
      symbol: string;
      transaction_id: number;
    }>;
  };
}

interface DerivProposalOpenContract {
  proposal_open_contract: {
    account_id: number;
    barrier?: string;
    bid_price: number;
    buy_price: number;
    contract_id: number;
    contract_type: string;
    currency: string;
    current_spot: number;
    current_spot_display_value: string;
    current_spot_time: number;
    date_expiry: number;
    date_settlement: number;
    date_start: number;
    display_name: string;
    entry_spot: number;
    entry_spot_display_value: string;
    entry_tick: number;
    entry_tick_display_value: string;
    entry_tick_time: number;
    expiry_time: number;
    id: number;
    is_expired: number;
    is_forward_starting: number;
    is_intraday: number;
    is_path_dependent: number;
    is_settleable: number;
    is_sold: number;
    is_valid_to_cancel: number;
    is_valid_to_sell: number;
    longcode: string;
    payout: number;
    profit: number;
    profit_percentage: number;
    purchase_time: number;
    shortcode: string;
    status: string;
    symbol: string;
    transaction_id: number;
    underlying: string;
    validation_error?: string;
    exit_tick_display_value?: string;
  };
}

class DerivAPI {
  private ws: WebSocket | null = null;
  private apiToken: string = '';
  private appId: string = '1089';
  private subscribers: Map<string, (data: any) => void> = new Map();
  private activeSubscriptions: Map<string, string> = new Map();
  private pendingRequests: Map<string, { callback: (data: any) => void; timeout: NodeJS.Timeout }> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private isConnecting = false;
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private requestCounter = 0;
  private accountInfo: any = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private portfolioData: any[] = [];
  private openContracts: Map<number, any> = new Map();
  private messageHandlers: ((data: any) => void)[] = [];

  constructor() {
    // Load saved settings
    this.apiToken = localStorage.getItem('deriv_api_token') || '';
    this.appId = localStorage.getItem('deriv_app_id') || '1089';
    
    // Always try to connect for market data (works without API token)
    console.log('🔧 DerivAPI: Initializing connection for market data');
    this.connect();
  }

  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('🔧 DerivAPI: Already connecting, skipping...');
      return;
    }

    this.isConnecting = true;
    console.log('🔗 DerivAPI: Connecting to Deriv WebSocket...');
    
    // Clear any existing connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    // Set connection timeout
    this.connectionTimeout = setTimeout(() => {
      console.error('⏰ DerivAPI: Connection timeout after 15 seconds');
      this.handleConnectionFailure('Connection timeout');
    }, 15000);
    
    try {
      // Use Deriv's WebSocket API endpoint
      const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
      console.log('🔗 DerivAPI: Connecting to:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ DerivAPI: WebSocket connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Clear connection timeout
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        // Authorize if we have an API token
        if (this.apiToken) {
          this.authorize();
        } else {
          console.log('ℹ️ DerivAPI: No API token - market data only mode');
          this.notifyConnectionChange(true);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ DerivAPI: Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 DerivAPI: WebSocket connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        // Clear connection timeout immediately
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        this.handleConnectionClose();
      };

      this.ws.onerror = (error) => {
        console.error('❌ DerivAPI: WebSocket error occurred:', error);
        
        // Clear connection timeout immediately
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        this.handleConnectionFailure('WebSocket error');
      };

    } catch (error) {
      console.error('❌ DerivAPI: Failed to create WebSocket connection:', error);
      this.handleConnectionFailure('Failed to create WebSocket');
    }
  }

  private handleConnectionClose() {
    this.isConnecting = false;
    this.ws = null;
    
    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Clear active subscriptions on disconnect
    this.activeSubscriptions.clear();
    
    // Notify connection callbacks
    this.notifyConnectionChange(false);

    // Clear pending requests
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();

    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.error('❌ DerivAPI: Max reconnection attempts reached');
    }
  }

  private handleConnectionFailure(reason: string) {
    console.error('❌ DerivAPI: Connection failed:', reason);
    this.isConnecting = false;
    
    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Notify connection callbacks about the error
    this.notifyConnectionChange(false);
    
    // Schedule reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    console.log(`🔄 DerivAPI: Scheduling reconnect in ${delay}ms... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (!this.isConnected() && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('❌ DerivAPI: Error in connection callback:', error);
      }
    });
  }

  private authorize() {
    if (!this.apiToken) {
      console.log('ℹ️ DerivAPI: No API token provided');
      return;
    }

    console.log('🔐 DerivAPI: Authorizing with API token...');
    this.send({
      authorize: this.apiToken
    });
  }

  // Set API token
  setApiToken(token: string) {
    this.apiToken = token;
    if (token) {
      localStorage.setItem('deriv_api_token', token);
    } else {
      localStorage.removeItem('deriv_api_token');
    }
  }

  // Set App ID
  setAppId(appId: string) {
    this.appId = appId || '1089';
    localStorage.setItem('deriv_app_id', this.appId);
  }

  // Reconnect with new settings
  async reconnectWithNewSettings(): Promise<void> {
    console.log('🔄 DerivAPI: Reconnecting with new settings...');
    
    // Clear account info
    this.accountInfo = null;
    this.portfolioData = [];
    this.openContracts.clear();
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
    
    // Disconnect if connected
    if (this.ws) {
      this.disconnect();
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.connect();
  }

  // Manual connect method
  manualConnect(): void {
    console.log('🔧 DerivAPI: Manual connection initiated');
    if (!this.isConnecting && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      this.reconnectAttempts = 0;
      this.connect();
    }
  }

  private generateRequestId(): string {
    this.requestCounter++;
    return `${Date.now()}_${this.requestCounter}`;
  }

  private handleMessage(data: any) {
    // Call all registered message handlers first
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('❌ DerivAPI: Error in message handler:', error);
      }
    });

    // Handle responses with req_id first (for pending requests)
    if (data.echo_req && data.echo_req.req_id) {
      const reqId = data.echo_req.req_id.toString();
      const pendingRequest = this.pendingRequests.get(reqId);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.pendingRequests.delete(reqId);
        pendingRequest.callback(data);
        return;
      }
    }

    // Handle proposal responses (including errors)
    if (data.proposal || (data.error && data.echo_req && data.echo_req.proposal)) {
      // Let message handlers process this
      return;
    }

    // Handle authorization response
    if (data.authorize) {
      console.log('✅ DerivAPI: Successfully authorized');
      this.accountInfo = data.authorize;
      console.log('👤 DerivAPI: Account info:', {
        loginid: data.authorize.loginid,
        currency: data.authorize.currency,
        balance: data.authorize.balance
      });
      
      // Subscribe to balance and portfolio updates
      this.subscribeBalance();
      this.subscribePortfolio();
      this.notifyConnectionChange(true);
      return;
    }

    // Handle balance response
    if (data.balance) {
      console.log('💰 DerivAPI: Balance update:', data.balance);
      if (this.accountInfo) {
        this.accountInfo.balance = data.balance.balance;
      }
      
      // Notify balance subscribers
      this.subscribers.forEach((callback, key) => {
        if (key === 'balance') {
          callback(data);
        }
      });
    }

    // Handle portfolio response
    if (data.portfolio) {
      console.log('📊 DerivAPI: Portfolio update:', data.portfolio);
      this.portfolioData = data.portfolio.contracts || [];
      
      // Subscribe to open contracts for real-time updates
      this.portfolioData.forEach(contract => {
        if (contract.contract_id && !this.openContracts.has(contract.contract_id)) {
          this.subscribeToContract(contract.contract_id);
        }
      });
      
      // Notify portfolio subscribers
      this.subscribers.forEach((callback, key) => {
        if (key === 'portfolio') {
          callback(data);
        }
      });
    }

    // Handle proposal open contract (real-time contract updates)
    if (data.proposal_open_contract) {
      console.log('📈 DerivAPI: Contract update:', data.proposal_open_contract);
      const contract = data.proposal_open_contract;
      this.openContracts.set(contract.contract_id, contract);
      
      // Store subscription ID if this is a subscription response
      if (data.subscription && data.subscription.id) {
        const key = `contract_${contract.contract_id}`;
        this.activeSubscriptions.set(key, data.subscription.id);
      }
      
      // Notify contract subscribers
      this.subscribers.forEach((callback, key) => {
        if (key.startsWith('contract_') && key.includes(contract.contract_id.toString())) {
          callback(data);
        }
      });
      return;
    }

    // Handle error messages
    if (data.error) {
      console.error('❌ DerivAPI: API Error:', data.error);
      
      // Don't throw error for subscription conflicts - just log them
      if (data.error.message && data.error.message.includes('already subscribed')) {
        console.warn('⚠️ DerivAPI: Subscription conflict (ignored):', data.error.message);
        return;
      }
      
      // Don't return early for errors - let message handlers process them
      return;
    }

    // Store subscription IDs for proper cleanup
    if (data.subscription && data.subscription.id) {
      const subscriptionId = data.subscription.id;
      
      if (data.msg_type === 'tick' && data.tick) {
        const key = `tick_${data.tick.symbol}`;
        this.activeSubscriptions.set(key, subscriptionId);
        console.log('📝 DerivAPI: Stored tick subscription ID:', subscriptionId);
      } else if (data.msg_type === 'ohlc' && data.ohlc) {
        const key = `ohlc_${data.ohlc.symbol}_${data.ohlc.granularity}`;
        this.activeSubscriptions.set(key, subscriptionId);
        console.log('📝 DerivAPI: Stored OHLC subscription ID:', subscriptionId);
      }
    }

    // Handle subscription messages
    if (data.msg_type === 'tick' && data.tick) {
      console.log('📊 DerivAPI: Tick data received for', data.tick.symbol, ':', data.tick.quote);
      this.subscribers.forEach((callback, key) => {
        if (key.startsWith('tick_') && key.includes(data.tick.symbol)) {
          callback(data);
        }
      });
    }

    if (data.msg_type === 'ohlc' && data.ohlc) {
      console.log('📈 DerivAPI: OHLC data received for', data.ohlc.symbol);
      
      // Convert string values to numbers for chart compatibility
      const processedOhlc = {
        ...data.ohlc,
        open: parseFloat(data.ohlc.open),
        high: parseFloat(data.ohlc.high),
        low: parseFloat(data.ohlc.low),
        close: parseFloat(data.ohlc.close)
      };
      
      const processedData = {
        ...data,
        ohlc: processedOhlc
      };
      
      this.subscribers.forEach((callback, key) => {
        if (key.startsWith('ohlc_') && key.includes(data.ohlc.symbol)) {
          callback(processedData);
        }
      });
    }

    // Handle history response
    if (data.history) {
      console.log('📚 DerivAPI: History data received:', data.history.candles?.length || 0, 'candles');
      
      // Convert string values to numbers for chart compatibility
      if (data.history.candles) {
        data.history.candles = data.history.candles.map((candle: any) => ({
          ...candle,
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close)
        }));
      }
    }
  }

  // Add message handler for custom processing
  addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.push(handler);
  }

  // Remove message handler
  removeMessageHandler(handler: (data: any) => void) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  // Send message directly (for custom requests)
  send(message: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        console.log('📤 DerivAPI: Sending message:', message);
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('❌ DerivAPI: Error sending message:', error);
        return false;
      }
    } else {
      console.warn('⚠️ DerivAPI: WebSocket not connected. Message not sent:', message);
      return false;
    }
  }

  private sendInternal(message: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        console.log('📤 DerivAPI: Sending internal message:', message);
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('❌ DerivAPI: Error sending message:', error);
        return false;
      }
    } else {
      console.warn('⚠️ DerivAPI: WebSocket not connected. Message not sent:', message);
      return false;
    }
  }

  // Subscribe to live ticks
  async subscribeTicks(symbol: string, callback: (data: DerivTick) => void): Promise<void> {
    console.log('🎯 DerivAPI: Subscribing to ticks for:', symbol);
    const key = `tick_${symbol}`;
    
    // Check if already subscribed
    if (this.activeSubscriptions.has(key)) {
      console.log('ℹ️ DerivAPI: Already subscribed to ticks for:', symbol);
      // Update callback
      this.subscribers.set(key, callback);
      return;
    }
    
    // Store callback
    this.subscribers.set(key, callback);
    
    // Send subscription request
    const success = this.send({
      ticks: symbol,
      subscribe: 1
    });

    if (!success) {
      throw new Error('Failed to send subscription request');
    }
  }

  // Subscribe to OHLC data for real-time candles
  async subscribeOHLC(symbol: string, granularity: number, callback: (data: DerivOHLC) => void): Promise<void> {
    console.log('📊 DerivAPI: Subscribing to OHLC for:', symbol, 'granularity:', granularity);
    const key = `ohlc_${symbol}_${granularity}`;
    
    // Check if already subscribed
    if (this.activeSubscriptions.has(key)) {
      console.log('ℹ️ DerivAPI: Already subscribed to OHLC for:', symbol, 'granularity:', granularity);
      // Update callback
      this.subscribers.set(key, callback);
      return;
    }
    
    // Store callback
    this.subscribers.set(key, callback);
    
    // Send subscription request
    const success = this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count: 1,
      end: 'latest',
      granularity: granularity,
      style: 'candles',
      subscribe: 1
    });

    if (!success) {
      throw new Error('Failed to send OHLC subscription request');
    }
  }

  // Get historical candles
  getCandles(symbol: string, granularity: number, count: number = 1000): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const requestId = this.generateRequestId();
      console.log('📚 DerivAPI: Requesting historical candles for:', symbol, 'count:', count, 'granularity:', granularity);
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        console.error('⏰ DerivAPI: Request timeout for candles:', symbol);
        reject(new Error('Request timeout'));
      }, 45000);

      this.pendingRequests.set(requestId, {
        callback: (data: any) => {
          if (data.error) {
            console.error('❌ DerivAPI: API Error in candles response:', data.error);
            reject(new Error(data.error.message || 'API Error'));
            return;
          }
          
          if (data.history && data.history.candles) {
            const processedCandles = data.history.candles.map((candle: any) => ({
              ...candle,
              open: parseFloat(candle.open),
              high: parseFloat(candle.high),
              low: parseFloat(candle.low),
              close: parseFloat(candle.close)
            }));
            resolve(processedCandles);
          } else {
            console.error('❌ DerivAPI: Invalid candles response format:', data);
            reject(new Error('Invalid response format'));
          }
        },
        timeout
      });

      const success = this.sendInternal({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: count,
        end: 'latest',
        granularity: granularity,
        style: 'candles',
        req_id: requestId
      });

      if (!success) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(new Error('WebSocket not connected'));
      }
    });
  }

  // Subscribe to balance updates
  subscribeBalance(): void {
    if (this.isConnected() && this.apiToken) {
      console.log('💰 DerivAPI: Subscribing to balance updates');
      this.sendInternal({
        balance: 1,
        subscribe: 1
      });
    }
  }

  // Subscribe to portfolio updates
  subscribePortfolio(): void {
    if (this.isConnected() && this.apiToken) {
      console.log('📊 DerivAPI: Subscribing to portfolio updates');
      this.sendInternal({
        portfolio: 1,
        subscribe: 1
      });
    }
  }

  // Subscribe to specific contract updates
  subscribeToContract(contractId: number): void {
    if (this.isConnected() && this.apiToken) {
      console.log('📈 DerivAPI: Subscribing to contract updates for:', contractId);
      const key = `contract_${contractId}`;
      
      // Check if already subscribed
      if (this.activeSubscriptions.has(key)) {
        console.log('ℹ️ DerivAPI: Already subscribed to contract:', contractId);
        return;
      }
      
      this.sendInternal({
        proposal_open_contract: 1,
        contract_id: contractId,
        subscribe: 1
      });
      
      // Mark as subscribed (will be updated with actual subscription ID when response comes)
      this.activeSubscriptions.set(key, 'pending');
    }
  }

  // Get portfolio data
  getPortfolio(): any[] {
    return this.portfolioData;
  }

  // Get open contracts
  getOpenContracts(): Map<number, any> {
    return this.openContracts;
  }

  // Calculate total profit/loss from portfolio
  getTotalProfitLoss(): { profit: number; totalStake: number; winRate: number; activeContracts: number } {
    let totalProfit = 0;
    let totalStake = 0;
    let winningTrades = 0;
    let totalTrades = 0;
    let activeContracts = 0;

    // Calculate from portfolio data
    this.portfolioData.forEach(contract => {
      totalStake += contract.buy_price || 0;
      totalTrades++;
      
      if (contract.is_sold === 0) {
        activeContracts++;
      }
    });

    // Calculate from open contracts (real-time data)
    this.openContracts.forEach(contract => {
      if (contract.profit !== undefined) {
        totalProfit += contract.profit;
        if (contract.profit > 0) {
          winningTrades++;
        }
      }
    });

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      profit: totalProfit,
      totalStake,
      winRate,
      activeContracts
    };
  }

  // Subscribe to connection status
  onConnectionChange(callback: (data: { connected: boolean }) => void) {
    this.connectionCallbacks.push((connected) => callback({ connected }));
    // Immediately call with current status
    callback({ connected: this.isConnected() });
  }

  // Subscribe to balance changes
  onBalanceChange(callback: (data: DerivBalance) => void) {
    this.subscribers.set('balance', callback);
  }

  // Subscribe to portfolio changes
  onPortfolioChange(callback: (data: DerivPortfolio) => void) {
    this.subscribers.set('portfolio', callback);
  }

  // Unsubscribe from symbol
  async unsubscribe(symbol: string, type: 'tick' | 'ohlc' = 'tick', granularity?: number) {
    console.log('🚫 DerivAPI: Unsubscribing from:', symbol, type, granularity);
    
    let key: string;
    if (type === 'tick') {
      key = `tick_${symbol}`;
    } else {
      key = `ohlc_${symbol}_${granularity}`;
    }
    
    // Remove subscriber
    this.subscribers.delete(key);
    
    // Get subscription ID and forget it
    const subscriptionId = this.activeSubscriptions.get(key);
    if (subscriptionId && this.isConnected()) {
      this.sendInternal({
        forget: subscriptionId
      });
      this.activeSubscriptions.delete(key);
    }
  }

  // Get account information
  getAccountInfo(): any {
    return this.accountInfo;
  }

  // Get account balance
  getBalance(): number | null {
    return this.accountInfo?.balance || null;
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Disconnect
  disconnect() {
    console.log('🔌 DerivAPI: Disconnecting...');
    
    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.subscribers.clear();
    this.activeSubscriptions.clear();
    this.accountInfo = null;
    this.portfolioData = [];
    this.openContracts.clear();
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
  }
}

// Create singleton instance
export const derivAPI = new DerivAPI();
export default derivAPI;