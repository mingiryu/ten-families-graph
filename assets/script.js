

const KINDRED_IDS = [38, 149, 27251, 42623, 68939, 176860, 603481, 791533, 903988];
const NODE_R = 10;
const HIGHLIGHT_COLOR = "lime";

var GRAPH;
var DATA;

var colorType = 'kindred';
var selectedNodes = new Set();
var filteredKindreds = new Set();
var filteredAttribute = '';

const toBool = ({
    deceased: {
        Y: true,
        N: false,
    },
    suicide: {
        Y: true,
        N: false,
    },
});


fetch('./data/TenFamiliesGraph.json').then(res => res.json()).then(data => {
    DATA = data;
    const elem = document.getElementById('graph');

    const highlightNodes = new Set();
    const highlightLinks = new Set();

    GRAPH = ForceGraph()(elem)
        .graphData(data)
        .nodeLabel('id')
        .nodeColor(node => getNodeColor(node))
        .linkDirectionalArrowLength(5)
        .linkDirectionalParticles(0)
        .linkDirectionalParticleWidth(5)
        .nodeRelSize(NODE_R)
        .onNodeHover(node => {
            highlightNodes.clear();
            highlightLinks.clear();
            if (node) {
                highlightNodes.add(node);
            }

            elem.style.cursor = node ? '-webkit-grab' : null;
        })
        .onLinkHover(link => {
            highlightNodes.clear();
            highlightLinks.clear();

            if (link) {
                highlightLinks.add(link);
                highlightNodes.add(link.source);
                highlightNodes.add(link.target);
            }
        })
        .linkDirectionalParticleWidth(link => highlightLinks.has(link) ? 7 : 3)
        .nodeCanvasObjectMode(node => highlightNodes.has(node) || selectedNodes.has(node) ? 'before' : undefined)
        .nodeCanvasObject((node, ctx) => {
            getNodeShape(node, ctx);
        })
        .onNodeClick((node, event) => {
            // Center/zoom on node
            if (GRAPH.zoom() < 1) {
                GRAPH.centerAt(node.x, node.y, 1000);
                GRAPH.zoom(1, 2000);
            } else {
                GRAPH.centerAt(node.x, node.y, 1000);
            }

            // Select multiple nodes
            if (event.ctrlKey || event.shiftKey || event.altKey) { // multi-selection
                selectedNodes.has(node) ? selectedNodes.delete(node) : selectedNodes.add(node);
            } else { // single-selection
                const untoggle = selectedNodes.has(node) && selectedNodes.size === 1;
                selectedNodes.clear();
                !untoggle && selectedNodes.add(node);
            }

            GRAPH.nodeColor(GRAPH.nodeColor()); // update color of selected nodes

            updateTable(node);
        })
        .onNodeDrag((node, translate) => {
            if (selectedNodes.has(node)) { // moving a selected node
                [...selectedNodes]
                    .filter(selNode => selNode !== node) // don't touch node being dragged
                    .forEach(node => ['x', 'y'].forEach(coord => node[`f${coord}`] = node[coord] + translate[coord])); // translate other nodes by same amount
            }
        })
        .onNodeDragEnd(node => {
            if (selectedNodes.has(node)) { // finished moving a selected node
                [...selectedNodes]
                    .filter(selNode => selNode !== node) // don't touch node being dragged
                    .forEach(node => ['x', 'y'].forEach(coord => node[`f${coord}`] = undefined)); // unfix controlled nodes
            }
        });
});

/** Force Graph Helpers */

const getNodeColor = (node) => {
    if (colorType === 'sex') {
        if (node.sex === 'M') {
            return 'royalblue';
        } else {
            return 'HotPink';
        }
    } else if (colorType === 'gen') {
        return d3.schemeBlues[9][node.gen - 1];
    } else if (colorType === 'kindred') {
        return d3.schemeTableau10[KINDRED_IDS.indexOf(node.KindredID)];
    } else if (toBool[colorType]) {
        if (toBool[colorType][node[colorType]]) {
            return 'deeppink';
        } else {
            return 'gray';
        }
    } else {
        if (node[colorType]) {
            return 'deeppink';
        } else {
            return 'gray';
        }
    }
}


const getNodeShape = (node, ctx) => {
    // add ring just for highlighted nodes
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
    ctx.fillStyle = HIGHLIGHT_COLOR;
    ctx.fill();
}


const updateGraphData = () => {
    if (filteredKindreds.size || filteredAttribute.length) {
        let nodes = DATA['nodes'].slice();
        let links = DATA['links'].slice();

        // Filter by kindred
        if (filteredKindreds.size && filteredKindreds.size < KINDRED_IDS.length) {
            nodes = nodes.filter(d => filteredKindreds.has(d['KindredID']))
            nodeIDs = new Set(nodes.map(d => d.id));
            links = links.filter(d => nodeIDs.has(d['source']['id']) && nodeIDs.has(d['target']['id']))
        }

        // Filter by attribute
        if (filteredAttribute.length) {
            if (filteredAttribute === "male") {
                nodes = nodes.filter(d => d["sex"] === "M");
            } else if (filteredAttribute === "female") {
                nodes = nodes.filter(d => d["sex"] === "F");
            } else if (toBool[filteredAttribute]) {
               nodes = nodes.filter(d => toBool[filteredAttribute][d[filteredAttribute]]);
            } else {
                nodes = nodes.filter(d => d[filteredAttribute]);
            }
            nodeIDs = new Set(nodes.map(d => d.id));
            links = links.filter(d => nodeIDs.has(d['source']['id']) && nodeIDs.has(d['target']['id']))
        }

        GRAPH.graphData({ nodes, links });
    } else {
        GRAPH.graphData(DATA);
    }
}

/** Event Handlers */

const handleParticles = () => {
    const particles = document.getElementById("particles");
    const arrows = document.getElementById("arrows");

    if (![...particles.classList].includes("positive")) {
        arrows.classList.toggle("positive");
        particles.classList.toggle("positive");

        (GRAPH.linkDirectionalParticles(5)
            .linkDirectionalArrowLength(0));
    }
}


const handleArrows = () => {
    const arrows = document.getElementById("arrows");
    const particles = document.getElementById("particles");

    if (![...arrows.classList].includes("positive")) {
        particles.classList.toggle("positive");
        arrows.classList.toggle("positive");

        (GRAPH.linkDirectionalParticles(0)
            .linkDirectionalArrowLength(5));
    }
}


const handleResume = () => {
    const resume = document.getElementById("resume");
    const pause = document.getElementById("pause");
    resume.style.display = 'none';
    pause.style.display = 'inline-block';
    GRAPH.resumeAnimation();
}


const handlePause = () => {
    const resume = document.getElementById("resume");
    const pause = document.getElementById("pause");
    resume.style.display = 'inline-block';
    pause.style.display = 'none';
    GRAPH.pauseAnimation();
}


const handleZoomToFit = () => {
    GRAPH.zoomToFit(1000);
}


const handleColor = (value, text, $selectedItem) => {
    colorType = value;
}


const handleReheat = () => {
    GRAPH.d3ReheatSimulation()
}


const handleSelectView = () => {
    selectedNodes = new Set(GRAPH.graphData()['nodes']);
    updateTable([...selectedNodes][0]);
}


const handleKindred = (value, text, $selectedItem) => {
    filteredKindreds = new Set(value.map(v => +v));
    updateGraphData();
}

const handleAttribute = (value, text, $selectedItem) => {
    filteredAttribute = value;
    updateGraphData();
}


const updateTable = (node) => {
    const table = document.getElementById('table');

    if (!selectedNodes.size) {
        table.style.display = 'none';
    } else {
        const thead = document.getElementById('thead');
        const tbody = document.getElementById('tbody');

        const metadata = new Set(['id', '__indexColor', 'index', 'x', 'y', 'vx', 'vy', 'fx', 'fy'])
        const tableKeys = Object.keys(node).filter(key => !metadata.has(key));
        const tableValidKeys = new Set();

        // Filter a set of valid table columns (inclusive)
        [...selectedNodes].forEach(selectedNode => {
            tableKeys.forEach(key => {
                if (selectedNode[key]) {
                    tableValidKeys.add(key);
                }
            });
        })

        const tableBody = [...selectedNodes].map(selectedNode => {
            const tableCell = [...tableValidKeys].map(key => `<td data-label="${key}">${selectedNode[key]}</td>`);
            return `<tr class="${node === selectedNode ? 'positive' : ''}">${tableCell.join('')}</tr>`;
        })

        const tableHead = [...tableValidKeys].map(key => `<th>${key}</th>`);

        table.style.display = 'block';
        thead.innerHTML = `<tr>${tableHead.join('')}</tr>`;
        tbody.innerHTML = tableBody.join('');

        $('table').tablesort();
    }
    updateInfo();
}


const updateInfo = () => {
    const info = document.getElementById('info');
    let text = '';

    // Node counts
    if (!selectedNodes.size) {
        text = "Click on a node to view its attributes";
    } else if (selectedNodes.size == 1) {
        text = 'Press SHIFT, CTRL, or ALT to select multiple nodes';
    } else {
        text = `${selectedNodes.size} nodes selected`;
    }

    info.innerText = text;
}

/** Semantic UI */

$('#select-color')
    .dropdown({
        onChange: handleColor
    });

$('#select-kindred')
    .dropdown({
        onChange: handleKindred,
    });

$('#select-attribute')
    .dropdown({
        onChange: handleAttribute,
        clearable: true,
    });

$('.button')
    .popup();

$('#control')
    .popup({
        hoverable: true,
        delay: {
            show: 300,
            hide: 800
        }
    });

