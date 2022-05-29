window.onload = () => {
    window.api.receive('send', (...args) => {
        const roi = args[0];
        if (roi.profile.size) {
            createProfile(roi);
        }
    });
};

function createProfile(roi) {
    const view = document.getElementById('view');
    view.innerHTML = '';

    // set the dimensions and margins of the graph
    const margin = {top: 10, right: 30, bottom: 30, left: 40};
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3.select("#view")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleLinear()
    let xMin = Number.MAX_SAFE_INTEGER;
    let xMax = Number.MIN_SAFE_INTEGER;
    roi.profile.forEach((value, key) => {
        if (value.length) {
            if (roi.profileDirection == 'x') {
                xMin = Math.min(xMin, value[0].x);
                xMax = Math.max(xMax, value[value.length - 1].x);
            } else {
                xMin = Math.min(xMin, value[0].y);
                xMax = Math.max(xMax, value[value.length - 1].y);
            }
        }
    });
    x.domain([xMin, xMax]).range([0, width]);
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    // Y axis
    const y = d3.scaleLinear()
    let yMin = 0;
    let yMax = 0;
    // min and max
    roi.profile.forEach((value) => {
        if (value.length) {
            yMin = Math.min(yMin, d3.min(value, function(d) { return d.value; }));
            yMax = Math.max(yMax, d3.max(value, function(d) { return d.value; }));
        }
    });
    y.domain([yMin, yMax]).range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));

    roi.profile.forEach((value, key) => {
        if (value.length) {
            svg.append("path")
                .datum(value)
                .attr("fill", "none")
                .attr("stroke", roi.colorMap.get(key).colorCode)
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(d => x(roi.profileDirection == 'x' ? d.x : d.y))
                    .y(d => y(d.value)));
        }
    });
}
