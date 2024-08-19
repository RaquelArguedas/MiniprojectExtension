import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const Graphic = () => {
  const svgRef = useRef(null);

  const svg = d3.select(svgRef.current);
  const width = 1000;
  const height = 1000;
  const margin = { top: 20, right: 30, bottom: 30, left: 60 };
  
  svg.attr('width', width).attr('height', height);

  const colorScale = d3.scaleOrdinal()
    .domain([0, 1, 2, -1])
    .range(['lightcoral', 'lightseagreen', 'darkorchid', 'darkorange']);

  let xScale, yScale, xAxis, yAxis;

  const tooltip = d3.select(".tooltip");

  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [width, height]])
    .on('zoom', zoomed);

  svg.call(zoom);

  function zoomed(event) {
    const transform = event.transform;
    const newXScale = transform.rescaleX(xScale);
    const newYScale = transform.rescaleY(yScale);

    svg.selectAll("circle")
      .attr("cx", d => newXScale(d.UMAP1))
      .attr("cy", d => newYScale(d.UMAP2));

    svg.select(".x-axis").call(xAxis.scale(newXScale));
    svg.select(".y-axis").call(yAxis.scale(newYScale));
  }

  function updateChart(filename) {
    d3.json(filename).then(data => {
      svg.selectAll("circle").remove();
      svg.selectAll(".x-axis").remove();
      svg.selectAll(".y-axis").remove();
      svg.selectAll(".y-axis").remove();
      svg.selectAll("text").remove();
      
      xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.UMAP1), d3.max(data, d => d.UMAP1)])
        .range([margin.left, width - margin.right]);

      yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.UMAP2), d3.max(data, d => d.UMAP2)])
        .range([height - margin.bottom, margin.top]);

      svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.UMAP1))
        .attr("cy", d => yScale(d.UMAP2))
        .attr("r", 4)
        .attr("fill", d => colorScale(d.cluster))
        .on("mouseover", (event, d) => {
          tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
          tooltip.html(`x: ${d.UMAP1}<br/>y: ${d.UMAP2}`)
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        });

      xAxis = d3.axisBottom(xScale);
      yAxis = d3.axisLeft(yScale);

      svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis);

      svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis);
      })
      .catch(error => {
        console.log("Error loading data:", error);

        svg.selectAll("circle").remove();
        svg.selectAll(".x-axis").remove();
        svg.selectAll(".y-axis").remove();

        svg.append("text")
          .attr("class", "error-text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .style("font-size", "40px")
          .text("Error loading data");
      });
  }

  useEffect(() => {
    updateChart("/kmeans.json");
  }, []);

  return (
    <>
      <div className="button-group">
        <button onClick={() => updateChart('/kmeans.json')}>Kmeans</button>
        <button onClick={() => updateChart('/dbscan.json')}>DBSCAN</button>
        <button onClick={() => updateChart('/hierarquical.json')}>Hierarchical</button>
      </div>
      <svg ref={svgRef}></svg>
      <div className="tooltip" style={{ opacity: 0, position: 'absolute' }}></div>
    </>
  );
};

export default Graphic;
