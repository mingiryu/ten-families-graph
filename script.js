

const NODE_R = 10;

var GRAPH;
var DATA;
var ENABLE_PARTICLES = false;
var COLOR_TYPE = 'kindred';


fetch('./TenFamiliesGraph.json').then(res => res.json()).then(data => {
    DATA = data;
    const elem = document.getElementById('graph');

    let hoverNode = null;
    const highlightNodes = new Set();
    const highlightLinks = new Set();

    const selectedNodes = new Set();

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

            hoverNode = node || null;
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
            GRAPH.centerAt(node.x, node.y, 1000);
            GRAPH.zoom(1, 2000);

            updateTooltip(node);

            // Select multiple nodes
            if (event.ctrlKey || event.shiftKey || event.altKey) { // multi-selection
                selectedNodes.has(node) ? selectedNodes.delete(node) : selectedNodes.add(node);
            } else { // single-selection
                const untoggle = selectedNodes.has(node) && selectedNodes.size === 1;
                selectedNodes.clear();
                !untoggle && selectedNodes.add(node);
            }

            GRAPH.nodeColor(GRAPH.nodeColor()); // update color of selected nodes
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
            return 'blue'
        } else {
            return 'red'
        }
    } else if (COLOR_TYPE === 'deceased') {
        if (node.deceased === 'Y') {
            return 'black';
        } else {
            return 'lime'
        }
    } else if (COLOR_TYPE === 'suicide') {
        if (node.suicide === 'N') {
            return 'black';
        } else {
            return 'lime'
        }
    } else if (COLOR_TYPE === 'gen') {
        const blues = d3.schemeBlues[9];
        return blues[node.gen - 1]
    } else if (COLOR_TYPE === 'kindred') {
        const accent = d3.schemeAccent;
        const kindreds = [38, 149, 27251, 42623, 68939, 176860, 603481, 791533, 903988];
        return accent[kindreds.indexOf(node.KindredID)]
    } else {
        const accent = d3.schemeAccent;
        return accent[node.group]
    }
}


const getNodeShape = (node, ctx) => {
    // add ring just for highlighted nodes
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();
}

/** Event Handlers */

const handleParticles = () => {
    ENABLE_PARTICLES = !ENABLE_PARTICLES;
    (GRAPH.linkDirectionalParticles(ENABLE_PARTICLES ? 5 : 0)
        .linkDirectionalArrowLength(ENABLE_PARTICLES ? 0 : 5));
}


const handleZoomToFit = () => {
    GRAPH.zoomToFit(1000)
}


const handleColor = (value) => {
    COLOR_TYPE = value
}


const handleReheat = () => {
    GRAPH.d3ReheatSimulation()
}


const handleFilter = (value) => {
    if (value) {
        nodes = DATA['nodes'].filter(d => d['KindredID'] == value)
        nodeSet = new Set(nodes.map(d => d.id));
        links = DATA['links'].filter(d => nodeSet.has(d['source']['id']) && nodeSet.has(d['target']['id']))
        GRAPH.graphData({ nodes, links });
    } else {
        GRAPH.graphData(DATA);
    }
}


const updateTooltip = (node) => {
    const tooltip = document.getElementById('tooltip');
    const metadata = new Set(['id', '__indexColor', 'index', 'x', 'y', 'vx', 'vy'])
    tooltip.innerHTML = Object.keys(node).map(key => node[key] && !metadata.has(key) ? `<p>${key}: ${node[key]}</p>` : '').join('');
}