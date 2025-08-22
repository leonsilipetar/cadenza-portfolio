import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApiConfig from '../../components/apiConfig';
import { toast } from 'react-toastify';

const DriveCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailedError, setDetailedError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const completeSetup = async () => {
      try {
        // Get the authorization code from URL params
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');
        
        if (error) {
          throw new Error(`Google OAuth Error: ${error}`);
        }
        
        if (!code) {
          throw new Error('No authorization code received from Google');
        }

        // Get stored data from localStorage
        const setupData = JSON.parse(localStorage.getItem('driveSetupData'));
        console.log('Retrieved setup data:', {
          hasSchoolId: !!setupData?.schoolId,
          hasCodeVerifier: !!setupData?.codeVerifier,
          timestamp: setupData?.timestamp
        });
        
        if (!setupData || !setupData.schoolId || !setupData.codeVerifier) {
          throw new Error('Missing setup data - please start the setup process again');
        }

        // Check if the setup data is too old (e.g., older than 5 minutes)
        const setupAge = Date.now() - setupData.timestamp;
        if (setupAge > 5 * 60 * 1000) { // 5 minutes
          throw new Error('Setup data has expired - please start the setup process again');
        }

        console.log('Sending complete request with:', {
          schoolId: setupData.schoolId,
          hasCode: !!code,
          hasCodeVerifier: !!setupData.codeVerifier
        });

        // Complete the setup
        const response = await ApiConfig.api.post(
          `/api/drive/${setupData.schoolId}/complete`,
          {
            code,
            codeVerifier: setupData.codeVerifier
          }
        );

        // Clear setup data from localStorage
        localStorage.removeItem('driveSetupData');

        // Show success message
        toast.success('Google Drive setup completed successfully!');

        // Redirect back to drive integration page
        navigate('/drive-integration', { 
          state: { 
            setupComplete: true,
            message: 'Google Drive setup completed successfully!'
          }
        });
      } catch (err) {
        console.error('Error completing Drive setup:', err);
        
        // Extract detailed error information
        const errorMessage = err.response?.data?.message || err.message;
        const detailedErrorInfo = err.response?.data?.error || err.response?.data;
        
        setError(errorMessage);
        setDetailedError(detailedErrorInfo);
        
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    completeSetup();
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Completing Google Drive setup...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3 className="error-title">Error completing setup</h3>
        <p className="error-message">{error}</p>
        {detailedError && (
          <div className="detailed-error">
            <p>Detailed error information:</p>
            <pre>{JSON.stringify(detailedError, null, 2)}</pre>
          </div>
        )}
        <p className="error-help">
          Please return to the Drive Integration page and try again.
          If the problem persists, make sure you're using the latest setup link.
        </p>
        <button 
          className="gumb"
          onClick={() => navigate('/drive-integration')}
        >
          Return to Drive Integration
        </button>
      </div>
    );
  }

  return null;
}

export default DriveCallback; 