import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BotLibrary from './components/BotLibrary';
import AutomatedTrading from './components/AutomatedTrading';
import ManualTrading from './components/ManualTrading';
import Settings from './components/Settings';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Debug logging for activeTab changes
  useEffect(() => {
    console.log('🎯 App: activeTab changed to:', activeTab);
  }, [activeTab]);

  // Simple navigation handler
  const handleNavigation = (tabName: string) => {
    console.log('🎯 App: Navigation requested to:', tabName);
    setActiveTab(tabName);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const renderContent = () => {
    console.log('🎯 App: Rendering content for activeTab:', activeTab);
    
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'bot-library':
        return <BotLibrary />;
      case 'automated':
        return <AutomatedTrading />;
      case 'manual':
        console.log('🎯 App: Loading ManualTrading component');
        return <ManualTrading />;
      case 'settings':
        console.log('🔧 App: Loading Settings component');
        return <Settings />;
      default:
        console.log('🔧 App: Unknown tab, loading Dashboard. ActiveTab was:', activeTab);
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="flex flex-col h-screen overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            activeTab={activeTab} 
            onNavigate={handleNavigation}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-950">
            {renderContent()}
          </main>
        </div>
      </div>
      
      {/* Floating particles effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400/30 rounded-full animate-pulse-slow"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-green-400/40 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-green-400/20 rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-blue-400/20 rounded-full animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse-slow" style={{ animationDelay: '2.5s' }}></div>
      </div>
    </div>
  );
}

export default App;