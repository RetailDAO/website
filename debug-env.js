// Quick debugging script to check environment variables in production
console.log('=== ENVIRONMENT DEBUG ===');
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'undefined');
console.log('VITE_WS_BASE_URL:', import.meta.env.VITE_WS_BASE_URL || 'undefined');
console.log('VITE_ENVIRONMENT:', import.meta.env.VITE_ENVIRONMENT || 'undefined');
console.log('Current Origin:', window.location.origin);
console.log('========================');

// Test API endpoint
const testAPI = async () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  try {
    const response = await fetch(`${baseURL}/api/v1/health`);
    console.log('API Test Response:', response.status, response.statusText);
    const data = await response.json();
    console.log('API Test Data:', data);
  } catch (error) {
    console.error('API Test Failed:', error);
    console.log('Trying Railway direct...');
    try {
      const directResponse = await fetch('https://website-production-8f8a.up.railway.app/api/v1/health');
      console.log('Direct Railway Test:', directResponse.status, directResponse.statusText);
    } catch (directError) {
      console.error('Direct Railway Test Failed:', directError);
    }
  }
};

testAPI();