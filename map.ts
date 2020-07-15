import * as d3_delaunay from "./d3-delaunay.js";
import { parseImagesResponse, MappedImage, Point } from "./types.js"

class Dimensions {
    constructor(public x: number, public y: number) { }
}

class DisplayableImage {
    constructor(public img: HTMLImageElement, public points: Array<Point>) { }
}

class DisplayPoint {
    constructor(public x: number, public y: number, public img: HTMLImageElement) {
    }
}

class MultiImageMap {
    images: Array<DisplayableImage>;
    overlay: HTMLDivElement;
    overlay_map: HTMLMapElement;
    overlay_canvas: HTMLCanvasElement;
    constructor(public container: HTMLElement) {
        this.images = [];
        this.overlay = container.ownerDocument.createElement("div");
        this.overlay.classList.add("overlay");
        container.appendChild(this.overlay);

        let overlay_img = this.container.ownerDocument.createElement("img");
        overlay_img.src = "/images/transparent.png";
        overlay_img.useMap = "#overlay-map";
        this.overlay.appendChild(overlay_img);

        this.overlay_map = this.container.ownerDocument.createElement("map");
        this.overlay_map.name = "overlay-map";
        this.overlay.appendChild(this.overlay_map);

        this.overlay_canvas = this.container.ownerDocument.createElement("canvas");
        const bounds = this.overlay.getBoundingClientRect();
        this.overlay_canvas.width = bounds.width;
        this.overlay_canvas.height = bounds.height;
        this.overlay.appendChild(this.overlay_canvas);
    }

    addImage(img: HTMLImageElement, points: Array<Point>) {
        this.images.push(new DisplayableImage(img, points));
    }

    getDisplayPoints(): Array<DisplayPoint> {
        let points = [];
        this.images.forEach(i => {
            const rect = i.img.getBoundingClientRect();
            i.points.forEach(p => {
                points.push(new DisplayPoint(p.x * rect.width + rect.left, p.y * rect.height + rect.top, i.img));
            })
        });
        return points;
    }

    redraw() {
        let m = this.overlay_map;
        m.childNodes.forEach(child => m.removeChild(child));

        const points = this.getDisplayPoints();
        console.log(points);
        const delaunay = d3_delaunay.Delaunay.from(points.map(point => {
            return [point.x, point.y];
        }));
        let bounds = this.container.getBoundingClientRect();
        let voronoi = delaunay.voronoi([bounds.left, bounds.top, bounds.right, bounds.bottom]);

        points.forEach((point, index) => {
            const poly: Array<number> = voronoi.cellPolygon(index);
            let area = this.container.ownerDocument.createElement("area");
            area.shape = "poly";
            area.coords = poly.map(point => `${point[0]},${point[1]}`).join(",");

            area.addEventListener("mouseenter", () => {
                point.img.classList.add("show");
            });
            area.addEventListener("mouseleave", () => {
                point.img.classList.remove("show");
            });
            this.overlay_map.appendChild(area);
        });

        if (this.overlay_canvas) {
            let context = this.overlay_canvas.getContext("2d");
            context.clearRect(0, 0, this.overlay_canvas.width, this.overlay_canvas.height);

            context.beginPath();
            delaunay.render(context);
            context.strokeStyle = "#ccc";
            context.stroke();

            context.beginPath();
            voronoi.render(context);
            voronoi.renderBounds(context);
            context.strokeStyle = "#000";
            context.stroke();

            context.beginPath();
            delaunay.renderPoints(context);
            context.fill();
        }
    }
}


function displayImages(images: Array<MappedImage>, container: HTMLElement) {
    let map = new MultiImageMap(container);
    images.forEach(image => {
        let img = container.ownerDocument.createElement("img");
        img.src = "/images/" + image.src;
        img.classList.add("map-image");
        img.addEventListener("load", () => {
            container.appendChild(img);
            map.addImage(img, image.points);
            map.redraw();
        });
    })
}

window.addEventListener("load", event => {
    fetch("/images/images.json").then(value => value.json()).then(
        parseImagesResponse).then(images =>
            displayImages(images, document.getElementById("map")));
})