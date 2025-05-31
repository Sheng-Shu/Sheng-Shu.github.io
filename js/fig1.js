const width = 960;
const height = 600;

const svg = d3.select("svg");
const container = svg.append("g");

svg.call(d3.zoom().on("zoom", (event) => {
  container.attr("transform", event.transform);
}));

// 领域配色
const color = d3.scaleOrdinal(d3.schemeSet2);

Promise.all([
  d3.csv("data/nodes.csv"),
  d3.csv("data/edges.csv")
]).then(([nodesData, linksData]) => {

  // 快速查找domain和title
  const domainMap = new Map(nodesData.map(d => [d.id, d.domain]));
  const titleMap = new Map(nodesData.map(d => [d.id, d.title]));

  // 保留在 nodesData 里的点
  const nodeIds = new Set(nodesData.map(d => d.id));
  const nodes = nodesData.map(d => ({ id: d.id, domain: d.domain, title: d.title }));

  // 只保留 nodesData 里都存在的边
  const links = linksData.filter(d => nodeIds.has(d.source) && nodeIds.has(d.target));

  // 领域种类
  const allDomains = Array.from(new Set(nodes.map(d => d.domain)));

  // domain -> 聚类中心
  const fieldCenters = {};
  allDomains.forEach((domain, i) => {
    const angle = 2 * Math.PI * i / allDomains.length;
    fieldCenters[domain] = [
      width / 2 + Math.cos(angle) * 200,
      height / 2 + Math.sin(angle) * 200
    ];
  });

  // 力导向模拟
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(60))
    .force("charge", d3.forceManyBody().strength(-60))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("cluster", clusterForce())
    .alphaDecay(0.12);  // 更快收敛

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
    .attr("r", 5)
    .attr("fill", d => color(d.domain))
    .attr("class", "node")
    .on("mouseover", handleMouseOver)
    .on("mouseout", handleMouseOut);

  node.append("title").text(d => d.title);

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

  setTimeout(() => simulation.stop(), 3000); // 3秒后定型

  function clusterForce() {
    return (alpha) => {
      nodes.forEach(d => {
        const center = fieldCenters[d.domain] || [width / 2, height / 2];
        d.vx += (center[0] - d.x) * 0.09 * alpha;
        d.vy += (center[1] - d.y) * 0.09 * alpha;
      });
    }
  }

  function handleMouseOver(event, d) {
    node.attr("fill", n => n.id === d.id ? "#e34a33" : color(n.domain));
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
});
