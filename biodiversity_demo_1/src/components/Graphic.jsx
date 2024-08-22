import React, { useEffect, useRef, useState, useCallback } from 'react';
import PuffLoader from "react-spinners/PuffLoader";
import Slider from '@mui/material/Slider';
import * as d3 from 'd3';

const Graphic = () => {
  const [loading, setLoading] = useState(false);
  const svgRef = useRef(null);
  const width = 1000;
  const height = 1000;
  const margin = { top: 20, right: 30, bottom: 30, left: 60 };
  
  const colorScale = d3.scaleOrdinal()
    .domain([0, 1, 2, -1])
    .range(['lightcoral', 'lightseagreen', 'darkorchid', 'darkorange']);

  const updateChart = useCallback(async (type) => {
    if (!svgRef.current) return;

    let data = JSON.parse(localStorage.getItem(type));
    if (data == null) {
      setLoading(true);
      const params = {}; 
      const body = JSON.stringify({ type, params });
      const res = await fetch(`http://127.0.0.1:5000/do_cluster`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body,
      });
      data = await res.json();
      localStorage.setItem(type, JSON.stringify(data));
      console.log('data received');   
    }
    setLoading(false);

    const svg = d3.select(svgRef.current);

    const xScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.x), d3.max(data, d => d.x)])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.y), d3.max(data, d => d.y)])
      .range([height - margin.bottom, margin.top]);

    svg.selectAll("circle").remove();
    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();

    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 4)
      .attr("fill", d => colorScale(d.cluster))
      .on("mouseover", (event, d) => {
        d3.select(".tooltip").transition()
          .duration(200)
          .style("opacity", 0.9);
        d3.select(".tooltip").html(`x: ${d.x}<br/>y: ${d.y}`)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        d3.select(".tooltip").transition()
          .duration(500)
          .style("opacity", 0);
      });

    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));

    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', zoomed);

    function zoomed(event) {
      const transform = event.transform;
      
      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);
    
      svg.selectAll("circle")
        .attr("cx", d => newXScale(d.x))
        .attr("cy", d => newYScale(d.y));
    
      svg.select(".x-axis").call(d3.axisBottom(newXScale));
      svg.select(".y-axis").call(d3.axisLeft(newYScale));
    }

    svg.call(zoom);
  }, []);

  const handleSlider = (event, newValue) => {
    console.log(newValue)
    // if (newValue<=30){
    //   updateChart('kmeans')
    // }else if(newValue>=30){
    //   updateChart('dbscan')
    // }else{
    //   updateChart('hierarquical')
    // }
    // goind to one value to another make one transparent and araise the other
  }

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all");

    updateChart("kmeans");

    return () => {
      svg.selectAll("*").remove();
    };
  }, [updateChart]);

  return (
    <>
      <div className="button-group">
        <Slider 
          defaultValue={0}  
          sx={{color: '#595959'}}
          onChange={handleSlider}
        />
        <button onClick={() => updateChart('kmeans')}>Kmeans</button>
        <button onClick={() => updateChart('dbscan')}>DBSCAN</button>
        <button onClick={() => updateChart('hierarquical')}>Hierarchical</button>
      </div>
      {loading && 
      <>
        <p>Working on it...</p>
        <PuffLoader size={200} />
      </>
      }
      <svg ref={svgRef}></svg>
      <div className="tooltip" style={{ opacity: 0, position: 'absolute' }}></div>
    </>
  );
};

export default Graphic;