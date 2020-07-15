import * as d3_delaunay from "./d3-delaunay.js";
import { parseImagesResponse, MappedImage, Point } from "./types.js"

class ScreenPosition{
    constructor(public x: number, public y: number) {}
}

class ImagePosition {
    constructor(public x: number, public y: number, public scale: number) { }
}

class DisplayableImage {
    constructor(public img: HTMLImageElement, public points: Array<Point>) { }
}

class DisplayPoint {
    constructor(public x: number, public y: number, public position: ImagePosition, public img: HTMLImageElement) {
    }
}

class MultiImageMap {
    images: Array<DisplayableImage>;
    overlay: HTMLDivElement;
    overlay_canvas: HTMLCanvasElement;
    bounds: DOMRect;
    delaunay: d3_delaunay.Delaunay;

    constructor(public container: HTMLElement) {
        this.images = [];
        this.overlay = container.ownerDocument.createElement("div");
        this.overlay.classList.add("overlay");
        container.appendChild(this.overlay);

        this.bounds = this.overlay.getBoundingClientRect();

        this.overlay_canvas = this.container.ownerDocument.createElement("canvas");
        this.overlay_canvas.width = this.bounds.width;
        this.overlay_canvas.height = this.bounds.height;
        this.overlay.appendChild(this.overlay_canvas);

        this.overlay_canvas.addEventListener("touchmove", event => {
            event.preventDefault();
            this.redraw(new ScreenPosition(event.touches[0].clientX, event.touches[0].clientY));
        });
        this.overlay_canvas.addEventListener("mousemove", event => {
            this.redraw(new ScreenPosition(event.clientX, event.clientY));
        });
    }

    addImage(img: HTMLImageElement, points: Array<Point>) {
        this.images.push(new DisplayableImage(img, points));

        const bounds = this.bounds;
        this.delaunay = d3_delaunay.Delaunay.from(this.getDisplayPoints().map(p => [p.x, p.y]));
    }

    getDisplayPoints(): Array<DisplayPoint> {
        let points = [];
        this.images.forEach(i => {
            // Scale image to fit the screen
            const rect = i.img.getBoundingClientRect();
            const width_scale = this.bounds.width / rect.width;
            const height_scale = this.bounds.height / rect.height;

            const scale = Math.max(width_scale, height_scale);
            const left = this.bounds.width / 2 - rect.width / 2 * scale + this.bounds.left;
            const top = this.bounds.height / 2 - rect.height / 2 * scale + this.bounds.top;

            // console.log(i.img.src, "width", rect.width, "height", rect.height, width_scale, height_scale, scale, left, top);
            i.points.forEach(p => {
                const x = p.x * rect.width * scale + left;
                const y = p.y * rect.height * scale + top;
                //   console.log("point", x, y);
                if (this.bounds.left <= x && this.bounds.right >= x && this.bounds.top <= y && this.bounds.bottom >= y) {
                    points.push(new DisplayPoint(x, y, new ImagePosition(left, top, scale), i.img));
                }
            })
        });
        console.log(points);
        return points;
    }

    redraw(point : ScreenPosition | null = null) {
        if (!this.delaunay) {
            return;
        }
        console.log("redrawing", this.delaunay.points);
        let context = this.overlay_canvas.getContext("2d");
        context.clearRect(0, 0, this.overlay_canvas.width, this.overlay_canvas.height);

        context.beginPath();
        this.delaunay.render(context);
        context.strokeStyle = "#ccc";
        context.stroke();

        context.beginPath();
        this.delaunay.renderPoints(context);
        context.fill();

        if (point) {
        const i = this.delaunay.find(point.x, point.y);
        const img = this.getDisplayPoints()[i];
        const box = img.img.getBoundingClientRect();
        context.drawImage(img.img, img.position.x, img.position.y, box.width * img.position.scale, box.height * img.position.scale);
        
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