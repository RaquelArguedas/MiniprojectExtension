import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const Graphic = () => {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Limpia el SVG antes de redibujar

    // Datos de ejemplo
    const data = [10, 20, 30, 40, 50];

    // Configuración del SVG
    const width = 400;
    const height = 200;
    const barWidth = width / data.length;

    svg
      .attr('width', width)
      .attr('height', height);

    svg
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d, i) => i * barWidth)
      .attr('y', d => height - d)
      .attr('width', barWidth - 1)
      .attr('height', d => d)
      .attr('fill', 'blue');
  }, []);

  return <svg ref={svgRef}></svg>;
};

export default Graphic;
