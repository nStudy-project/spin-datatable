/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import {
  useSelectDispatch,
  useRowsState,
} from "../context/SpreadsheetProvider";
import { REMOVE_SELECTED_CELLS, SELECT_CELLS_BY_IDS } from "../constants";
import {
  chartStyles,
  drawBasicPath,
  createPoints,
  updateConfCurves,
  removeChartElement,
} from "./sharedAnalysisComponents";

const margin = { top: 100, right: 70, bottom: 70, left: 70 };
const width = 300;
const height = 300;
const svgWidth = width + margin.left + margin.right;
const svgHeight = height + margin.top + margin.bottom;
const {
  normalPointSize,
  normalPointFill,
  normalBarFill,
  clickedBarFill,
  clickedBarPointSize,
  highlightedPointSize,
  highlightedPointColor,
} = chartStyles;

const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

// define the line
const xAxis = d3.axisBottom().scale(x).ticks(10, "s");
const yAxis = d3.axisLeft().scale(y).ticks(10, "s");

const reversedLine = d3
  .line()
  .x((d) => x(d[0]))
  .y((d) => y(d[1]));

function drawHistogramBorders(
  svg,
  yPoints,
  xPoints,
  histogramBinTooltip,
  dispatchSelectAction,
  excludedRows,
  rows,
  columns,
  colY,
  colX,
) {
  // Histogram borders. Lower number = higher bars
  const barHeight = 150;
  const barsY = d3.scaleLinear().range([height, barHeight]);
  barsY.domain([0, yPoints.length]);
  const barsX = d3.scaleLinear().range([0, 250]);
  barsX.domain([0, xPoints.length]);

  // set the parameters for the histogram
  const histogramY = d3
    .histogram()
    .domain(y.domain()) // then the domain of the graphic
    .thresholds(8); // then the numbers of bins

  const histogramX = d3
    .histogram()
    .domain(x.domain()) // then the domain of the graphic
    .thresholds(8); // then the numbers of bins

  // And apply this function to data to get the bins
  const yPointsBins = histogramY(yPoints);
  const xPointsBins = histogramX(xPoints);

  function onMouseOverHistogramBar(d, thisBar, col) {
    d3.select(thisBar).transition().duration(50).attr("opacity", 0.6);
    histogramBinTooltip.transition().duration(200).style("opacity", 0.9);
    histogramBinTooltip
      .html(
        `<div><div>${col.label}: [${d.x0}, ${d.x1}]</div><div>N: ${d.length}</div></div>`,
      )
      .style("left", d3.event.pageX + "px")
      .style("top", d3.event.pageY - 28 + "px");
  }

  function onMouseOutHistogramBar(d, thisBar) {
    d3.select(thisBar).transition().duration(50).attr("opacity", 1);
    histogramBinTooltip.transition().duration(500).style("opacity", 0);
  }

  function onClickSelectCells(thisBar, bar, col) {
    const metaKeyPressed = d3.event.metaKey;
    d3.event.stopPropagation();
    if (!metaKeyPressed) {
      svg
        .selectAll(".point")
        .style("fill", normalPointFill)
        .attr("r", normalPointSize);
      svg.selectAll("rect").style("fill", normalBarFill);
    }
    thisBar.style("fill", clickedBarFill);
    svg
      .selectAll(".point")
      .filter((d) => {
        const binMin = bar.x0;
        const binMax = bar.x1;
        if (!d) {
          return null;
        }
        if (col === "x") {
          return d[0] >= binMin && d[0] < binMax;
        }
        return d[1] >= binMin && d[1] < binMax;
      })
      .attr("r", clickedBarPointSize)
      .style("fill", clickedBarFill);

    const selectedColumn = col === "x" ? colX.id : colY.id;
    if (!metaKeyPressed) {
      dispatchSelectAction({ type: REMOVE_SELECTED_CELLS });
    }
    const rowIDs = rows.reduce((acc, row) => {
      return !excludedRows.includes(row.id) &&
        bar.includes(Number(row[selectedColumn]))
        ? acc.concat(row.id)
        : acc;
    }, []);
    dispatchSelectAction({
      type: SELECT_CELLS_BY_IDS,
      rowIDs,
      columnID: selectedColumn,
      rows,
      columns,
    });
  }
  // Histogram Bar X axis
  svg
    .selectAll("xHistBars")
    .data(xPointsBins)
    .enter()
    .append("rect")
    .on("click", function (d) {
      onClickSelectCells(d3.select(this), d, "x");
    })
    .on(`mouseover`, function (d) {
      onMouseOverHistogramBar(d, this, colX);
    })
    .on(`mouseout`, function (d) {
      onMouseOutHistogramBar(d, this);
    })
    .attr("class", "histogramBorders")
    .attr("fill", normalBarFill)
    .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
    .attr("x", (d) => x(d.x0))
    .transition()
    .duration(500)
    .delay(function (d, i) {
      return i * 100;
    })
    .attr("y", (d) => barsY(d.length) - height)
    .attr("height", (d) => height - barsY(d.length));

  // Histogram Bar Y Axis
  svg
    .selectAll("yHistBars")
    .data(yPointsBins)
    .enter()
    .append("rect")
    .on(`mouseover`, function (d) {
      onMouseOverHistogramBar(d, this, colY);
    })
    .on(`mouseout`, function (d) {
      onMouseOutHistogramBar(d, this);
    })
    .on("click", function (d) {
      onClickSelectCells(d3.select(this), d, "y");
    })
    .attr("class", "histogramBorders")
    .attr("x", width + 5)
    .attr("y", (d) => y(d.x1))
    .attr("height", (d) => y(d.x0) - y(d.x1) - 1)
    .transition()
    .duration(500)
    .delay(function (d, i) {
      return i * 100;
    })
    .attr("width", (d) => barsX(d.length))
    .attr("fill", normalBarFill);
}

function onMouseEnterPoint(
  d,
  thisPoint,
  colXLabel,
  colYLabel,
  pointTooltip,
  rows,
) {
  const selectedRowNumber = rows.findIndex((row) => row.id === d[2]) + 1;
  d3.select(thisPoint)
    .transition()
    .duration(50)
    .attr("r", highlightedPointSize);
  pointTooltip.transition().duration(200).style("opacity", 0.9);
  pointTooltip
    .html(
      `row: ${selectedRowNumber}<br>${colXLabel}: ${d[0]}<br>${colYLabel}: ${d[1]}`,
    )
    .style("left", d3.event.pageX + "px")
    .style("top", d3.event.pageY - 28 + "px");
}

function onMouseLeavePoint(d, thisPoint, pointTooltip) {
  if (d3.select(thisPoint).style("fill") === highlightedPointColor) {
    d3.select(thisPoint)
      .transition()
      .duration(50)
      .attr("r", clickedBarPointSize);
  } else {
    d3.select(thisPoint).transition().duration(50).attr("r", normalPointSize);
  }
  pointTooltip.transition().duration(500).style("opacity", 0);
}

export default function D3Container({ data, chartOptions, CI, alpha }) {
  const d3Container = useRef(null);
  const { reg1, reg2, reg3, reg4, reg5, reg6, colY, colX, coordinates } = data;
  const dispatchSelectAction = useSelectDispatch();
  const { excludedRows, rows, columns } = useRowsState();
  const {
    histogramBorders,
    linearRegressionLine,
    degree2Poly,
    degree3Poly,
    degree4Poly,
    degree5Poly,
    degree6Poly,
  } = chartOptions;

  const [linearRegressionPoints, setLinearRegressionPoints] = useState([]);
  const [degree2Points, setDegree2Points] = useState([]);
  const [degree3Points, setDegree3Points] = useState([]);
  const [degree4Points, setDegree4Points] = useState([]);
  const [degree5Points, setDegree5Points] = useState([]);
  const [degree6Points, setDegree6Points] = useState([]);

  const xPoints = coordinates.map((a) => a[0]).sort(d3.ascending);
  const yPoints = coordinates.map((a) => a[1]).sort(d3.ascending);

  useEffect(() => {
    // get extents and range
    const xExtent = d3.extent(coordinates, function (d) {
      return d[0];
    });
    const xRange = xExtent[1] - xExtent[0];
    const yExtent = d3.extent(coordinates, function (d) {
      return d[1];
    });
    const yRange = yExtent[1] - yExtent[0];
    // set domain to be extent +- 5%
    x.domain([xExtent[0] - xRange * 0.05, xExtent[1] + xRange * 0.05]).nice();
    y.domain([yExtent[0] - yRange * 0.05, yExtent[1] + yRange * 0.05]).nice();
    d3.select(d3Container.current)
      .append("div")
      .attr("class", "regression-line tooltip")
      .attr("id", "regression-line-tooltip")
      .style("opacity", 0);
    d3.select(d3Container.current)
      .append("div")
      .attr("class", "histogram-border tooltip")
      .attr("id", "histogram-border-tooltip")
      .style("opacity", 0);
    const linearRegressionCoefficients = reg1.stats["polynomial"];
    const degree2PolyCoefficients = reg2.stats["polynomial"];
    const degree3PolyCoefficients = reg3.stats["polynomial"];
    const degree4PolyCoefficients = reg4.stats["polynomial"];
    const degree5PolyCoefficients = reg5.stats["polynomial"];
    const degree6PolyCoefficients = reg6.stats["polynomial"];
    const linearRegressionEquation = (x) =>
      linearRegressionCoefficients[0] + linearRegressionCoefficients[1] * x;
    const xDomainMin = x.domain()[0];
    const xDomainMax = x.domain()[1];
    // lower divisor = less points = better performance
    const step = (xDomainMax - xDomainMin) / 25;
    setLinearRegressionPoints(
      createPoints(x.domain(), step, linearRegressionEquation),
    );
    const poly2equation = (x) =>
      degree2PolyCoefficients[0] +
      degree2PolyCoefficients[1] * x +
      degree2PolyCoefficients[2] * x * x;
    const poly3equation = (x) =>
      degree3PolyCoefficients[0] +
      degree3PolyCoefficients[1] * x +
      degree3PolyCoefficients[2] * x * x +
      degree3PolyCoefficients[3] * x * x * x;
    const poly4equation = (x) =>
      degree4PolyCoefficients[0] +
      degree4PolyCoefficients[1] * x +
      degree4PolyCoefficients[2] * x * x +
      degree4PolyCoefficients[3] * x * x * x +
      degree4PolyCoefficients[4] * x * x * x * x;
    const poly5equation = (x) =>
      degree5PolyCoefficients[0] +
      degree5PolyCoefficients[1] * x +
      degree5PolyCoefficients[2] * x * x +
      degree5PolyCoefficients[3] * x * x * x +
      degree5PolyCoefficients[4] * x * x * x * x +
      degree5PolyCoefficients[5] * x * x * x * x * x;
    const poly6equation = (x) =>
      degree6PolyCoefficients[0] +
      degree6PolyCoefficients[1] * x +
      degree6PolyCoefficients[2] * x * x +
      degree6PolyCoefficients[3] * x * x * x +
      degree6PolyCoefficients[4] * x * x * x * x +
      degree6PolyCoefficients[5] * x * x * x * x * x +
      degree6PolyCoefficients[6] * x * x * x * x * x * x;
    //points
    setDegree2Points(createPoints(x.domain(), step, poly2equation));
    setDegree3Points(createPoints(x.domain(), step, poly3equation));
    setDegree4Points(createPoints(x.domain(), step, poly4equation));
    setDegree5Points(createPoints(x.domain(), step, poly5equation));
    setDegree6Points(createPoints(x.domain(), step, poly6equation));
  }, []);

  const chartContainer = d3.select(d3Container.current);
  const svg = chartContainer.select("g");
  const pathTooltip = chartContainer.select("#regression-line-tooltip");

  const removeClickedHistogramBars = (e) => {
    if (e.metaKey) return;
    svg
      .selectAll(".point")
      .style("fill", normalPointFill)
      .attr("r", normalPointSize);
    svg.selectAll("rect").style("fill", normalBarFill);
  };

  // initialize chart with static features (axes and points)
  useEffect(() => {
    if (data && d3Container.current) {
      const pointTooltip = d3
        .select(d3Container.current)
        .append("div")
        .attr("class", "point tooltip")
        .style("opacity", 0);
      const svg = d3
        .select(d3Container.current)
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // So that lines stay within the bounds of the graph
      svg
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

      // draw axes
      svg
        .append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
      svg.append("g").attr("class", "y axis").call(yAxis);

      // text label for the x axis
      svg
        .append("text")
        .attr(
          "transform",
          "translate(" + width / 2 + " ," + (height + 50) + ")",
        )
        .style("text-anchor", "middle")
        .text(`${colX.label}${colX.units ? ` (${colX.units})` : ""}`);

      // text label for the y axis
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(`${colY.label}${colY.units ? ` (${colY.units})` : ""}`);

      // TODO remove "magic numbers"
      svg
        .selectAll(".point")
        .data(coordinates)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("r", normalPointSize)
        .attr("cy", (d) => y(d[1]))
        .attr("cx", (d) => x(d[0]))
        .on(`mouseenter`, function (d) {
          onMouseEnterPoint(
            d,
            this,
            colX.label,
            colY.label,
            pointTooltip,
            rows,
          );
        })
        .on(`mouseleave`, function (d) {
          onMouseLeavePoint(d, this, pointTooltip);
        });
    }
  }, [data]);

  useEffect(() => {
    const chartContainer = d3.select(d3Container.current);
    const svg = chartContainer.select("g");
    const histogramBinTooltip = chartContainer.select(
      "#histogram-border-tooltip",
    );
    if (histogramBorders) {
      drawHistogramBorders(
        svg,
        yPoints,
        xPoints,
        histogramBinTooltip,
        dispatchSelectAction,
        excludedRows,
        rows,
        columns,
        colY,
        colX,
      );
    } else {
      removeChartElement(`.histogramBorders`, chartContainer);
    }
  }, [histogramBorders]);

  useEffect(() => {
    if (linearRegressionLine) {
      drawBasicPath(
        linearRegressionPoints,
        "linearRegressionLine",
        "Linear Regression Line",
        svg,
        pathTooltip,
        true,
        "#56b4e9",
        reversedLine,
      );
    } else {
      removeChartElement(".linearRegressionLine", chartContainer);
      removeChartElement(`.linearRegressionLine-hitbox`, chartContainer);
    }
  }, [linearRegressionLine]);

  useEffect(() => {
    if (d3Container.current && data && chartOptions) {
      if (degree2Poly) {
        drawBasicPath(
          degree2Points,
          "degree2PolyLine",
          "Quadratic Regression Line",
          svg,
          pathTooltip,
          true,
          "#e69f00",
          reversedLine,
        );
      } else {
        removeChartElement(`.degree2PolyLine`, chartContainer);
        removeChartElement(`.degree2PolyLine-hitbox`, chartContainer);
      }
    }
  }, [degree2Poly]);

  useEffect(() => {
    if (d3Container.current && data && chartOptions) {
      if (degree3Poly) {
        drawBasicPath(
          degree3Points,
          "degree3PolyLine",
          "Cubic Regression Line",
          svg,
          pathTooltip,
          true,
          "#009e73",
          reversedLine,
        );
      } else {
        removeChartElement(`.degree3PolyLine`, chartContainer);
        removeChartElement(`.degree3PolyLine-hitbox`, chartContainer);
      }
    }
  }, [degree3Poly]);

  useEffect(() => {
    if (d3Container.current && data && chartOptions) {
      if (degree4Poly) {
        drawBasicPath(
          degree4Points,
          "degree4PolyLine",
          "Quartic Regression Line",
          svg,
          pathTooltip,
          true,
          "#f0e442",
          reversedLine,
        );
      } else {
        removeChartElement(`.degree4PolyLine`, chartContainer);
        removeChartElement(`.degree4PolyLine-hitbox`, chartContainer);
      }
    }
  }, [degree4Poly]);

  useEffect(() => {
    if (d3Container.current && data && chartOptions) {
      if (degree5Poly) {
        drawBasicPath(
          degree5Points,
          "degree5PolyLine",
          "5th Degree Regression Line",
          svg,
          pathTooltip,
          true,
          "#0072b2",
          reversedLine,
        );
      } else {
        removeChartElement(`.degree5PolyLine`, chartContainer);
        removeChartElement(`.degree5PolyLine-hitbox`, chartContainer);
      }
    }
  }, [degree5Poly]);

  useEffect(() => {
    if (d3Container.current && data && chartOptions) {
      if (degree6Poly) {
        drawBasicPath(
          degree6Points,
          "degree6PolyLine",
          "6th Degree Regression Line",
          svg,
          pathTooltip,
          true,
          "#d55e00",
          reversedLine,
        );
      } else {
        removeChartElement(`.degree6PolyLine`, chartContainer);
        removeChartElement(`.degree6PolyLine-hitbox`, chartContainer);
      }
    }
  }, [degree6Poly]);

  useEffect(() => {
    updateConfCurves(
      "linearRegressionLine",
      reg1,
      "linearRegressionLineCI",
      "Linear Regression CI",
      d3Container.current,
      coordinates.map((coord) => coord[0]),
      alpha,
      CI,
      reversedLine,
      x,
      y,
    );
  }, [CI["linearRegressionLine"], alpha["linearRegressionLine"]]);

  useEffect(() => {
    updateConfCurves(
      "degree2Poly",
      reg2,
      "degree2PolyLineCI",
      "Quadratic Regression CI",
      d3Container.current,
      coordinates.map((coord) => coord[0]),
      alpha,
      CI,
      reversedLine,
      x,
      y,
    );
  }, [CI["degree2Poly"], alpha["degree2Poly"]]);

  useEffect(() => {
    updateConfCurves(
      "degree3Poly",
      reg3,
      "degree3PolyLineCI",
      "Cubic Regression CI",
      d3Container.current,
      coordinates.map((coord) => coord[0]),
      alpha,
      CI,
      reversedLine,
      x,
      y,
    );
  }, [CI["degree3Poly"], alpha["degree3Poly"]]);

  return (
    <div
      style={{ border: "1px solid rgb(192, 192, 192)" }}
      onClick={removeClickedHistogramBars}
      ref={d3Container}
    />
  );
}
