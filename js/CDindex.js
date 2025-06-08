// Set up SVG container and scales
const margin = {top: 40, right: 40, bottom: 40, left: 60};
const cdwidth = 800 - margin.left - margin.right;
const cdheight = 600 - margin.top - margin.bottom;

// Tooltip setup
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "5px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "5px");
/* 
  function loadData() {
    d3.csv("data/output_1w_merged.csv").then(function(csv) {
        const parseYear = d3.timeParse("%Y");

        console.log(csv);

        // First filter: cited_by_count > 0 AND year >= 1990
        var filteredData = csv.filter(paper => {
            const citedCount = +paper.cited_by_count || 0;
            const year = Math.floor(parseFloat(paper.publication_year));
            return citedCount > 0 && year >= 1970;  // Keep only papers with citations and published 1990 or later
        });

        var papers = filteredData.map(paper => {
            // Convert "2018.0" to proper Date
            const year = Math.floor(parseFloat(paper.publication_year));
            const publication_date = parseYear(year.toString());
            
            return {
                id: paper.id,
                title: paper.title,
                year: year, // int type
                publication_date: publication_date, // date type
                citations: paper.referenced_works ? JSON.parse(paper.referenced_works.replace(/'/g, '"')) : [],
                citedBy: [],
                cited_by_count: +paper.cited_by_count || 0,
                concepts_names: paper.concepts_names
            };
        });

        papers.forEach(paper => {
            paper.citedBy = papers.filter(p => 
                p.citations.includes(paper.id))
                .map(p => p.id);
        });

        const papersWithCD = calculateAllCDIndices(papers);
        
        // 导出数据为CSV
        exportToCSV(papersWithCD);
        

        console.log(papersWithCD);
    });
}

// 导出数据为CSV的函数
function exportToCSV(data) {
    // 准备CSV内容
    const csvContent = [
        // 表头
        ['id', 'title', 'year', 'cited_by_count', 'cdIndex', 'ns', 'np', 'concepts_names'].join(','),
        // 数据行
        ...data.map(item => [
            `"${item.id}"`,
            `"${item.title.replace(/"/g, '""')}"`,
            item.year,
            item.cited_by_count,
            item.cdIndex,
            item.cdData.ns,
            item.cdData.np,
            `"${item.concepts_names}"`
        ].join(','))
    ].join('\n');
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'papers_with_cd_index.csv');
    link.style.visibility = 'hidden';
    
    // 添加到文档并触发点击
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
} */

function loadPrecomputedData() {
    d3.csv("data/papers_with_cd_index.csv").then(function(csv) {
        const papersWithCD = csv.map(paper => {
            return {
                id: paper.id,
                title: paper.title,
                year: +paper.year,
                cited_by_count: +paper.cited_by_count,
                cdIndex: +paper.cdIndex,
                cdData: {
                    ns: +paper.ns,
                    np: +paper.np
                },
                concepts_names: paper.concepts_names
            };
        });

        drawTimeline(papersWithCD);
        showIndexSample(papersWithCD);
        drawIndexTrend(papersWithCD);
    });
}

function drawTimeline(data) {
    const svg = d3.select("#timeline")
        .append("svg")
        .attr("width", cdwidth + margin.left + margin.right)
        .attr("height", cdheight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, cdwidth]);
        
    const yScale = d3.scaleLinear()
        .domain([-1, 1]) // CD index ranges from -1 to 1
        .range([cdheight, 0]);
        
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.cited_by_count)])
        .range([3, 15]);
        
    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${cdheight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
        
    svg.append("g")
        .call(d3.axisLeft(yScale));
        
    // Add axis labels
    svg.append("text")
        .attr("x", cdwidth / 2)
        .attr("y", cdheight + margin.bottom - 10)
        .style("text-anchor", "middle")
        .text("发表年份");
        
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -cdheight / 2)
        .style("text-anchor", "middle")
        .text("CD指数");
        

    // Draw circles
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.cdIndex))
        .attr("r", d => sizeScale(d.cited_by_count))
        .attr("fill", d => {
            if (d.cdIndex > 0.75) return "#e63946";  // Strong red for highly disruptive
            if (d.cdIndex > 0.25) return "#f4a261";  // Orange for disruptive
            if (d.cdIndex > -0.25) return "#b4eeb4"; // Neutral
            if (d.cdIndex > -0.75) return "#457b9d"; // Blue for consolidating
            return "#1d3557";                        // Dark blue for highly consolidating
        })
        .attr("opacity", 0.8)
        .attr("stroke", d => {
            if (d.cdIndex > 0.75) return "red";
            if (d.cdIndex < -0.75) return "blue";
            return "none";
        })
        .attr("stroke-cdwidth", 2)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`<strong>${d.title}</strong><br>
                         发表年份: ${d.year}<br>
                         CD指数: ${d.cdIndex.toFixed(3)}<br>
                         被引用量: ${d.cited_by_count}<br>
                         仅引用本论文: ${d.cdData.ns}<br>
                         同时引用本论文及至少一篇本论文的参考文献: ${d.cdData.np}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

function showIndexSample(data) {
    // Display summary statistics in a div
    const sampleDiv = d3.select("#index-sample");
    
    // More detailed categorization
    const highlyDisruptive = data.filter(d => d.cdIndex > 0.75).length;
    const disruptive = data.filter(d => d.cdIndex > 0.25 && d.cdIndex <= 0.75).length;
    const neutral = data.filter(d => d.cdIndex >= -0.25 && d.cdIndex <= 0.25).length;
    const consolidating = data.filter(d => d.cdIndex >= -0.75 && d.cdIndex < -0.25).length;
    const highlyConsolidating = data.filter(d => d.cdIndex < -0.75).length;
    
    sampleDiv.html(`
        <h3>CD指数分布统计</h3>
        <p>总论文数: ${data.length}</p>
        <p><strong>强颠覆性 (CD > 0.75):</strong> ${highlyDisruptive} (${(highlyDisruptive/data.length*100).toFixed(1)}%)</p>
        <p><strong>颠覆性 (0.25 < CD ≤ 0.75):</strong> ${disruptive} (${(disruptive/data.length*100).toFixed(1)}%)</p>
        <p><strong>中立 (-0.25 ≤ CD ≤ 0.25):</strong> ${neutral} (${(neutral/data.length*100).toFixed(1)}%)</p>
        <p><strong>延续性 (-0.75 < CD < -0.25):</strong> ${consolidating} (${(consolidating/data.length*100).toFixed(1)}%)</p>
        <p><strong>强延续性 (CD ≤ -0.75):</strong> ${highlyConsolidating} (${(highlyConsolidating/data.length*100).toFixed(1)}%)</p>
    `);
}

function drawIndexTrend(data) {
    // Create a separate SVG for the trend visualization
    const trendSvg = d3.select("#index-trend")
        .append("svg")
        .attr("width", cdwidth + margin.left + margin.right)
        .attr("height", 350)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Bin the CD indices with more bins for better resolution
    const bins = d3.bin()
        .domain([-1, 1])
        .thresholds(20)  // Increased from 20 to 40 for better resolution
        (data.map(d => d.cdIndex));
    
    // Set up scales
    const xScale = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, cdwidth]);
        
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([250, 0]);
    
    // Add axes
    trendSvg.append("g")
        .attr("transform", `translate(0,250)`)
        .call(d3.axisBottom(xScale));
        
    trendSvg.append("g")
        .call(d3.axisLeft(yScale));
    
    // Add axis labels
    trendSvg.append("text")
        .attr("x", cdwidth / 2)
        .attr("y", 280)
        .style("text-anchor", "middle")
        .text("CD指数");
        
    trendSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -120)
        .style("text-anchor", "middle")
        .text("文献数量");
    
    // Draw bars 
    trendSvg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.x0) + 1)
        .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
        .attr("y", d => yScale(d.length))
        .attr("height", d => 250 - yScale(d.length))
        .attr("fill", d => {
            if (d.x0 > 0.75) return "#e63946";
            if (d.x0 > 0.25) return "#f4a261";
            if (d.x0 > -0.25) return "#b4eeb4";
            if (d.x0 > -0.75) return "#457b9d";
            return "#1d3557";
        });
    
}

// CD Index Calculation Functions
function calculateCDIndex(paper, allPapers) {
    const citingPapers = allPapers.filter(p => 
        p.citations.includes(paper.id) && 
        p.year > paper.year); // Only papers published AFTER the focal paper
    
    let ns = 0; // Solo citations (citing only this paper)
    let np = 0; // Paired citations (citing this paper AND its references)
    
    // Get the paper's references (works it cites)
    const paperRefs = paper.citations;
    
    citingPapers.forEach(citing => {
        // Check if the citing paper cites ANY of the focal paper's references
        const citesPaperRefs = paperRefs.some(ref => 
            citing.citations.includes(ref));
        
        if (paperRefs.length > 0 && citesPaperRefs) {
            np++; // Paired citation
        } else {
            ns++; // Solo citation
        }
    });
    
    const denominator = ns + np;
    const cd = denominator > 0 ? (ns - np) / denominator : 0;
    
    return {
        cdIndex: cd,
        totalCiting: denominator,
        ns: ns,
        np: np
    };
}

function calculateAllCDIndices(papers) {
    // Sort papers by year to ensure proper temporal ordering
    const sortedPapers = [...papers].sort((a, b) => a.year - b.year);
    
    return sortedPapers.map(paper => {
        const cdData = calculateCDIndex(paper, sortedPapers);
        return {
            ...paper,
            cdIndex: cdData.cdIndex,
            cdData: cdData
        };
    });
}

// Initialize the visualization
//loadData();

loadPrecomputedData();