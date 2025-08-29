import { useState, useEffect } from 'react';

const SimpleDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('SimpleDashboard mounted');
    
    // Test basic data loading
    setTimeout(() => {
      setData({ message: 'Data loaded successfully!' });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        background: '#000', 
        color: '#fff', 
        minHeight: '100vh', 
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <h1>🔄 Loading Dashboard...</h1>
          <p>Please wait...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        background: '#000', 
        color: '#f00', 
        minHeight: '100vh', 
        padding: '20px' 
      }}>
        <h1>❌ Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#000', 
      color: '#fff', 
      minHeight: '100vh', 
      padding: '20px' 
    }}>
      <h1>🚀 Crypto Dashboard - Simple Version</h1>
      <p>{data?.message}</p>
      
      <div style={{ marginTop: '20px', display: 'grid', gap: '20px' }}>
        <div style={{ background: '#222', padding: '20px', borderRadius: '8px' }}>
          <h2>📈 BTC Price</h2>
          <p>$65,432.10</p>
        </div>
        
        <div style={{ background: '#222', padding: '20px', borderRadius: '8px' }}>
          <h2>📊 ETH Price</h2>
          <p>$2,345.67</p>
        </div>
        
        <div style={{ background: '#222', padding: '20px', borderRadius: '8px' }}>
          <h2>🔗 Connection Status</h2>
          <p>✅ Backend Connected</p>
          <p>✅ WebSocket Connected</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;