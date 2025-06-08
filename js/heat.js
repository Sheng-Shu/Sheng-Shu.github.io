document.getElementById("category-select")?.addEventListener("change", (e) => {
  localStorage.setItem("selected-category", e.target.value);
  location.reload();
});


console.log("heat.js loaded!");

(function() {
  const cellSize = 40;
  const margin = {top: 160, left: 150, right: 160, bottom: 160};
  const legendPadding = 100;

  function splitLabelToTwoLines(label) {
    const words = label.trim().split(/\s+/);
    if (words.length < 3) {
      return [label];  // 少于 3 个词，不换行
    }

    const mid = Math.ceil(words.length / 2);
    return [
      words.slice(0, mid).join(" "),
      words.slice(mid).join(" ")
    ];
  }



  Promise.all([
    d3.csv("data/nodes_cleaned.csv", d => {
      let field = "Unknown", domain = "Unknown";
      try {
        if (d.topics && d.topics.startsWith("[")) {
          const jsonStr = d.topics.replace(/""/g, '"').replace(/^"|"$/g, '');
          const arr = JSON.parse(jsonStr);
          if (Array.isArray(arr) && arr.length > 0) {
            field = arr[0].field || "Unknown";
            domain = arr[0].domain || "Unknown";
          }
        }
      } catch (e) {}
      let shortId = d.id ? d.id.split('/').pop() : d.id;
      return {
        ...d,
        id: shortId,
        field,
        domain
      };
    }),
    d3.csv("data/edges.csv")
  ]).then(([nodesData, linksData]) => {
    const selectedCategory = localStorage.getItem("selected-category") || "field";

    const nodefieldMap = new Map();
    nodesData.forEach(d => {
      nodefieldMap.set(d.id, d[selectedCategory] || "Unknown");
    });

    const fieldArray = Array.from(
      new Set(nodesData.map(d => d[selectedCategory]).filter(x => x && x !== "Unknown"))
    ).sort();



    const matrix = {};
    fieldArray.forEach(row => {
      matrix[row] = {};
      fieldArray.forEach(col => {
        matrix[row][col] = 0;
      });
    });

    linksData.forEach(edge => {
      const srcfield = nodefieldMap.get(edge.source);
      const tgtfield = nodefieldMap.get(edge.target);
      if (srcfield && tgtfield && srcfield !== "Unknown" && tgtfield !== "Unknown") {
        matrix[srcfield][tgtfield] += 1;
      }
    });

    const fullData = getHeatmapData(fieldArray, matrix);

    const width = fieldArray.length * cellSize + margin.left + margin.right + legendPadding;
    const height = fieldArray.length * (cellSize+2) + margin.top + margin.bottom;
    console.log("heatmap SVG height:", height);


    const svg = d3.select("#heatmap")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const color = d3.scaleSequential()
      .domain([0, d3.max(fullData, d => d.value)])
      .interpolator(d3.interpolateYlOrRd);

    const tooltip_heat = d3.select("body").append("div")
      .attr("class", "tooltip_heat")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "8px 14px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "6px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("z-index", 99);

    drawHeatmap(fullData, fieldArray);
    createCheckboxFilter(fieldArray, selectedFields => {
      const filteredData = getHeatmapData(selectedFields, matrix);
      drawHeatmap(filteredData, selectedFields);
    });

    function getHeatmapData(fields, mat) {
      const data = [];
      fields.forEach((row, i) => {
        fields.forEach((col, j) => {
          data.push({ row, col, value: mat[row]?.[col] || 0 });
        });
      });
      return data;
    }

    function drawHeatmap(data, fields) {
      g.selectAll("*").remove();

      g.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", d => fields.indexOf(d.col) * cellSize)
        .attr("y", d => fields.indexOf(d.row) * cellSize)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", d => d.value > 0 ? color(d.value) : "#f9f9f9")
        .attr("stroke", "#fff")
        .on("mouseover", function(event, d) {
          d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);
          tooltip_heat.style("display", "block")
            .html(`<b>引用自:</b> ${d.row}<br/><b>被引用:</b> ${d.col}<br/><b>引用数:</b> ${d.value}`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
          tooltip_heat.style("display", "none");
        });

      g.selectAll("text.value")
        .data(data.filter(d => d.value > 0))
        .join("text")
        .attr("class", "value")
        .attr("x", d => fields.indexOf(d.col) * cellSize + cellSize / 2)
        .attr("y", d => fields.indexOf(d.row) * cellSize + cellSize / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", 12)
        .attr("fill", d => d.value > d3.max(data, d => d.value) * 0.5 ? "#fff" : "#333")
        .text(d => d.value);

      g.selectAll("text.row")
        .data(fields)
        .join("text")
        .attr("class", "row")
        .attr("x", -8)
        .attr("y", (d, i) => i * cellSize + cellSize / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .each(function(d) {
          const lines = splitLabelToTwoLines(d);
          const fontSize = lines.length > 1 ? 12 : 14;
          const text = d3.select(this)
            .attr("font-size", fontSize)
            .attr("font-family", "sans-serif");

          text.selectAll("tspan")
            .data(lines)
            .enter()
            .append("tspan")
            .attr("x", -8)
            .attr("dy", (d, i) => i === 0 ? "0em" : "1.1em")
            .text(line => line);
        });

      g.selectAll("text.col")
        .data(fields)
        .join("text")
        .attr("class", "col")
        .attr("text-anchor", "start")
        .attr("transform", (d, i) => `translate(${i * cellSize + cellSize / 2}, -8) rotate(-90)`)
        .each(function(d) {
          const lines = splitLabelToTwoLines(d);
          const fontSize = lines.length > 1 ? 12 : 14;
          const text = d3.select(this)
            .attr("font-size", fontSize)
            .attr("font-family", "sans-serif");

          text.selectAll("tspan")
            .data(lines)
            .enter()
            .append("tspan")
            .attr("x", 0)
            .attr("dy", (d, i) => i === 0 ? "0em" : "1.1em")
            .text(line => line);
        });
    }

    function drawLegend(svg, color, data, heatHeight, margin) {
      const legendWidth = 20;
      const legendHeight = heatHeight;
      const legendX = margin.left + data.length * cellSize + 40;
      const legendY = margin.top;

      const defs = svg.append("defs");
      const linearGradient = defs.append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");

      linearGradient.selectAll("stop")
        .data(d3.ticks(0, 1, 10))
        .enter().append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => color(d * d3.max(data, d => d.value)));

      svg.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)")
        .style("stroke", "#ccc")
        .style("stroke-width", 1);

      const legendScale = d3.scaleLinear()
        .domain(color.domain())
        .range([legendHeight, 0]);

      const legendAxis = d3.axisRight(legendScale)
        .ticks(6)
        .tickFormat(d3.format("d"));

      svg.append("g")
        .attr("transform", `translate(${legendX + legendWidth}, ${legendY})`)
        .call(legendAxis);
    }

    function createCheckboxFilter(fields, onUpdate) {
      const box = d3.select("#filter-box");
      box.selectAll("*").remove();

      const checkboxContainer = box.append("div")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("gap", "10px")
        .style("margin-bottom", "10px");

      checkboxContainer.selectAll("label")
        .data(fields)
        .enter()
        .append("label")
        .style("display", "inline-flex")
        .style("align-items", "center")
        .style("gap", "4px")
        .style("font-family", "sans-serif")
        .style("font-size", "14px")
        .html(d => `<input type="checkbox" value="${d}" checked /> ${d}`);

      const buttonRow = box.append("div")
        .style("margin-top", "10px")
        .style("display", "flex")
        .style("gap", "12px");

      buttonRow.append("button")
        .text("全选")
        .style("padding", "6px 12px")
        .style("font-size", "14px")
        .style("cursor", "pointer")
        .on("click", () => {
          checkboxContainer.selectAll("input").property("checked", true);
        });

      buttonRow.append("button")
        .text("全不选")
        .style("padding", "6px 12px")
        .style("font-size", "14px")
        .style("cursor", "pointer")
        .on("click", () => {
          checkboxContainer.selectAll("input").property("checked", false);
        });

      buttonRow.append("button")
        .text("更新图表")
        .style("padding", "6px 12px")
        .style("font-size", "14px")
        .style("cursor", "pointer")
        .on("click", () => {
          const selected = Array.from(
            checkboxContainer.selectAll("input:checked").nodes(),
            el => el.value
          );
          onUpdate(selected);
        });
    }
  });
})();
