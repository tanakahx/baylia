let roi;
let rangeHeight;
let infoHeight;
let xMin = Number.MAX_SAFE_INTEGER;
let xMax = Number.MIN_SAFE_INTEGER;
let yMin = 0;
let yMax = 0;

window.onload = () => {
    rangeHeight = document.getElementById('range').offsetHeight;
    infoHeight = document.getElementById('info').offsetHeight;

    window.api.receive('send', (...args) => {
        roi = args[0];
        createStatsTable(roi);
        createHistogram(roi);
    });
};

window.onresize = () => {
    if (roi.values.size) {
        createHistogram(roi);
    }
}

const xAxis = document.getElementById('x-axis');
xAxis.addEventListener('change', (e) => {
    if (xAxis.value == "auto" || xAxis.value == "persistent") {
        document.getElementById('x-min').disabled = true;
        document.getElementById('x-max').disabled = true;
    } else {
        document.getElementById('x-min').disabled = false;
        document.getElementById('x-max').disabled = false;
    }
    createHistogram(roi);
});

const yAxis = document.getElementById('y-axis');
yAxis.addEventListener('change', (e) => {
    if (yAxis.value == "auto" || yAxis.value == "persistent") {
        document.getElementById('y-min').disabled = true;
        document.getElementById('y-max').disabled = true;
    } else {
        document.getElementById('y-min').disabled = false;
        document.getElementById('y-max').disabled = false;
    }
    createHistogram(roi);
});

function createHistogram(roi) {
    if (!roi.values.size) {
        return;
    }
    const HISTOGRAM_TICKS = 128;
    const view = document.getElementById('view');
    view.innerHTML = '';

    const isAutoX = xAxis.value == "auto";
    const isAutoY = yAxis.value == "auto";
    const isPersistentX = xAxis.value == "persistent";
    const isPersistentY = yAxis.value == "persistent";

    // set the dimensions and margins of the graph
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight - document.getElementById('table').offsetHeight - rangeHeight - infoHeight - 30;
    const margin = {top: 10, left: 40, right: 30, bottom: 30};
    const width = viewWidth - margin.left - margin.right;
    const height = viewHeight - margin.top - margin.bottom;
    
    // append the svg object to the body of the page
    const svg = d3.select("#view")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleLinear()
    if (isAutoX) {
        xMin = Number.MAX_SAFE_INTEGER;
        xMax = Number.MIN_SAFE_INTEGER;
        roi.values.forEach((value, key) => {
            xMin = Math.min(xMin, d3.min(value, function(d) { return d; }));
            xMax = Math.max(xMax, d3.max(value, function(d) { return d; }));
        });
        document.getElementById('x-min').value = xMin;
        document.getElementById('x-max').value = xMax;
    } else if (isPersistentX) {
        let min = Number.MAX_SAFE_INTEGER;
        let max = Number.MIN_SAFE_INTEGER;
        roi.values.forEach((value, key) => {
            min = Math.min(min, d3.min(value, function(d) { return d; }));
            max = Math.max(max, d3.max(value, function(d) { return d; }));
        });
        xMin = Math.min(xMin, min);
        xMax = Math.max(xMax, max);
        document.getElementById('x-min').value = xMin;
        document.getElementById('x-max').value = xMax;
    } else {
        // manual
        xMin = document.getElementById('x-min').value;
        xMax = document.getElementById('x-max').value;
    }
    x.domain([xMin, xMax]).range([0, width]);
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));
    svg.append("g")
        .attr('class', 'grid')
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSize(-height).tickFormat('')); // grid

    // Histogram
    const histogram = d3.histogram()
        .value(function(d) { return d; })
        .domain(x.domain())
        .thresholds(x.ticks(HISTOGRAM_TICKS));

    const hist = new Map();
    roi.values.forEach((value, key) => {
        hist.set(key, histogram(value));
    })
    
    // Y axis
    const y = d3.scaleLinear()
    if (isAutoY) {
        yMin = Number.MAX_SAFE_INTEGER;
        yMax = Number.MIN_SAFE_INTEGER;
        hist.forEach((value) => {
            yMin = Math.min(yMin, d3.min(value, function(d) { return d.length; }));
            yMax = Math.max(yMax, d3.max(value, function(d) { return d.length; }));
        });
        document.getElementById('y-min').value = yMin;
        document.getElementById('y-max').value = yMax;
    } else if (isPersistentY) {
        let min = 0;
        let max = 0;
        hist.forEach((value) => {
            min = Math.min(min, d3.min(value, function(d) { return d.length; }));
            max = Math.max(max, d3.max(value, function(d) { return d.length; }));
        });
        yMin = Math.min(yMin, min);
        yMax = Math.max(yMax, max);
        document.getElementById('y-min').value = yMin;
        document.getElementById('y-max').value = yMax;
    } else {
        // manual
        yMin = document.getElementById('y-min').value;
        yMax = document.getElementById('y-max').value;
    }
    y.domain([yMin, yMax]).range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));
    svg.append("g")
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat('')); // grid

    hist.forEach((value, key) => {
        if (value.length == 1) {
            return;
        }
        svg.append("path")
            .datum(value)
            .attr("fill", "none")
            .attr("stroke", roi.colorMap.get(key).colorCode)
            .attr("stroke-width", 1.5)
            .attr("d", d3.area()
            .x(d => x((d.x0 + d.x1) / 2))
            .y(d => y(d.length)));
    });
}

function createStatsTable(roi) {
    if (!roi.values.size) {
        return;
    }
    const tbody = document.getElementById('stat');
    tbody.innerHTML = '';
    const R = [];
    const G = [];
    const B = [];
    roi.values.forEach ((value, key) => {
        const tr = document.createElement('tr');
        const stats = calculateStats(value);
        for (let j = 0; j < 6; j++) {
            if (j == 0) {
                const th = document.createElement('th');
                th.textContent = roi.colorMap.get(key).name;
                tr.appendChild(th);
            } else {
                const td = document.createElement('td');
                td.textContent = round(stats[j - 1], 1e3);
                tr.appendChild(td);
            }
        }
        tbody.appendChild(tr);
        if (roi.colorMap.get(key).name[0] == 'R') {
            R.push(stats[0]);
        } else if (roi.colorMap.get(key).name[0] == 'G') {
            G.push(stats[0]);
        } else if (roi.colorMap.get(key).name[0] == 'B') {
            B.push(stats[0]);
        }
    });
    // display white balance gain if it can be defined
    const aveR = average(R);
    const aveG = average(G);
    const aveB = average(B);
    const info = document.getElementById('info');
    if (aveR != 0 && aveG != 0 && aveB != 0) {
        const wbgR = round(aveG / aveR, 1e3);
        const wbgB = round(aveG / aveB, 1e3);
        info.innerText = `WBG-R=${wbgR} WBG-B=${wbgB}`;
    } else {
        info.innerText = '';
    }
}

function calculateStats(values) {
    let ave = 0;
    let sqr = 0;
    let num = 0;
    let min = Number.MAX_SAFE_INTEGER;
    let max = Number.MIN_SAFE_INTEGER;
    for (const x of values) {
        num++;
        ave = (ave * (num - 1) + x) / num;
        sqr = (sqr * (num - 1) + x ** 2) / num;
        min = Math.min(min, x);
        max = Math.max(max, x);
    }
    const stdev = Math.sqrt(sqr - ave ** 2);
    const snr = 20 * Math.log10(ave / stdev);
    return [ave, stdev, snr, min, max];
}

function average(values) {
    let ave = 0;
    let num = 0;
    for (const x of values) {
        num++;
        ave = (ave * (num - 1) + x) / num;
    }
    return ave;
}

function round(value, base) {
    return Math.round(value * base) / base;
}
