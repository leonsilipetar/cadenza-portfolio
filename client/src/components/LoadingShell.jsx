import React from 'react';

const LoadingShell = ({ message = "Učitavanje...", progress = null }) => {
    return (
        <div className="loading-shell">
            <div className="loading-spinner"></div>
            <p className="loading-message">{message}</p>
            {progress !== null && (
                <div className="loading-progress">
                    <div 
                        className="loading-progress-bar" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};

export default LoadingShell; 