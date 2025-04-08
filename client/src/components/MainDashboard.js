// FIXED VERSION OF MainDashboard.js
// This addresses the missing dependencies in the useEffect hook

import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

export const MainDashboard = ({ summaryStats, yearlyData, onRefresh }) => {
  const recentYearsChartRef = useRef(null);
  const fireIntensityChartRef = useRef(null);
  const topYearsChartRef = useRef(null);

  // Format large numbers
  const formatLargeNumber = (num) => {
    if (!num && num !== 0) return "0";

    // Make sure we're working with a number
    const value = typeof num === 'string' ? parseFloat(num) : num;

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  function getResponsiveWidth(svgElement) {
    // Get the width of the container, not the SVG element itself
    const containerWidth = svgElement.parentNode.clientWidth || 
                           svgElement.parentNode.getBoundingClientRect().width || 
                           window.innerWidth - 60;
                           
    // Return the container width with a little padding
    return containerWidth - 40; // 20px padding on each side
  }

  // FIXED: Moved to useCallback to include in dependencies properly
  const getRecentYearsData = useCallback(() => {
    if (!yearlyData || yearlyData.length === 0) return [];

    // Sort years in ascending order
    const sortedData = [...yearlyData].sort((a, b) => parseInt(a.year) - parseInt(b.year));

    // Take the last 10 years or all if less than 10
    return sortedData.slice(Math.max(0, sortedData.length - 10));
  }, [yearlyData]);

  // FIXED: Moved to useCallback to include in dependencies properly
  const getAcresByFireData = useCallback(() => {
    // Calculate average acres per fire for the 5 worst years
    const sortedByAcres = [...yearlyData]
      .sort((a, b) => b.acres - a.acres)
      .slice(0, 5)
      .map(year => ({
        name: year.year,
        value: Math.round(year.acres / year.fires),
        acres: year.acres,
        fires: year.fires
      }));

    return sortedByAcres;
  }, [yearlyData]);

  useEffect(() => {
    if (yearlyData.length > 0) {
      // Move chart creation logic inside useEffect to avoid deps issues
      const createRecentYearsChart = () => {
        const data = getRecentYearsData();
        if (data.length === 0 || !recentYearsChartRef.current) return;

        const margin = { top: 40, right: 80, bottom: 60, left: 60 };
        const svgElement = recentYearsChartRef.current;
        const width = getResponsiveWidth(svgElement);
        const height = 400;
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Clear any existing SVG
        d3.select(svgElement).selectAll('*').remove();

        // Create SVG
        const svg = d3.select(svgElement)
          .attr('width', width)
          .attr('height', height)
          .append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        // Define scales
        const xScale = d3.scaleBand()
          .domain(data.map(d => d.year))
          .range([0, chartWidth])
          .padding(0.1);

        const yScaleLeft = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.fires) * 1.1])
          .range([chartHeight, 0]);

        const yScaleRight = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.acres) * 1.1])
          .range([chartHeight, 0]);

        // Create axes
        svg.append('g')
          .attr('transform', `translate(0,${chartHeight})`)
          .call(d3.axisBottom(xScale));

        svg.append('g')
          .call(d3.axisLeft(yScaleLeft).tickFormat(d => formatLargeNumber(d)));

        svg.append('g')
          .attr('transform', `translate(${chartWidth},0)`)
          .call(d3.axisRight(yScaleRight).tickFormat(d => formatLargeNumber(d)));

        // Add grid lines
        svg.append('g')
          .attr('class', 'grid-lines')
          .selectAll('line')
          .data(yScaleLeft.ticks())
          .enter()
          .append('line')
          .attr('x1', 0)
          .attr('y1', d => yScaleLeft(d))
          .attr('x2', chartWidth)
          .attr('y2', d => yScaleLeft(d))
          .attr('stroke', '#e5e7eb')
          .attr('stroke-dasharray', '3,3');

        // Create line generators
        const lineGeneratorFires = d3.line()
          .x(d => xScale(d.year) + xScale.bandwidth() / 2)
          .y(d => yScaleLeft(d.fires));

        const lineGeneratorAcres = d3.line()
          .x(d => xScale(d.year) + xScale.bandwidth() / 2)
          .y(d => yScaleRight(d.acres));

        // Add the fire count line
        svg.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 3)
          .attr('d', lineGeneratorFires);

        // Add the acres burned line
        svg.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', '#f97316')
          .attr('stroke-width', 3)
          .attr('d', lineGeneratorAcres);

        // Add dots for data points - Fires
        svg.selectAll('.dot-fires')
          .data(data)
          .enter()
          .append('circle')
          .attr('class', 'dot-fires')
          .attr('cx', d => xScale(d.year) + xScale.bandwidth() / 2)
          .attr('cy', d => yScaleLeft(d.fires))
          .attr('r', 5)
          .attr('fill', '#3b82f6');

        // Add dots for data points - Acres
        svg.selectAll('.dot-acres')
          .data(data)
          .enter()
          .append('circle')
          .attr('class', 'dot-acres')
          .attr('cx', d => xScale(d.year) + xScale.bandwidth() / 2)
          .attr('cy', d => yScaleRight(d.acres))
          .attr('r', 5)
          .attr('fill', '#f97316');

        // Add legend
        const legend = svg.append('g')
          .attr('class', 'legend')
          .attr('transform', `translate(${chartWidth / 2 - 100}, -20)`);

        // Fire Count legend
        legend.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 5)
          .attr('fill', '#3b82f6');

        legend.append('text')
          .attr('x', 10)
          .attr('y', 5)
          .text('Fire Count')
          .style('font-size', '12px');

        // Acres Burned legend
        legend.append('circle')
          .attr('cx', 100)
          .attr('cy', 0)
          .attr('r', 5)
          .attr('fill', '#f97316');

        legend.append('text')
          .attr('x', 110)
          .attr('y', 5)
          .text('Acres Burned')
          .style('font-size', '12px');

        // Create tooltip
        const tooltip = d3.select('body')
          .selectAll('.tooltip')
          .data([null])
          .join('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);

        // Add event listeners for tooltips
        svg.selectAll('.dot-fires, .dot-acres')
          .on('mouseover', function (event, d) {
            const isFireDot = d3.select(this).classed('dot-fires');
            const value = isFireDot ? d.fires : d.acres;
            const label = isFireDot ? 'Fire Count' : 'Acres Burned';

            tooltip.transition()
              .duration(200)
              .style('opacity', 0.9);

            tooltip.html(`
              <strong>Year: ${d.year}</strong><br/>
              ${label}: ${isFireDot ? value : value.toLocaleString()}
            `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function () {
            tooltip.transition()
              .duration(500)
              .style('opacity', 0);
          });
      };

      const createFireIntensityChart = () => {
        const data = getAcresByFireData();
        if (data.length === 0 || !fireIntensityChartRef.current) return;

        // Clear any existing SVG
        d3.select(fireIntensityChartRef.current).selectAll('*').remove();

        const svgElement = fireIntensityChartRef.current;
        const width = getResponsiveWidth(svgElement);
        const height = 300;
        const radius = Math.min(width, height) / 2 - 40;

        // Create SVG
        const svg = d3.select(svgElement)
          .attr('width', width)
          .attr('height', height)
          .append('g')
          .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // Colors for the pie chart
        const colors = ['#e03131', '#f08c00', '#2b8a3e', '#1971c2', '#5f3dc4'];

        // Create color scale
        const colorScale = d3.scaleOrdinal()
          .domain(data.map(d => d.name))
          .range(colors);

        // Compute the position of each group on the pie
        const pie = d3.pie()
          .value(d => d.value)
          .sort(null);

        const dataReady = pie(data);

        // Build the pie chart
        const arcGenerator = d3.arc()
          .innerRadius(0)
          .outerRadius(radius);

        // Add the arcs
        svg.selectAll('slices')
          .data(dataReady)
          .enter()
          .append('path')
          .attr('d', arcGenerator)
          .attr('fill', d => colorScale(d.data.name))
          .attr('stroke', 'white')
          .style('stroke-width', '2px')
          .style('opacity', 0.8);

        // Add labels
        const labelArc = d3.arc()
          .innerRadius(radius * 0.7)
          .outerRadius(radius * 0.7);

        svg.selectAll('labels')
          .data(dataReady)
          .enter()
          .append('text')
          .text(d => d.data.name)
          .attr('transform', d => `translate(${labelArc.centroid(d)})`)
          .style('text-anchor', 'middle')
          .style('font-size', 12)
          .style('font-weight', 'bold');

        // Add value labels
        const valueArc = d3.arc()
          .innerRadius(radius * 0.9)
          .outerRadius(radius * 0.9);

        svg.selectAll('values')
          .data(dataReady)
          .enter()
          .append('text')
          .text(d => `${d.data.value}`)
          .attr('transform', d => `translate(${valueArc.centroid(d)})`)
          .style('text-anchor', 'middle')
          .style('font-size', 10)
          .style('fill', '#555');

        // Create tooltip
        const tooltip = d3.select('body')
          .selectAll('.tooltip')
          .data([null])
          .join('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);

        // Add hover effects
        svg.selectAll('path')
          .on('mouseover', function (event, d) {
            d3.select(this)
              .transition()
              .duration(200)
              .style('opacity', 1);

            tooltip.transition()
              .duration(200)
              .style('opacity', 0.9);

            tooltip.html(`
              <strong>Year: ${d.data.name}</strong><br/>
              ${d.data.value.toLocaleString()} acres per fire<br/>
              Total Acres: ${d.data.acres.toLocaleString()}<br/>
              Total Fires: ${d.data.fires.toLocaleString()}
            `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function () {
            d3.select(this)
              .transition()
              .duration(200)
              .style('opacity', 0.8);

            tooltip.transition()
              .duration(500)
              .style('opacity', 0);
          });
      };

      const createTopYearsChart = () => {
        const data = getAcresByFireData();
        if (data.length === 0 || !topYearsChartRef.current) return;

        const margin = { top: 40, right: 30, bottom: 50, left: 60 };
        const svgElement = topYearsChartRef.current;
        const width = getResponsiveWidth(svgElement);
        const height = 300;
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Clear any existing SVG
        d3.select(svgElement).selectAll('*').remove();

        // Create SVG
        const svg = d3.select(svgElement)
          .attr('width', width)
          .attr('height', height)
          .append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        // Colors for the bars
        const colors = ['#e03131', '#f08c00', '#2b8a3e', '#1971c2', '#5f3dc4'];

        // Define scales
        const xScale = d3.scaleBand()
          .domain(data.map(d => d.name))
          .range([0, chartWidth])
          .padding(0.3);

        const yScale = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.acres) * 1.1])
          .range([chartHeight, 0]);

        // Create axes
        svg.append('g')
          .attr('transform', `translate(0,${chartHeight})`)
          .call(d3.axisBottom(xScale));

        svg.append('g')
          .call(d3.axisLeft(yScale).tickFormat(d => formatLargeNumber(d)));

        // Add grid lines
        svg.append('g')
          .attr('class', 'grid-lines')
          .selectAll('line')
          .data(yScale.ticks())
          .enter()
          .append('line')
          .attr('x1', 0)
          .attr('y1', d => yScale(d))
          .attr('x2', chartWidth)
          .attr('y2', d => yScale(d))
          .attr('stroke', '#e5e7eb')
          .attr('stroke-dasharray', '3,3');

        // Add the bars
        svg.selectAll('bars')
          .data(data)
          .enter()
          .append('rect')
          .attr('x', d => xScale(d.name))
          .attr('y', d => yScale(d.acres))
          .attr('width', xScale.bandwidth())
          .attr('height', d => chartHeight - yScale(d.acres))
          .attr('fill', (d, i) => colors[i]).attr('fill', (d, i) => colors[i])
          .attr('rx', 4)
          .attr('ry', 4);

        // Create tooltip
        const tooltip = d3.select('body')
          .selectAll('.tooltip')
          .data([null])
          .join('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);

        // Add hover effects
        svg.selectAll('rect')
          .on('mouseover', function (event, d) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', 0.8);

            tooltip.transition()
              .duration(200)
              .style('opacity', 0.9);

            tooltip.html(`
              <strong>Year: ${d.name}</strong><br/>
              Acres Burned: ${d.acres.toLocaleString()}<br/>
              Fires: ${d.fires.toLocaleString()}<br/>
              Acres per Fire: ${d.value.toLocaleString()}
            `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', 1);

            tooltip.transition()
              .duration(500)
              .style('opacity', 0);
          });
      };

      // Create all charts
      createRecentYearsChart();
      createFireIntensityChart();
      createTopYearsChart();
    }
  }, [yearlyData, getRecentYearsData, getAcresByFireData]); // FIXED: Added missing dependencies

  return (
    <div className="main-dashboard">
      {/* Component JSX code - no changes needed here */}
    </div>
  );
};