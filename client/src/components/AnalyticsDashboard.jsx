import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import ApiConfig from './apiConfig';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await ApiConfig.api.get('/api/analytics');
        setAnalytics(response.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setError('Error fetching analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="loading-state">Loading analytics...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!analytics) return <div className="no-data">No analytics data available</div>;

  // Calculate percentages and format data
  const calculatePercentage = (count, total) => {
    return total > 0 ? ((count / total) * 100).toFixed(1) : 0;
  };

  const formatDeviceTypes = (deviceTypes) => {
    return deviceTypes?.map(item => ({
      device_type: item.device_type || 'Unknown',
      count: parseInt(item.count || item.get?.('count') || 0)
    }))
    .filter(item => item.device_type !== 'Unknown' || item.count > 0) // Filter out null/unknown with 0 count
    .sort((a, b) => b.count - a.count) || [];
  };

  const formatBrowsers = (browsers) => {
    return browsers?.map(item => ({
      browser: item.browser || 'Unknown',
      count: parseInt(item.count || item.get?.('count') || 0)
    }))
    .filter(item => item.browser !== 'Unknown' || item.count > 0) // Filter out null/unknown with 0 count
    .sort((a, b) => b.count - a.count) || [];
  };

  const formatDailyUsage = (dailyUsage) => {
    return dailyUsage?.map(item => ({
      date: new Date(item.date || item.get?.('date')).toLocaleDateString(),
      count: parseInt(item.count || item.get?.('count') || 0)
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
  };

  const formatErrorReports = (errorReports) => {
    return errorReports?.byCategory?.map(item => ({
      category: item.category || 'Unknown',
      count: parseInt(item.count || 0)
    })) || [];
  };

  // Get mobile vs desktop data
  const mobileData = analytics.mobileUsage?.find(u => u.is_mobile === true);
  const desktopData = analytics.mobileUsage?.find(u => u.is_mobile === false);
  const mobileCount = parseInt(mobileData?.count || mobileData?.get?.('count') || 0);
  const desktopCount = parseInt(desktopData?.count || desktopData?.get?.('count') || 0);
  const totalSessions = mobileCount + desktopCount;

  // Get PWA usage data
  const pwaData = analytics.pwaUsage?.find(u => u.is_pwa === true);
  const nonPwaData = analytics.pwaUsage?.find(u => u.is_pwa === false);
  const pwaCount = parseInt(pwaData?.count || pwaData?.get?.('count') || 0);
  const nonPwaCount = parseInt(nonPwaData?.count || nonPwaData?.get?.('count') || 0);
  const totalPwaSessions = pwaCount + nonPwaCount;

  return (
    <div className="analytics-dashboard">
      <h1>Analytics Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <Icon icon="solar:users-group-rounded-broken" />
          <h3>Total Sessions</h3>
          <p>{analytics.totalUsers || 0}</p>
        </div>

        <div className="stat-card">
          <Icon icon="solar:mobile-device-broken" />
          <h3>Mobile Users</h3>
          <p>{calculatePercentage(mobileCount, totalSessions)}%</p>
          <small>({mobileCount} sessions)</small>
        </div>

        <div className="stat-card">
          <Icon icon="solar:app-window-broken" />
          <h3>PWA Users</h3>
          <p>{calculatePercentage(pwaCount, totalPwaSessions)}%</p>
          <small>({pwaCount} sessions)</small>
        </div>

        <div className="stat-card">
          <Icon icon="solar:bug-minimalistic-broken" />
          <h3>Error Reports</h3>
          <p>{analytics.errorReports?.total || 0}</p>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card full-width">
          <h3>Daily Usage (Last 30 Days)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formatDailyUsage(analytics.dailyUsage)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="rgb(252, 163, 17)" 
                  fill="rgba(252, 163, 17, 0.1)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Device Types</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formatDeviceTypes(analytics.deviceTypes)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="device_type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="rgb(252, 163, 17)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Browsers</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formatBrowsers(analytics.browsers)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="browser" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="rgb(252, 163, 17)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Error Reports by Category</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formatErrorReports(analytics.errorReports)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ff6b6b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Mobile vs Desktop</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Mobile', value: mobileCount, color: '#4facfe' },
                    { name: 'Desktop', value: desktopCount, color: '#667eea' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { name: 'Mobile', value: mobileCount, color: '#4facfe' },
                    { name: 'Desktop', value: desktopCount, color: '#667eea' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>PWA vs Regular App</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'PWA', value: pwaCount, color: '#43e97b' },
                    { name: 'Regular', value: nonPwaCount, color: '#fa709a' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { name: 'PWA', value: pwaCount, color: '#43e97b' },
                    { name: 'Regular', value: nonPwaCount, color: '#fa709a' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="analytics-summary">
        <h3>Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <strong>Total Sessions Tracked:</strong> {analytics.totalUsers || 0}
          </div>
          <div className="summary-item">
            <strong>Mobile Usage:</strong> {mobileCount} sessions ({calculatePercentage(mobileCount, totalSessions)}%)
          </div>
          <div className="summary-item">
            <strong>PWA Usage:</strong> {pwaCount} sessions ({calculatePercentage(pwaCount, totalPwaSessions)}%)
          </div>
          <div className="summary-item">
            <strong>Error Reports:</strong> {analytics.errorReports?.total || 0}
          </div>
                     <div className="summary-item">
             <strong>Most Popular Browser:</strong> {
               formatBrowsers(analytics.browsers)[0]?.browser || 'N/A'
             }
           </div>
           <div className="summary-item">
             <strong>Most Common Device:</strong> {
               formatDeviceTypes(analytics.deviceTypes)[0]?.device_type || 'N/A'
             }
           </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;