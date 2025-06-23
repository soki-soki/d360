import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Save, Eye, EyeOff, AlertCircle, CheckCircle, ExternalLink, RefreshCw, LogIn, LogOut } from 'lucide-react';
import derivAPI from '../services/derivAPI';

const Settings: React.FC = () => {
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthToken, setOauthToken] = useState('');
  const [isOAuthConnected, setIsOAuthConnected] = useState(false);

  useEffect(() => {
    console.log('🔧 Settings: Component mounted');
    
    // Load saved API token
    const savedToken = localStorage.getItem('deriv_api_token') || '';
    console.log('🔧 Settings: Loaded saved token:', savedToken ? 'Present' : 'None');
    setApiToken(savedToken);

    // Load OAuth token
    const savedOAuthToken = localStorage.getItem('deriv_oauth_token') || '';
    setOauthToken(savedOAuthToken);
    setIsOAuthConnected(!!savedOAuthToken);

    // Subscribe to connection status
    derivAPI.onConnectionChange((data) => {
      console.log('🔧 Settings: Connection status changed:', data.connected);
      setIsConnected(data.connected);
      setIsConnecting(false);
      setConnectionStatus(data.connected ? 'Connected to Deriv.com' : 'Disconnected');
    });

    // Check initial connection status
    const currentStatus = derivAPI.isConnected();
    setIsConnected(currentStatus);
    setConnectionStatus(currentStatus ? 'Connected to Deriv.com' : 'Disconnected');
  }, []);

  const handleSaveAndConnect = async () => {
    console.log('🔧 Settings: Saving settings and connecting...');
    setIsSaving(true);
    setIsConnecting(true);
    setSaveStatus('idle');
    setConnectionStatus('Connecting...');

    try {
      // Save API token to localStorage
      if (apiToken.trim()) {
        localStorage.setItem('deriv_api_token', apiToken.trim());
        console.log('🔧 Settings: API token saved');
      } else {
        localStorage.removeItem('deriv_api_token');
        console.log('🔧 Settings: API token removed (demo mode)');
      }

      // Update API service and connect
      derivAPI.setApiToken(apiToken.trim());
      
      // Disconnect first, then reconnect with new settings
      derivAPI.disconnect();
      
      // Wait a moment then connect
      setTimeout(async () => {
        try {
          await derivAPI.reconnectWithNewSettings();
          setSaveStatus('success');
          console.log('🔧 Settings: Connection attempt completed');
        } catch (error) {
          console.error('🔧 Settings: Connection failed:', error);
          setSaveStatus('error');
          setConnectionStatus('Connection failed');
          setIsConnecting(false);
        }
      }, 1000);

      setTimeout(() => setSaveStatus('idle'), 5000);
    } catch (error) {
      console.error('🔧 Settings: Error saving settings:', error);
      setSaveStatus('error');
      setConnectionStatus('Save failed');
      setIsConnecting(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSettings = () => {
    console.log('🔧 Settings: Clearing settings...');
    setApiToken('');
    localStorage.removeItem('deriv_api_token');
    derivAPI.setApiToken('');
    derivAPI.disconnect();
    setSaveStatus('idle');
    setConnectionStatus('Disconnected');
  };

  const handleTestConnection = async () => {
    console.log('🔧 Settings: Testing connection...');
    setIsConnecting(true);
    setConnectionStatus('Testing connection...');
    
    try {
      derivAPI.manualConnect();
    } catch (error) {
      console.error('🔧 Settings: Connection test failed:', error);
      setConnectionStatus('Connection test failed');
      setIsConnecting(false);
    }
  };

  const handleOAuthLogin = () => {
    const app_id = '81004'; // Your App ID for markup
    const redirect_uri = window.location.origin;
    const login_url = `https://oauth.deriv.com/oauth2/authorize?app_id=${app_id}&l=EN&redirect_uri=${redirect_uri}`;
    window.location.href = login_url;
  };

  const handleOAuthLogout = () => {
    localStorage.removeItem('deriv_oauth_token');
    setOauthToken('');
    setIsOAuthConnected(false);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const useOAuthToken = () => {
    if (oauthToken) {
      setApiToken(oauthToken);
      localStorage.setItem('deriv_api_token', oauthToken);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-green-400">Settings</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <SettingsIcon className="w-4 h-4 text-green-400" />
          <span>Configure your API connection</span>
        </div>
      </div>

      {/* OAuth Authentication */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
          <LogIn className="w-5 h-5 text-blue-400" />
          <span>Deriv OAuth Authentication</span>
        </h3>

        <div className="space-y-4">
          {/* OAuth Status */}
          <div className={`p-4 rounded-lg border-2 ${
            isOAuthConnected 
              ? 'bg-green-500/10 border-green-500 text-green-400' 
              : 'bg-gray-500/10 border-gray-500 text-gray-400'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isOAuthConnected ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="font-medium">
                  {isOAuthConnected ? 'OAuth Connected' : 'OAuth Not Connected'}
                </span>
              </div>
              {isOAuthConnected && (
                <button
                  onClick={handleOAuthLogout}
                  className="flex items-center space-x-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
            {isOAuthConnected ? (
              <p className="text-sm mt-2 opacity-90">
                ✅ Connected via Deriv OAuth - Your trades will generate markup revenue
              </p>
            ) : (
              <p className="text-sm mt-2 opacity-90">
                Connect via OAuth to enable markup revenue tracking
              </p>
            )}
          </div>

          {/* OAuth Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!isOAuthConnected ? (
              <button
                onClick={handleOAuthLogin}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Connect with Deriv OAuth</span>
              </button>
            ) : (
              <button
                onClick={useOAuthToken}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                <Key className="w-4 h-4" />
                <span>Use OAuth Token for Trading</span>
              </button>
            )}
          </div>

          {/* OAuth Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">About OAuth Authentication:</h4>
            <ul className="text-sm text-blue-300 space-y-1 list-disc list-inside">
              <li>Secure authentication directly with Deriv</li>
              <li>Enables markup revenue tracking for your trades</li>
              <li>No need to manually create API tokens</li>
              <li>Automatically handles permissions and scopes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
          <Key className="w-5 h-5 text-green-400" />
          <span>Manual API Token Configuration</span>
        </h3>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className={`p-4 rounded-lg border-2 ${
            isConnected 
              ? 'bg-green-500/10 border-green-500 text-green-400' 
              : 'bg-red-500/10 border-red-500 text-red-400'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isConnected ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="font-medium">{connectionStatus}</span>
                {isConnecting && (
                  <RefreshCw className="w-4 h-4 animate-spin ml-2" />
                )}
              </div>
              {!isConnecting && (
                <button
                  onClick={handleTestConnection}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                >
                  Test Connection
                </button>
              )}
            </div>
            {!isConnected && !isConnecting && (
              <p className="text-sm mt-2 opacity-90">
                Add your API token below and click "Save & Connect" to enable live trading data.
              </p>
            )}
            {isConnected && apiToken && (
              <p className="text-sm mt-2 opacity-90">
                ✅ Connected with your personal API token - Live data active
              </p>
            )}
            {isConnected && !apiToken && (
              <p className="text-sm mt-2 opacity-90">
                ℹ️ Connected in demo mode (no API token provided)
              </p>
            )}
          </div>

          {/* API Token Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              API Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter your Deriv API token"
                className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Your API token is stored locally and never sent to our servers. 
              Alternative to OAuth authentication above.
            </p>
          </div>

          {/* How to get API Token */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">How to get your API Token:</h4>
            <ol className="text-sm text-blue-300 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://app.deriv.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">app.deriv.com</a></li>
              <li>Log in to your Deriv account</li>
              <li>Go to Settings → API Token</li>
              <li>Create a new token with "Read" and "Trade" permissions</li>
              <li>Copy the token and paste it above</li>
            </ol>
            <p className="text-sm text-blue-300 mt-2">
              <strong>Note:</strong> Using OAuth authentication above is recommended as it's more secure and enables markup tracking.
            </p>
            <a
              href="https://app.deriv.com/account/api-token"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 mt-3 text-blue-400 hover:text-blue-300 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Deriv API Token Page</span>
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSaveAndConnect}
              disabled={isSaving || isConnecting}
              className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                isSaving || isConnecting
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving ? 'Saving...' : isConnecting ? 'Connecting...' : 'Save & Connect'}
              </span>
            </button>

            <button
              onClick={handleClearSettings}
              disabled={isSaving || isConnecting}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Clear Settings
            </button>
          </div>

          {/* Save Status */}
          {saveStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Settings saved and connection established!</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Failed to save settings or connect. Please check your API token.</span>
            </div>
          )}
        </div>
      </div>

      {/* Trading Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Trading Preferences</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Default Stake Amount
            </label>
            <input
              type="number"
              defaultValue="10"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Risk Level
            </label>
            <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none">
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Auto-stop Loss
            </label>
            <input
              type="number"
              defaultValue="100"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Take Profit Target
            </label>
            <input
              type="number"
              defaultValue="500"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Security Notice</p>
            <p className="text-yellow-300 text-sm mt-1">
              Your API token is stored locally in your browser and is never transmitted to our servers. 
              Only provide tokens with the minimum required permissions for your trading needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;