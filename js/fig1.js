const width = 960;
const height = 600;

const svg = d3.select("svg#network");
const container = svg.append("g");
svg.call(d3.zoom().on("zoom", (event) => {
  container.attr("transform", event.transform);
}));

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
  d3.csv("data/output_1w_merged.csv", d => {
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
  }),
  d3.csv("data/edges.csv")
]).then(([nodesData, linksData]) => {
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
      .force("charge", d3.forceManyBody().strength(-60))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(0.1);

    const link = container.append("g")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .attr("opacity", 0.15)
      .selectAll("line")
      .data(links)
      .join("line");

    const node = container.append("g")
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => 4 + Math.sqrt(d.cited_by_count || 1))
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
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut);

    node.append("title")
      .text(d => `${d.title}\n引用次数: ${d.cited_by_count}\n分类: ${d.colorKey}`);

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

    function handleMouseOver(event, d) {
      node.attr("fill", n =>
        n.id === d.id ? d3.color(color(n.colorKey)).darker(1) : color(n.colorKey)
      );
      link.attr("stroke-width", l =>
        l.source.id === d.id || l.target.id === d.id ? 2 : 1
      );
    }

    function handleMouseOut() {
      node.attr("fill", d => color(d.colorKey));
      link.attr("stroke-width", 1);
    }

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
          <span style="font-size:13px;">${d}</span>`);
    });
  }
});
