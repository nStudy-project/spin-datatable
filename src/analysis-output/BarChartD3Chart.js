import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function BarChartD3Chart({ colX, colY, colZ, coordinates }) {
  const mainChartContainer = useRef(null);
  const subChartContainer = useRef(null);
  const colXScale = colX.modelingType;
  const uniqueGroups = [...new Set(coordinates.map((row) => row.group))];

  const barTooltip = d3
    .select(mainChartContainer.current)
    .append("div")
    .attr("class", "bar tooltip")
    .style("opacity", 0);

  function onMouseOverBars(d, thisBar) {
    d3.select(thisBar).transition().duration(50).style("opacity", 0.6);
    barTooltip.transition().duration(200).style("opacity", 0.9);
    colZ
      ? barTooltip.html(
          `Group: ${d.group}<br>${colY.label}: ${d.y}<br>${colX.label}: ${d.x}<br>row: ${d.row.rowNumber}`,
        )
      : barTooltip.html(
          `${colY.label}: ${d.y}<br>${colX.label}: ${d.x}<br>row: ${d.row.rowNumber}`,
        );

    barTooltip
      .style("left", `${d3.event.pageX}px`)
      .style("top", `${d3.event.pageY - 28}px`);
  }

  function onMouseOutBars(_, thisBar) {
    d3.select(thisBar).transition().duration(50).style("opacity", 1);
    barTooltip.transition().duration(500).style("opacity", 0);
  }

  const chart = (data, height, width, subGraph, title) => {
    const margin = { top: 40, right: 30, bottom: 70, left: 30 };
    const svgWidth = width + margin.left + margin.right;
    const svgHeight = height + margin.top + margin.bottom;
    const svg = d3
      .select(subGraph ? subChartContainer.current : mainChartContainer.current)
      .append("svg")
      .attr("width", subGraph ? svgWidth : svgWidth + 300)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const legend = (svg) => {
      const g = svg
        .attr("transform", `translate(${width + 80},60)`)
        .attr("text-anchor", "start")
        .attr("font-family", "sans-serif")
        .attr("font-size", 14)
        .selectAll("g")
        .data(color.domain().slice().reverse())
        .join("g")
        .attr("transform", (d, i) => `translate(0,${i * 30})`);

      g.append("rect")
        .attr("x", -50)
        .attr("y", 10)
        .attr("width", 25)
        .attr("height", 25)
        .attr("fill", color)
        .on(`mouseover`, function (d) {
          d3.select(this).transition().duration(50).attr("opacity", 0.6);
        })
        .on(`mouseout`, function (d) {
          d3.select(this).transition().duration(50).attr("opacity", 1);
        });

      g.append("text")
        .attr("x", -10)
        .attr("y", 30)
        .text((d) => {
          return d;
        });
    };

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.y)])
      .nice()
      .rangeRound([height - margin.bottom, margin.top]);

    const yAxis = (g) =>
      g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(15, "f"));

    function renameDuplicates(arr) {
      const count = {};
      const xArr = arr.map((d) => d.x);
      xArr.forEach(function (x, i) {
        if (xArr.indexOf(x) !== i) {
          const duplicateCounter =
            x in count ? (count[x] = count[x] + 1) : (count[x] = 1);
          const nextCount = duplicateCounter + 1;
          let newXValue = x + "(" + nextCount + ")";
          while (xArr.indexOf(newXValue) !== -1)
            newXValue = x + "(" + (nextCount + 1) + ")";
          xArr[i] = newXValue;
        }
      });
      return xArr;
    }
    const renamedDuplicatesArr = renameDuplicates(data);

    const duplicatesChanged = data.reduce((acc, curr, i) => {
      return [...acc, { ...curr, x: renamedDuplicatesArr[i] }];
    }, []);

    // for numerical & ordinal data
    const x =
      colXScale === "Continuous"
        ? d3
            .scaleLinear()
            .range([0 + margin.left, width - margin.right])
            .domain([d3.min(data, (d) => d.x), d3.max(data, (d) => d.x)])
            .nice()
        : d3
            .scaleBand()
            .domain(renamedDuplicatesArr)
            .rangeRound([margin.left, width - margin.right])
            .paddingInner(0.1);

    const xAxis = (g) =>
      colXScale === "Continuous"
        ? g
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(10, "f"))
        : g
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");

    svg
      .append("g")
      .selectAll("rect")
      .data(colXScale === "Continuous" ? data : duplicatesChanged)
      .join("rect")
      .on(`mouseover`, function (d) {
        onMouseOverBars(d, this);
      })
      .on(`mouseout`, function (d) {
        onMouseOutBars(d, this);
      })
      .attr("x", (d) => x(d.x))
      .attr("y", (d) => y(d.y))
      .transition()
      .duration(100)
      .delay(function (d, i) {
        return i * 50;
      })
      .attr("width", colXScale === "Continuous" ? 4 : x.bandwidth())
      .attr("height", (d) => y(0) - y(d.y))
      .attr("fill", (d) => color(d["group"]));

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);

    // text label for the y axis
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(colY.label);

    // text label for the x axis
    svg
      .append("text")
      .attr("transform", `translate(${width / 2},${height + 20})`)
      .style("text-anchor", "middle")
      .text(colX.label);

    // text label for subgraph title
    if (colZ) {
      if (subGraph) {
        svg
          .append("text")
          .attr("text-decoration", "underline")
          .attr("font-size", 16)
          .attr("transform", `translate(${width / 2},${20})`)
          .style("text-anchor", "middle")
          .text(`${colZ.label}: ${title}`);
      } else {
        // legend for main graph
        svg
          .append("text")
          .attr("text-anchor", "middle")
          .attr("text-decoration", "underline")
          .attr("transform", `translate(${width + 90},50)`)
          .attr("font-size", 16)
          .text(colZ ? colZ.label : colY.label);
        svg.append("g").call(legend);
      }
    }
    return svg.node();
  };

  const color = d3
    .scaleOrdinal()
    .range([
      "#56B4E9",
      "#E69F00",
      "#009E73",
      "#F0E442",
      "#0072B2",
      "#D55E00",
      "#CC79A7",
      "#999999",
    ]);

  useEffect(() => {
    // data, height, width, subGraph, title
    chart(coordinates, 650, 650, false, false);
    const separateGroups = (data, group) =>
      data.filter((data) => (data.group ? data.group.includes(group) : null));
    colZ &&
      uniqueGroups.forEach((group) =>
        chart(separateGroups(coordinates, group), 350, 350, true, group),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={mainChartContainer} />
      <div ref={subChartContainer} />
    </div>
  );
}
