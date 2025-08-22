import ApiConfig from '../components/apiConfig.js';

export const refreshToken = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found to refresh');
      return null;
    }

    const response = await ApiConfig.api.post(
      `/refresh-token`, // Corrected URL
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`, // Send current token for refresh
        }
      }
    );

    const newToken = response.data.token;
    ApiConfig.setAuthToken(newToken); // Update Axios and localStorage
    return newToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};