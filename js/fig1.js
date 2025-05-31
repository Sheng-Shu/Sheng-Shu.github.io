const width = 960;
const height = 600;

const svg = d3.select("svg");
const container = svg.append("g");
svg.call(d3.zoom().on("zoom", (event) => {
  container.attr("transform", event.transform);
}));

// 领域配色
const color = d3.scaleOrdinal(d3.schemeSet2);

// 初始显示百分比
let topPercent = 10;

Promise.all([
  d3.csv("data/openalex-mena_merged.csv", d => {
    // 提取 domain 信息
    let domain = "Unknown";
    try {
      if (d.topics && d.topics.startsWith("[")) {
        const jsonStr = d.topics.replace(/""/g, '"').replace(/^"|"$/g, '');
        const arr = JSON.parse(jsonStr);
        if (Array.isArray(arr) && arr.length > 0) {
          domain = arr[0].domain || "Unknown";
        }
      }
    } catch (e) {
      console.warn("topics parse error:", d.id, d.topics, e);
    }
    // 修正：节点 id 也只保留最后后缀
    let shortId = d.id ? d.id.split('/').pop() : d.id;
    let cited = isNaN(+d.cited_by_count) ? 0 : +d.cited_by_count;
    if (typeof cited !== "number" || isNaN(cited)) cited = 0;
    if (!domain || domain === "Unknown") {
      console.log("domain fail:", d.id, d.title, d.topics);
    }
    return {
      ...d,
      id: shortId, // <--- 这里只保留后缀
      cited_by_count: cited,
      domain: domain
    };
  }),
  d3.csv("data/edges.csv")
]).then(([nodesData, linksData]) => {
  // debug: 查看是否成功加载
  console.log("RAW nodesData:", nodesData.length, nodesData.slice(0,2));
  console.log("RAW linksData:", linksData.length, linksData.slice(0,2));
  renderGraph(topPercent);

  // 滑块事件
  d3.select("#nodePercent").on("input", function () {
    topPercent = +this.value;
    d3.select("#percentLabel").text(topPercent + "%");
    renderGraph(topPercent);
  });

  function renderGraph(percent) {
    container.selectAll("*").remove();

    // 按引用量降序，选前 n%
    const nodesSorted = nodesData
      .slice()
      .sort((a, b) => (b.cited_by_count || 0) - (a.cited_by_count || 0));
    const topCount = Math.floor(nodesSorted.length * percent / 100);
    const topNodes = nodesSorted.slice(0, topCount);
    const topIds = new Set(topNodes.map(d => d.id));

    console.log("topNodes:", topNodes.length, topNodes.slice(0,3));

    // 只保留 topNodes 内的边
    const filteredLinks = linksData.filter(d =>
      topIds.has(d.source) && topIds.has(d.target)
    );
    console.log("filteredLinks:", filteredLinks.length, filteredLinks.slice(0,3));

    // 力导向节点/边
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
        domain: d.domain || "Unknown",
        cited_by_count: d.cited_by_count
      }));
    const links = filteredLinks.map(d => ({
      source: d.source,
      target: d.target
    }));

    console.log("final nodes for simulation:", nodes.length, nodes.slice(0,3));
    console.log("final links for simulation:", links.length, links.slice(0,3));

    // 如果没有节点/边，给个提示
    if (nodes.length === 0) {
      container.append("text")
        .attr("x", width/2).attr("y", height/2)
        .attr("text-anchor", "middle")
        .attr("fill", "red")
        .text("没有符合条件的节点，请调整滑块或检查数据！");
      return;
    }

    // 力导向
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-60))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(0.12);

    // 画边
    const link = container.append("g")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(links)
      .join("line");

    // 画点
    const node = container.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => 4 + Math.sqrt(d.cited_by_count || 1))
      .attr("fill", d => color(d.domain))
      .attr("class", "node")
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut);

    node.append("title")
      .text(d => `${d.title}\n被引用：${d.cited_by_count}\n领域：${d.domain}`);

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

    setTimeout(() => simulation.stop(), 3000);

    function handleMouseOver(event, d) {
      node.attr("fill", n =>
        n.id === d.id ? "#e34a33" : color(n.domain)
      );
      link.attr("stroke", l =>
        l.source.id === d.id || l.target.id === d.id ? "#ff6600" : "#aaa"
      ).attr("stroke-width", l =>
        l.source.id === d.id || l.target.id === d.id ? 2 : 1
      );
    }
    function handleMouseOut() {
      node.attr("fill", d => color(d.domain));
      link.attr("stroke", "#aaa").attr("stroke-width", 1);
    }
  }
});
