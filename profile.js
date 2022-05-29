let roi;
let profileWidth;
let profileHeight;
let rangeHeight;
let infoHeight;
let yMin = Number.MAX_SAFE_INTEGER;
let yMax = Number.MIN_SAFE_INTEGER;

window.onload = () => {
    rangeHeight = document.getElementById('range').offsetHeight;
    infoHeight = document.getElementById('info').offsetHeight;
    viewWidth = document.documentElement.clientWidth;
    viewHeight = document.documentElement.clientHeight - rangeHeight - infoHeight;

    window.api.receive('send', (...args) => {
        roi = args[0];
        createProfile(roi);
        displayWhiteBalanceGain(roi);
    });
};

window.onresize = () => {
    viewWidth = document.documentElement.clientWidth;
    viewHeight = document.documentElement.clientHeight - rangeHeight - infoHeight;
    createProfile(roi);
}

const yAxis = document.getElementById('y-axis');
yAxis.addEventListener('change', (e) => {
    if (yAxis.value == "auto" || yAxis.value == "persistent") {
        document.getElementById('y-min').disabled = true;
        document.getElementById('y-max').disabled = true;
    } else {
        document.getElementById('y-min').disabled = false;
        document.getElementById('y-max').disabled = false;
    }
    createProfile(roi);
});

function createProfile(roi) {
    if (!roi.profile.size) {
        return;
    }
    const view = document.getElementById('view');
    view.innerHTML = '';

    const isAutoY = yAxis.value == "auto";
    const isPersistentY = yAxis.value == "persistent";

    // set the dimensions and margins of the graph
    const margin = {top: 10, left: 80, right: 30, bottom: 40};
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
    svg.append("g")
        .attr('class', 'grid')
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSize(-height).tickFormat('')); // grid

    // Y axis
    const y = d3.scaleLinear()
    if (isAutoY) {
        yMin = Number.MAX_SAFE_INTEGER;
        yMax = Number.MIN_SAFE_INTEGER;
        roi.profile.forEach((value) => {
            if (value.length) {
                yMin = Math.min(yMin, d3.min(value, function(d) { return d.value; }));
                yMax = Math.max(yMax, d3.max(value, function(d) { return d.value; }));
            }
        });
        document.getElementById('y-min').value = yMin;
        document.getElementById('y-max').value = yMax;
    } else if (isPersistentY) {
        let min = Number.MAX_SAFE_INTEGER;
        let max = Number.MIN_SAFE_INTEGER;
        roi.profile.forEach((value) => {
            if (value.length) {
                min = Math.min(min, d3.min(value, function(d) { return d.value; }));
                max = Math.max(max, d3.max(value, function(d) { return d.value; }));
            }
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

function displayWhiteBalanceGain(roi) {
    if (!roi.profile.size) {
        return;
    }
    let aveR = 0;
    let aveG = 0;
    let aveB = 0;
    roi.profile.forEach((value, key) => {
        if (value.length) {
            if (roi.colorMap.get(key).name[0] == 'R') {
                aveR = average(value);
            } else if (roi.colorMap.get(key).name[0] == 'G') {
                aveG = average(value);
            } else if (roi.colorMap.get(key).name[0] == 'B') {
                aveB = average(value);
            }
        }
    });
    const info = document.getElementById('info');
    if (aveR != 0 && aveG != 0 && aveB != 0) {
        const wbgR = round(aveG / aveR, 1e3);
        const wbgB = round(aveG / aveB, 1e3);
        info.innerText = `WBG-R=${wbgR} WBG-B=${wbgB}`;
    } else {
        info.innerText = '';
    }
}

function average(values) {
    let ave = 0;
    let num = 0;
    for (const x of values) {
        num++;
        ave = (ave * (num - 1) + x.value) / num;
    }
    return ave;
}

function round(value, base) {
    return Math.round(value * base) / base;
}
