

const KINDRED_IDS = [38, 149, 27251, 42623, 68939, 176860, 603481, 791533, 903988];

const NODE_R = 10;

var GRAPH;
var DATA;
var ENABLE_PARTICLES = false;
var COLOR_TYPE = 'kindred';

var selectedNodes = new Set();
var filteredKindreds = new Set();
var filteredAttribute = '';


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

            updateTable(node, selectedNodes);
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
    if (COLOR_TYPE === 'sex') {
        if (node.sex === 'M') {
            return 'blue';
        } else {
            return 'red';
        }
    } else if (COLOR_TYPE === 'deceased') {
        if (node.deceased === 'Y') {
            return 'gray';
        } else {
            return 'lime';
        }
    } else if (COLOR_TYPE === 'suicide') {
        if (node.suicide === 'N') {
            return 'gray';
        } else {
            return 'lime';
        }
    } else if (COLOR_TYPE === 'depression') {
        if (node.depression) {
            return 'lime';
        } else {
            return 'gray';
        }
    } else if (COLOR_TYPE === 'gen') {
        return d3.schemeBlues[9][node.gen - 1];
    } else if (COLOR_TYPE === 'kindred') {
        return d3.schemeTableau10[KINDRED_IDS.indexOf(node.KindredID)];
    } else {
        return d3.schemeBlues[9][0];
    }
}


const getNodeShape = (node, ctx) => {
    // add ring just for highlighted nodes
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
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
            const toBool = ({
                sex: {
                    M: true,
                    F: false
                },
                deceased: {
                    Y: true,
                    N: false,
                },
                suicide: {
                    Y: true,
                    N: false,
                },
                depression: {
                    true: true,
                    false: false,
                }
            });
            nodes = nodes.filter(d => toBool[filteredAttribute][d[filteredAttribute]])
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
    ENABLE_PARTICLES = !ENABLE_PARTICLES;
    (GRAPH.linkDirectionalParticles(ENABLE_PARTICLES ? 5 : 0)
        .linkDirectionalArrowLength(ENABLE_PARTICLES ? 0 : 5));
}


const handleZoomToFit = () => {
    GRAPH.zoomToFit(1000);
}


const handleColor = (value, text, $selectedItem) => {
    COLOR_TYPE = value;
}


const handleReheat = () => {
    GRAPH.d3ReheatSimulation()
}

const handleSelectView = () => {
    const data = GRAPH.graphData();
    selectedNodes = new Set(data['nodes']);
    updateTable(null, null);
}


const handleKindred = (value, text, $selectedItem) => {
    filteredKindreds = new Set(value.map(v => +v));
    updateGraphData();
}

const handleAttribute = (value, text, $selectedItem) => {
    filteredAttribute = value;
    updateGraphData();
}


const updateTable = (node, selectedNodes) => {
    const table = document.getElementById('table');

    if (!node || !selectedNodes.size) {
        table.style.display = 'none';
    } else {
        const info = document.getElementById('info');
        const thead = document.getElementById('thead');
        const tbody = document.getElementById('tbody');

        const metadata = new Set(['id', '__indexColor', 'index', 'x', 'y', 'vx', 'vy'])
        const tableKeys = Object.keys(node).filter(key => !metadata.has(key) && node[key]);
        const tableHead = tableKeys.map(key => `<th>${key}</th>`);
        const tableBody = [...selectedNodes].map(selectedNode => {
            const tableCell = tableKeys.map(key => `<td data-label="${key}">${selectedNode[key]}</td>`);
            return `<tr class="${node === selectedNode ? 'positive' : ''}">${tableCell.join('')}</tr>`;
        })

        if (info.style.display !== 'none' && selectedNodes.size == 1) {
            info.innerText = 'Press shift, ctrl, or alt to select multiple nodes';
        } else {
            info.style.display = 'none';
        }
        table.style.display = 'block';
        thead.innerHTML = `<tr>${tableHead.join('')}</tr>`;
        tbody.innerHTML = tableBody.join('');
    }
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

$('table').tablesort()