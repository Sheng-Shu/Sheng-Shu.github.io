// Set up SVG container and scales
const margin = {top: 40, right: 40, bottom: 40, left: 60};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Tooltip setup
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "5px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "5px");

  function loadData() {
    d3.csv("data/openalex-mena_merged.csv").then(function(csv) {
        const parseYear = d3.timeParse("%Y");

        console.log(csv);

        // 首先过滤掉cited_by_count为0的论文
        var filteredData = csv.filter(paper => {
            const citedCount = +paper.cited_by_count || 0;
            return citedCount > 0;  // 只保留被引用次数大于0的论文
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
        drawTimeline(papersWithCD);
        showIndexSample(papersWithCD);
        drawIndexTrend(papersWithCD);

        console.log(papersWithCD);
    });
}

function drawTimeline(data) {
    const svg = d3.select("#timeline")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);
        
    const yScale = d3.scaleLinear()
        .domain([-1, 1]) // CD index ranges from -1 to 1
        .range([height, 0]);
        
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.cited_by_count)])
        .range([3, 15]);
        
    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
        
    svg.append("g")
        .call(d3.axisLeft(yScale));
        
    // Add axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .text("Publication Year");
        
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .text("CD Index");
        
    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Scientific Disruption Timeline");

    // Draw circles with improved color coding
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
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`<strong>${d.title}</strong><br>
                         Year: ${d.year}<br>
                         CD Index: ${d.cdIndex.toFixed(3)}<br>
                         Citations: ${d.cited_by_count}<br>
                         Solo Citations (n_s): ${d.cdData.ns}<br>
                         Paired Citations (n_p): ${d.cdData.np}`)
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
        <h3>CD Index Distribution</h3>
        <p>Total papers: ${data.length}</p>
        <p><strong>Highly Disruptive (CD > 0.75):</strong> ${highlyDisruptive} (${(highlyDisruptive/data.length*100).toFixed(1)}%)</p>
        <p><strong>Disruptive (0.25 < CD ≤ 0.75):</strong> ${disruptive} (${(disruptive/data.length*100).toFixed(1)}%)</p>
        <p><strong>Neutral (-0.25 ≤ CD ≤ 0.25):</strong> ${neutral} (${(neutral/data.length*100).toFixed(1)}%)</p>
        <p><strong>Consolidating (-0.75 < CD < -0.25):</strong> ${consolidating} (${(consolidating/data.length*100).toFixed(1)}%)</p>
        <p><strong>Highly Consolidating (CD ≤ -0.75):</strong> ${highlyConsolidating} (${(highlyConsolidating/data.length*100).toFixed(1)}%)</p>
    `);
}

function drawIndexTrend(data) {
    // Create a separate SVG for the trend visualization
    const trendSvg = d3.select("#index-trend")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", 400)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Bin the CD indices with more bins for better resolution
    const bins = d3.bin()
        .domain([-1, 1])
        .thresholds(40)  // Increased from 20 to 40 for better resolution
        (data.map(d => d.cdIndex));
    
    // Set up scales
    const xScale = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, width]);
        
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
        .attr("x", width / 2)
        .attr("y", 280)
        .style("text-anchor", "middle")
        .text("CD Index");
        
    trendSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -120)
        .style("text-anchor", "middle")
        .text("Number of Papers");
    
    // Draw bars with improved color scheme
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
    
    // Add title
    trendSvg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Distribution of CD Indices");
}

// Improved CD Index Calculation Functions
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
loadData();