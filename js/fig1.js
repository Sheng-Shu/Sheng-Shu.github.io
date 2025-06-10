console.log("fig1.js loaded");

const width = 960;
const height = 600;

const svg = d3.select("svg#network");
const container = svg.append("g");
svg.call(d3.zoom().on("zoom", (event) => {
  container.attr("transform", event.transform);
}));

let tooltip_force = d3.select("body").select("div.tooltip_force");

if (tooltip_force.empty()) {
  tooltip_force = d3.select("body").append("div")
    .attr("class", "tooltip_force")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "8px 14px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "6px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("z-index", 99);
}

// 确保它始终拥有 CSS 样式（而不是靠 JS 写 inline）
tooltip_force.classed("tooltip_force", true); // 强制附着 class

<<<<<<< HEAD
function parseNode(d) {
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
  return {
    id: d.id ? d.id.split('/').pop() : d.id,
    title: d.title,
    cited_by_count: isNaN(+d.cited_by_count) ? 0 : +d.cited_by_count,
    field,
    domain
  };
}

=======
>>>>>>> 0a81ba2e0abfa8bc95af9ebc62263c8026f89ad1

const customColors = [
  " #71b7ed", " #f2a7da", " #b8aeeb", " #88d8db", " #e66d50",
  "rgb(49, 120, 145)", " #38b775", " #80cba4", " #f6768e", " #4965b0",
  "rgba(74, 209, 29, 0.79)", " #f36f43", " #e9f4a3", " #ff9896", " #9467bd",
  "rgb(230, 203, 250)", " #90d543", " #f8e620", " #e377c2", "rgb(108, 152, 247)"
];
const color = d3.scaleOrdinal().range(customColors);

let currentColorField = localStorage.getItem("color-category") || "field";
let topPercent = 10;

Promise.all([
  d3.csv("data/nodes_cleaned_1.csv", parseNode),
  d3.csv("data/nodes_cleaned_2.csv", parseNode),
  d3.csv("data/edges_1.csv"),
  d3.csv("data/edges_2.csv")
]).then(([nodes1, nodes2, edges1, edges2]) => {
  const nodesData = [...nodes1, ...nodes2];
  const linksData = [...edges1, ...edges2];

  console.log("Loaded edges:", nodesData.slice(0, 5));
  renderGraph(topPercent);

  d3.select("#nodePercent").on("input", function () {
    topPercent = +this.value;
    d3.select("#percentLabel").text(topPercent + "%");
    renderGraph(topPercent);
  });

  d3.select("#colorCategory").on("change", function () {
    localStorage.setItem("color-category", this.value);
    location.reload();
  });

  function renderGraph(percent) {
    container.selectAll("*").remove();

    const nodesSorted = nodesData.slice().sort((a, b) => b.cited_by_count - a.cited_by_count);
    const topCount = Math.floor(nodesSorted.length * percent / 100);
    const topNodes = nodesSorted.slice(0, topCount);
    const topIds = new Set(topNodes.map(d => d.id));

    const filteredLinks = linksData.filter(d =>
      topIds.has(d.source) && topIds.has(d.target)
    );

    const connectedIds = new Set();
    filteredLinks.forEach(d => {
      connectedIds.add(d.source);
      connectedIds.add(d.target);
    });

    const nodes = topNodes
      .filter(d => connectedIds.has(d.id))
      .map(d => ({
        id: d.id,
        title: d.title,
        colorKey: d[currentColorField] || "Unknown",
        cited_by_count: d.cited_by_count
      }));

    const links = filteredLinks.map(d => ({
      source: d.source,
      target: d.target
    }));

    if (nodes.length === 0) {
      container.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "red")
        .text("没有符合条件的节点，请调整滑块或检查数据！");
      return;
    }

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(0.1);

    const link = container.append("g")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .attr("opacity", 0.15)
      .selectAll("line")
      .data(links)
      .join("line");

    const sizeScale = d3.scaleLog()
      .domain([1, d3.max(nodesData, d => d.cited_by_count)])
      .range([4, 24]);

    const node = container.append("g")
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => Math.sqrt(d.cited_by_count || 0))
      .attr("fill", d => color(d.colorKey))
      .attr("class", "node")
      .call(
        d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x; d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "black")
          .attr("stroke-width", 2);

        // 高亮连接的边
        link
          .attr("stroke", l =>
            l.source.id === d.id || l.target.id === d.id ? "#f66" : "#aaa"
          )
          .attr("stroke-width", l =>
            l.source.id === d.id || l.target.id === d.id ? 2.5 : 1
          )
          .attr("opacity", l =>
            l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.05
          );

        // 高亮连接的点，非连接点降低透明度
        node
          .attr("opacity", n =>
            n.id === d.id ||
            links.some(l =>
              (l.source.id === d.id && l.target.id === n.id) ||
              (l.target.id === d.id && l.source.id === n.id)
            )
              ? 1.0
              : 0.2
          );

        tooltip_force
          .style("display", "block")
          .html(`标题：${d.title}<br>引用次数：${d.cited_by_count}<br>分类：${d.colorKey}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke", "#999")
          .attr("stroke-width", 1);

        link
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1)
          .attr("opacity", 0.15);

        node
          .attr("opacity", 1)
          .attr("fill", d => color(d.colorKey));

        tooltip_force.style("display", "none");
      });



    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

    setTimeout(() => {
      simulation.alphaTarget(0);
      simulation.stop();
    }, 3000);




    const legendDiv = d3.select("#legend-container");
    legendDiv.html("");
    const legendItems = Array.from(new Set(nodes.map(d => d.colorKey))).slice(0, 10);
    legendItems.forEach((d, i) => {
      legendDiv.append("span")
        .style("display", "inline-flex")
        .style("align-items", "center")
        .style("margin-right", "20px")
        .html(`
          <span style="display:inline-block;width:16px;height:16px;
          border-radius:8px;background:${color(d)};
          border:1px solid #999;margin-right:6px;"></span>
<<<<<<< HEAD
          <span style="font-size:18px;">${d}</span>`);
=======
          <span style="font-size:13px;">${d}</span>`);
>>>>>>> 0a81ba2e0abfa8bc95af9ebc62263c8026f89ad1
    });
  }
});
