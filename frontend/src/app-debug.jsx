import React from 'react';

function AppDebug() {
  console.log('AppDebug component rendering...');
  
  return (
    <div style={{ 
      background: '#111', 
      color: '#fff', 
      minHeight: '100vh', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif' 
    }}>
      <h1>🚀 Debug App Loading!</h1>
      <p>If you can see this, React is working!</p>
      <div>
        <p>Time: {new Date().toLocaleString()}</p>
      </div>
      <div style={{ marginTop: '20px' }}>
        <p>Next step: Loading full dashboard...</p>
        <button 
          onClick={() => alert('React event handlers work!')}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}

export default AppDebug;