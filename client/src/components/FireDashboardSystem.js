import React, { useEffect, useState } from 'react';
import { MainDashboard } from './MainDashboard';
import { EnhancedYearlyAnalysisDashboard } from './YearlyAnalysisDashboard';
import { FireCauseAnalysisDashboard } from './FireCauseAnalysisDashboard';
import { TemperatureFireCorrelation } from './TemperatureFireCorrelation';
import TableauDashboard from './TableauDashboard';
import './FireDashboard.css';
import './TableauDashboard.css';

const FireDashboardSystem = ({ containerId }) => {
  const [container, setContainer] = useState(null);
  const [activeTab, setActiveTab] = useState('main');
  const [yearlyData, setYearlyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyDataByYear, setMonthlyDataByYear] = useState({});
  const [causesData, setCausesData] = useState({});
  const [topCauses, setTopCauses] = useState([]);
  const [causeDefinitions, setCauseDefinitions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalFires: 0,
    totalAcres: 0,
    yearlyAcres: 0,
    peakMonth: '',
    worstYear: '',
    worstYearAcres: 0,
    recentYear: '',
    recentYearFires: 0,
    recentYearAcres: 0,
    avgAnnualFires: 0,
    avgAnnualAcres: 0
  });

  // Updated path to use public directory instead of backend server
  const dataBaseUrl = '/data';

  // Client-side implementation of mergeStatistics
  const mergeStatistics = (statsData, newStatsData) => {
    // Merge yearly data
    const combinedYearlyData = [...statsData.yearlyData];
    
    // Add any new years from the new data
    newStatsData.yearlyData.forEach(newYearData => {
      const existingYearIndex = combinedYearlyData.findIndex(year => year.year === newYearData.year);
      if (existingYearIndex === -1) {
        // Year doesn't exist in original data, add it
        combinedYearlyData.push(newYearData);
      } else {
        // Year exists, update with combined statistics
        combinedYearlyData[existingYearIndex].fires += newYearData.fires;
        combinedYearlyData[existingYearIndex].acres += newYearData.acres;
      }
    });
    
    // Sort by year
    combinedYearlyData.sort((a, b) => parseInt(a.year) - parseInt(b.year));
    
    // Merge years array
    const combinedYears = Array.from(
      new Set([...statsData.years, ...newStatsData.years])
    ).sort();
    
    // Merge monthly data by year
    const combinedMonthlyData = { ...statsData.monthlyDataByYear };
    
    if (newStatsData.monthlyDataByYear) {
      Object.entries(newStatsData.monthlyDataByYear).forEach(([year, monthlyData]) => {
        if (!combinedMonthlyData[year]) {
          // Year doesn't exist in original data, add all months
          combinedMonthlyData[year] = monthlyData;
        } else {
          // Year exists, combine monthly data
          monthlyData.forEach((newMonthData, index) => {
            combinedMonthlyData[year][index].fires += newMonthData.fires;
            combinedMonthlyData[year][index].acres += newMonthData.acres;
          });
        }
      });
    }
    
    // Merge causes data by year
    const combinedCausesData = { ...(statsData.causesDataByYear || {}) };
    
    if (newStatsData.causesDataByYear) {
      Object.entries(newStatsData.causesDataByYear).forEach(([year, causesData]) => {
        if (!combinedCausesData[year]) {
          // Year doesn't exist in original data, add all causes data
          combinedCausesData[year] = causesData;
        } else {
          // Year exists, combine causes data
          // Merge causes array
          const existingCauses = combinedCausesData[year].causes || [];
          const newCauses = causesData.causes || [];
          
          // Create a map of existing causes for easy access
          const causesMap = new Map();
          existingCauses.forEach(cause => {
            causesMap.set(cause.causeId, cause);
          });
          
          // Add or update causes
          newCauses.forEach(newCause => {
            if (causesMap.has(newCause.causeId)) {
              // Update existing cause
              const existingCause = causesMap.get(newCause.causeId);
              existingCause.fires += newCause.fires;
              existingCause.acres += newCause.acres;
            } else {
              // Add new cause
              existingCauses.push(newCause);
            }
          });
          
          // Sort by fires in descending order
          existingCauses.sort((a, b) => b.fires - a.fires);
          
          // Update the causes array
          combinedCausesData[year].causes = existingCauses;
          
          // Merge monthly breakdown if available
          if (causesData.monthlyBreakdown && combinedCausesData[year].monthlyBreakdown) {
            Object.entries(causesData.monthlyBreakdown).forEach(([month, causes]) => {
              if (!combinedCausesData[year].monthlyBreakdown[month]) {
                // Month doesn't exist, add all causes
                combinedCausesData[year].monthlyBreakdown[month] = causes;
              } else {
                // Month exists, merge causes
                const existingMonthCauses = combinedCausesData[year].monthlyBreakdown[month];
                const monthCausesMap = new Map();
                
                existingMonthCauses.forEach(cause => {
                  monthCausesMap.set(cause.causeId, cause);
                });
                
                causes.forEach(newCause => {
                  if (monthCausesMap.has(newCause.causeId)) {
                    // Update existing cause
                    const existingCause = monthCausesMap.get(newCause.causeId);
                    existingCause.fires += newCause.fires;
                    existingCause.acres += newCause.acres;
                  } else {
                    // Add new cause
                    existingMonthCauses.push(newCause);
                  }
                });
                
                // Sort by fires in descending order
                existingMonthCauses.sort((a, b) => b.fires - a.fires);
              }
            });
          }
        }
      });
    }
    
    // Combine top causes across all data
    const combinedTopCauses = [];
    const causeMap = new Map();
    
    // Add existing top causes to the map
    if (statsData.topCauses) {
      statsData.topCauses.forEach(cause => {
        causeMap.set(cause.causeId, cause);
      });
    }
    
    // Add or update with new top causes
    if (newStatsData.topCauses) {
      newStatsData.topCauses.forEach(newCause => {
        if (causeMap.has(newCause.causeId)) {
          // Update existing cause
          const existingCause = causeMap.get(newCause.causeId);
          existingCause.fires += newCause.fires;
          existingCause.acres += newCause.acres;
        } else {
          // Add new cause
          causeMap.set(newCause.causeId, { ...newCause });
        }
      });
    }
    
    // Convert map back to array
    causeMap.forEach(cause => {
      combinedTopCauses.push(cause);
    });
    
    // Sort by fires in descending order
    combinedTopCauses.sort((a, b) => b.fires - a.fires);
    
    // Recalculate percentages
    const totalFiresTopCauses = combinedTopCauses.reduce((sum, cause) => sum + cause.fires, 0);
    combinedTopCauses.forEach(cause => {
      cause.percentage = Math.round((cause.fires / totalFiresTopCauses) * 1000) / 10;
    });
    
    // Combine cause definitions
    const combinedCauseDefinitions = {
      ...(statsData.causeDefinitions || {}),
      ...(newStatsData.causeDefinitions || {})
    };
    
    // Recalculate summary statistics
    const totalFires = combinedYearlyData.reduce((sum, year) => sum + year.fires, 0);
    const totalAcres = combinedYearlyData.reduce((sum, year) => sum + year.acres, 0);
    
    // Find worst year
    let worstYear = null;
    let maxAcres = 0;
    
    combinedYearlyData.forEach(yearData => {
      if (yearData.acres > maxAcres) {
        maxAcres = yearData.acres;
        worstYear = yearData.year;
      }
    });
    
    return {
      yearlyData: combinedYearlyData,
      years: combinedYears,
      monthlyDataByYear: combinedMonthlyData,
      causesDataByYear: combinedCausesData,
      topCauses: combinedTopCauses,
      causeDefinitions: combinedCauseDefinitions,
      summary: {
        totalFires,
        totalAcres,
        worstYear,
        worstYearAcres: maxAcres
      }
    };
  };

  useEffect(() => {
    setContainer(document.getElementById(containerId));
    fetchYearlyData();
  }, [containerId]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  const fetchYearlyData = async () => {
    setLoading(true);
    setError(null);

    try {
      // First fetch the main stats file
      const response = await fetch(`${dataBaseUrl}/firep23_1-stats.json`);

      if (!response.ok) {
        // If we get a 404, it means the statistics file isn't available
        if (response.status === 404) {
          console.warn("Statistics file not found");
          handleDataError("Statistics file not found in the public/data directory.");
          return;
        }
        throw new Error(`Failed to fetch yearly data: ${response.statusText}`);
      }

      let statsData = await response.json();
      
      // Try to get the supplementary data
      try {
        // Check for supplement file
        const supplementResponse = await fetch(`${dataBaseUrl}/firep23_1-supplement-stats.json`);
        
        // If found, merge the data
        if (supplementResponse.ok) {
          const supplementData = await supplementResponse.json();
          statsData = mergeStatistics(statsData, supplementData);
          console.log("Successfully merged supplementary data");
        }
      } catch (suppErr) {
        console.warn("No supplementary stats found or error loading:", suppErr);
        // Continue with just the main data if supplement isn't available
      }

      setYearlyData(statsData.yearlyData);
      setAvailableYears(statsData.years);

      // Set fire cause data if available
      if (statsData.causesDataByYear) {
        setCausesData(statsData.causesDataByYear);
      }

      if (statsData.topCauses) {
        setTopCauses(statsData.topCauses);
      }

      if (statsData.causeDefinitions) {
        setCauseDefinitions(statsData.causeDefinitions);
      }

      // Calculate additional statistics
      const sortedYears = [...statsData.yearlyData].sort((a, b) => parseInt(b.year) - parseInt(a.year));
      const recentYearData = sortedYears.length > 0 ? sortedYears[0] : null;

      const totalFires = statsData.summary.totalFires;
      const totalAcres = statsData.summary.totalAcres;
      const yearCount = statsData.years.length;

      // Update summary stats
      setSummaryStats({
        totalFires: totalFires,
        totalAcres: totalAcres,
        worstYear: statsData.summary.worstYear,
        worstYearAcres: statsData.summary.worstYearAcres,
        recentYear: recentYearData ? recentYearData.year : 'N/A',
        recentYearFires: recentYearData ? recentYearData.fires : 0,
        recentYearAcres: recentYearData ? recentYearData.acres : 0,
        avgAnnualFires: yearCount > 0 ? Math.round(totalFires / yearCount) : 0,
        avgAnnualAcres: yearCount > 0 ? Math.round(totalAcres / yearCount) : 0
      });

      // Set the most recent year as the default selected year
      if (statsData.years.length > 0) {
        const maxYear = Math.max(...statsData.years.map(y => parseInt(y)));
        setSelectedYear(maxYear.toString());

        // Since we already have all the monthly data, store it
        if (statsData.monthlyDataByYear) {
          setMonthlyDataByYear(statsData.monthlyDataByYear);
          
          // Set the data for the selected year
          if (statsData.monthlyDataByYear[maxYear.toString()]) {
            setMonthlyData(statsData.monthlyDataByYear[maxYear.toString()]);
            
            // Calculate peak month for summary
            const monthData = statsData.monthlyDataByYear[maxYear.toString()];
            const peakMonth = monthData.reduce(
              (max, month) => month.acres > max.acres ? month : max, 
              { acres: 0 }
            );
            
            // Update summary stats with peak month
            setSummaryStats(prevStats => ({
              ...prevStats,
              peakMonth: peakMonth.month || 'N/A'
            }));
          } else {
            setEmptyMonthlyData();
          }
        } else {
          // If no monthly data in the file, initialize empty
          setEmptyMonthlyData();
        }
      }

      setLoading(false);

    } catch (err) {
      console.error("Error fetching yearly fire data:", err);
      handleDataError("Failed to load fire data. Please ensure data files are available in the public/data directory.");
    }
  };

  // Load temperature-fire correlation data
  const fetchTempFireData = async () => {
    try {
      const response = await fetch(`${dataBaseUrl}/temperature-fire-correlation.json`);
      
      if (!response.ok) {
        console.warn("Temperature-fire correlation data not found");
        return null;
      }
      
      return await response.json();
    } catch (err) {
      console.error("Error fetching temperature-fire correlation data:", err);
      return null;
    }
  };

  const fetchMonthlyData = async (year) => {
    if (error || !year) {
      setEmptyMonthlyData();
      return;
    }

    try {
      // Check if we already have the data in our state
      if (monthlyDataByYear && monthlyDataByYear[year]) {
        setMonthlyData(monthlyDataByYear[year]);
        
        // Calculate summary stats
        const monthData = monthlyDataByYear[year];
        const totalFires = monthData.reduce((sum, month) => sum + month.fires, 0);
        const totalAcres = monthData.reduce((sum, month) => sum + month.acres, 0);
        
        // Find peak month
        const peakMonth = monthData.reduce(
          (max, month) => month.acres > max.acres ? month : max, 
          { acres: 0 }
        );
        
        // Update summary stats
        setSummaryStats(prevStats => ({
          ...prevStats,
          yearlyAcres: totalAcres,
          peakMonth: peakMonth.month || 'N/A'
        }));
        
        return;
      }
      
      // If we don't have it cached, try to load from data file
      const wasEmpty = monthlyData.length === 0;
      if (wasEmpty) {
        setLoading(true);
      }

      try {
        // First check the main stats file
        const response = await fetch(`${dataBaseUrl}/firep23_1-stats.json`);
        
        if (response.ok) {
          const statsData = await response.json();
          
          if (statsData.monthlyDataByYear && statsData.monthlyDataByYear[year]) {
            // Found monthly data for this year
            const monthlyData = statsData.monthlyDataByYear[year];
            setMonthlyData(monthlyData);
            
            // Calculate peak month
            const peakMonth = monthlyData.reduce(
              (max, month) => month.acres > max.acres ? month : max, 
              { acres: 0 }
            );
            
            // Update summary stats
            setSummaryStats(prevStats => ({
              ...prevStats,
              yearlyAcres: monthlyData.reduce((sum, month) => sum + month.acres, 0),
              peakMonth: peakMonth.month || 'N/A'
            }));
            
            // Update monthly data by year cache
            setMonthlyDataByYear(prevData => ({
              ...prevData,
              [year]: monthlyData
            }));
            
            if (wasEmpty) {
              setLoading(false);
            }
            
            return;
          }
        }
        
        // Check supplement file
        const supplementResponse = await fetch(`${dataBaseUrl}/firep23_1-supplement-stats.json`);
        
        if (supplementResponse.ok) {
          const supplementData = await supplementResponse.json();
          
          if (supplementData.monthlyDataByYear && supplementData.monthlyDataByYear[year]) {
            // Found monthly data in supplement
            const monthlyData = supplementData.monthlyDataByYear[year];
            setMonthlyData(monthlyData);
            
            // Calculate peak month
            const peakMonth = monthlyData.reduce(
              (max, month) => month.acres > max.acres ? month : max, 
              { acres: 0 }
            );
            
            // Update summary stats
            setSummaryStats(prevStats => ({
              ...prevStats,
              yearlyAcres: monthlyData.reduce((sum, month) => sum + month.acres, 0),
              peakMonth: peakMonth.month || 'N/A'
            }));
            
            // Update monthly data by year cache
            setMonthlyDataByYear(prevData => ({
              ...prevData,
              [year]: monthlyData
            }));
            
            if (wasEmpty) {
              setLoading(false);
            }
            
            return;
          }
        }
        
        // If we get here, we couldn't find data for this year
        console.warn(`No monthly data found for year ${year}`);
        setEmptyMonthlyData();
        if (wasEmpty) {
          setLoading(false);
        }
        
      } catch (err) {
        console.error(`Error fetching monthly fire data for year ${year}:`, err);
        setError(`Failed to load monthly data for ${year}. Please check that data files are available.`);
        setEmptyMonthlyData();
        if (wasEmpty) {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(`Error setting monthly fire data for year ${year}:`, err);
      setError(`Failed to load monthly data for ${year}.`);
      setEmptyMonthlyData();
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    fetchMonthlyData(year);
  };

  const handleDataError = (errorMessage) => {
    setYearlyData([]);
    setAvailableYears([]);
    setSelectedYear(null);
    setCausesData({});
    setTopCauses([]);
    setError(errorMessage || "Failed to load fire data. Please ensure data files are available in the public/data directory.");
    setLoading(false);
  };

  const setEmptyMonthlyData = () => {
    setMonthlyData([]);
    setSummaryStats(prevStats => ({
      ...prevStats,
      yearlyAcres: 0,
      peakMonth: 'N/A'
    }));
  };

  // Render loading state
  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <div className="loading-text">Loading fire data...</div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="dashboard-content">
        <div className="error-container">
          <div className="dashboard-header">
            <h2 className="dashboard-title">California Wildfire Dashboard</h2>
          </div>

          <div className="error-message">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="error-title">Data Loading Error</h3>
                <div className="error-details">
                  <p>{error}</p>
                </div>
                <div>
                  <p className="error-help">To fix this issue:</p>
                  <ol className="error-list">
                    <li className="error-list-item">Ensure your data files are in the public/data directory</li>
                    <li className="error-list-item">Check that file names match the expected format (firep23_1-stats.json, etc.)</li>
                    <li className="error-list-item">Verify the JSON files have the correct structure and are properly formatted</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button onClick={fetchYearlyData} className="error-retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-system-container">
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab ${activeTab === 'main' ? 'active' : ''}`}
          onClick={() => handleTabChange('main')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="tab-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          Dashboard Overview
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'yearly' ? 'active' : ''}`}
          onClick={() => handleTabChange('yearly')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="tab-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          Yearly Analysis
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'causes' ? 'active' : ''}`}
          onClick={() => handleTabChange('causes')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="tab-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
          Fire Causes
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'temperature' ? 'active' : ''}`}
          onClick={() => handleTabChange('temperature')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="tab-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.168 1.168a4 4 0 01-8.214 0l1.168-1.168A3 3 0 009 8.172z" clipRule="evenodd" />
          </svg>
          Temperature-Fire Analysis
        </button>
        {/* Tableau Dashboard tab */}
        <button
          className={`dashboard-tab ${activeTab === 'tableau' ? 'active' : ''}`}
          onClick={() => handleTabChange('tableau')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="tab-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
          </svg>
          Tableau Dashboard
        </button>
      </div>
  
      <div className="dashboard-content">
        <div id="main-dashboard" className={`dashboard-tab-content ${activeTab === 'main' ? 'active' : ''}`}>
          {activeTab === 'main' && (
            <MainDashboard
              summaryStats={summaryStats}
              yearlyData={yearlyData}
              onRefresh={fetchYearlyData}
            />
          )}
        </div>
        <div id="yearly-dashboard" className={`dashboard-tab-content ${activeTab === 'yearly' ? 'active' : ''}`}>
          {activeTab === 'yearly' && (
            <EnhancedYearlyAnalysisDashboard
              yearlyData={yearlyData}
              monthlyData={monthlyData}
              monthlyDataByYear={monthlyDataByYear}
              selectedYear={selectedYear}
              availableYears={availableYears}
              summaryStats={summaryStats}
              onYearChange={handleYearChange}
              onRefresh={fetchYearlyData}
            />
          )}
        </div>
        <div id="causes-dashboard" className={`dashboard-tab-content ${activeTab === 'causes' ? 'active' : ''}`}>
          {activeTab === 'causes' && (
            <FireCauseAnalysisDashboard
              causesData={causesData}
              topCauses={topCauses}
              causeDefinitions={causeDefinitions}
              selectedYear={selectedYear}
              availableYears={availableYears}
              onYearChange={handleYearChange}
              onRefresh={fetchYearlyData}
            />
          )}
        </div>
        <div id="temperature-dashboard" className={`dashboard-tab-content ${activeTab === 'temperature' ? 'active' : ''}`}>
          {activeTab === 'temperature' && (
            <TemperatureFireCorrelation
              onRefresh={fetchYearlyData}
            />
          )}
        </div>
        {/* Tableau Dashboard tab content */}
        <div id="tableau-dashboard" className={`dashboard-tab-content ${activeTab === 'tableau' ? 'active' : ''}`}>
          {activeTab === 'tableau' && (
            <TableauDashboard
              title="California Wildfire Tableau Dashboard"
              description="Interactive visualization of California wildfire data using Tableau, providing in-depth analysis and insights."
            />
          )}
        </div>
      </div>
    </div>
  );

}

export default FireDashboardSystem;