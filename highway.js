// @ts-check
'use strict';

/**
 * @typedef Point
 * @property {number} x
 * @property {number} y
 */

/** @type {HTMLInputElement} */
// @ts-ignore
const fileInput = document.getElementById('file');
/** @type {HTMLUListElement} */
// @ts-ignore
const list = document.getElementById('list');
/** @type {HTMLCanvasElement} */
// @ts-ignore
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

/** @type {Point} */
const min = { x: 0, y: 0 };
/** @type {Point} */
const max = { x: canvas.width, y: canvas.height };
/** @type {Point[][]} */
const ways = [];

const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /** @type {Point} */
    const bounds = { x: max.x - min.x, y: max.y - min.y };
    const scaleX = canvas.width / bounds.x;
    const scaleY = canvas.height / bounds.y;
    const scale = Math.min(scaleX, scaleY);

    /**
     * @param {Point} coord
     * @returns {Point}
     */
    const map = coord => {
        const x = (coord.x - min.x) * scale;
        const y = (max.y - coord.y) * scale;
        return { x, y };
    }

    for (let i = 0; i < ways.length; i++) {
        const way = ways[i];
        const color = `hsl(${360 * i / ways.length}, 100%, 50%)`;
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (let j = 0; j < way.length; j++) {
            const p = map(way[j]);
            j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // way.forEach(node => {
        //     const p = map(node);
        //     ctx.fillStyle = color;
        //     ctx.beginPath();
        //     ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
        //     ctx.fill();
        // });
    }
}

const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}

resize();
window.addEventListener('resize', resize);

/**
 * @param {Point[]} way
 * @returns {string}
 */
const createJson = way => {
    const way2 = [];
    for (let i = 0; i < way.length; i++) {
        way2.push({
            x: way[i].x - way[0].x,
            y: way[i].y - way[0].y,
            z: 0,
        });
    }

    return URL.createObjectURL(new Blob(
        [JSON.stringify(way2, null, 4)],
        { type: 'application/json' },
    ));
}

const update = () => {
    while (list.firstChild) list.firstChild.remove();
    for (let i = 0; i < ways.length; i++) {
        const way = ways[i];
        const li = document.createElement('li');
        li.classList.add('way-item');
        const a = document.createElement('a');
        a.download = `road_${i}.json`;
        a.href = createJson(way);
        a.textContent = i.toString();
        a.style.color = `hsl(${360 * i / ways.length}, 100%, 50%)`;
        li.append(a);
        list.append(li);
    }
}

fileInput.addEventListener('change', function() {
    const fileList = this.files;
    if (fileList.length != 1) return;
    const file = fileList[0];
    const reader = new FileReader();
    reader.readAsText(file);
    reader.addEventListener('load', function() {
        const result = this.result;
        if (typeof result != "string") return;
        const parser = new DOMParser();
        const dom = parser.parseFromString(result, 'text/xml');
        if (!dom.querySelector('osm')) return;
        const bounds = dom.querySelector('bounds');

        /**
         * @param {Element} elm
         * @param {string} attr
         * @returns {number}
         */
        const parse = (elm, attr) => {
            const attrStr = elm.getAttribute(attr);
            return Number(attrStr.replace(/\./, ''));
        }

        min.x = parse(bounds, 'minlon');
        min.y = parse(bounds, 'minlat');
        max.x = parse(bounds, 'maxlon');
        max.y = parse(bounds, 'maxlat');

        const wayElms = dom.querySelectorAll('way');
        ways.length = 0;
        wayElms.forEach(wayElm => {
            /** @type {Point[]} */
            const way = [];
            const tag = wayElm.querySelector('tag[k=highway]');
            if (!tag) return;
            const ndElms = wayElm.querySelectorAll('nd');
            ndElms.forEach(ndElm => {
                const id = ndElm.getAttribute('ref');
                const nodeElm = dom.getElementById(id);
                const x = parse(nodeElm, 'lon');
                const y = parse(nodeElm, 'lat');
                way.push({ x, y });
            });
            ways.push(way);
        });
        draw();
        update();
    });
});
