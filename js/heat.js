console.log("heat.js loaded!");

(function() {
  const cellSize = 40;
  const margin = {top: 120, left: 180, right: 30, bottom: 30};

  Promise.all([
    d3.csv("data/openalex-mena_merged.csv", d => {
      let domain = "Unknown";
      try {
        if (d.topics && d.topics.startsWith("[")) {
          const jsonStr = d.topics.replace(/""/g, '"').replace(/^"|"$/g, '');
          const arr = JSON.parse(jsonStr);
          if (Array.isArray(arr) && arr.length > 0) {
            domain = arr[0].domain || "Unknown";
          }
        }
      } catch (e) {}
      let shortId = d.id ? d.id.split('/').pop() : d.id;
      return {
        ...d,
        id: shortId,
        domain: domain
      };
    }),
    d3.csv("data/edges.csv")
  ]).then(([nodesData, linksData]) => {
    // 1. 构建 id → domain 字典
    const nodeDomainMap = new Map();
    nodesData.forEach(d => {
      nodeDomainMap.set(d.id, d.domain || "Unknown");
    });

    // 2. 得到所有领域（去掉 Unknown）
    const domainArray = Array.from(
      new Set(nodesData.map(d => d.domain).filter(domain => domain && domain !== "Unknown"))
    ).sort();

    // 3. 初始化计数矩阵
    const matrix = {};
    domainArray.forEach(row => {
      matrix[row] = {};
      domainArray.forEach(col => {
        matrix[row][col] = 0;
      });
    });

    // 4. 统计交叉引用次数，跳过 Unknown
    linksData.forEach(edge => {
      const srcDomain = nodeDomainMap.get(edge.source);
      const tgtDomain = nodeDomainMap.get(edge.target);
      if (srcDomain && tgtDomain && srcDomain !== "Unknown" && tgtDomain !== "Unknown") {
        matrix[srcDomain][tgtDomain] += 1;
      }
    });

    // 5. 扁平化为数组
    const heatmapData = [];
    domainArray.forEach(row => {
      domainArray.forEach(col => {
        heatmapData.push({
          row: row,
          col: col,
          value: matrix[row][col]
        });
      });
    });

    // 6. svg 尺寸等
    const width = domainArray.length * cellSize + margin.left + margin.right;
    const height = domainArray.length * cellSize + margin.top + margin.bottom;
    const svg = d3.select("#heatmap")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 7. 颜色比例尺
    const color = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, d3.max(heatmapData, d => d.value)]);

    // 8. 画每个格子
    g.selectAll("rect")
      .data(heatmapData)
      .join("rect")
      .attr("x", d => domainArray.indexOf(d.col) * cellSize)
      .attr("y", d => domainArray.indexOf(d.row) * cellSize)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("fill", d => d.value > 0 ? color(d.value) : "#f9f9f9")
      .attr("stroke", "#fff")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);
        tooltip.style("display", "block")
          .html(`<b>引用自:</b> ${d.row}<br/><b>被引用:</b> ${d.col}<br/><b>引用数:</b> ${d.value}`)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
        tooltip.style("display", "none");
      });

    // 9. 行标签
    g.selectAll("text.row")
      .data(domainArray)
      .join("text")
      .attr("class", "row")
      .attr("x", -8)
      .attr("y", (d,i) => i * cellSize + cellSize/2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 14)
      .attr("font-family", "sans-serif")
      .text(d => d);

    // 10. 列标签
    g.selectAll("text.col")
        .data(domainArray)
        .join("text")
        .attr("class", "col")
        // 不用 x/y，用 transform 定位
        .attr("font-size", 14)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        // 竖排且底部齐整
        .attr("transform", (d,i) => `translate(${i * cellSize + cellSize/2}, -8) rotate(-90)`)
        .text(d => d);




    // 11. 格子加数字
    g.selectAll("text.value")
      .data(heatmapData.filter(d => d.value > 0))
      .join("text")
      .attr("class", "value")
      .attr("x", d => domainArray.indexOf(d.col) * cellSize + cellSize/2)
      .attr("y", d => domainArray.indexOf(d.row) * cellSize + cellSize/2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", 12)
      .attr("fill", d => d.value > d3.max(heatmapData, d => d.value) * 0.5 ? "#fff" : "#333")
      .text(d => d.value);

    // 12. 悬浮提示
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "8px 14px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "6px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("z-index", 99);

    // 13. 图例略...
  });
})();
