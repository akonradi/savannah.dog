import * as d3_delaunay from "./d3-delaunay.js";
import { parseImagesResponse, MappedImage, Point } from "./types.js"

class ScreenPosition {
    constructor(public x: number, public y: number) { }
}

class ImagePosition extends ScreenPosition {
    constructor(x: number, y: number, public scale: number) {
        super(x, y);
    }
}

class DisplayableImage {
    constructor(public img: HTMLImageElement, public point: Point) { }
}

class DisplayPoint extends ScreenPosition {
    constructor(x: number, y: number, public position: ImagePosition, public img: HTMLImageElement) {
        super(x, y);
    }
}

class MultiImageMap {
    images: Array<DisplayableImage>;
    overlay_canvas: HTMLCanvasElement;
    bounds: DOMRect;
    delaunay: d3_delaunay.Delaunay;
    active_image: number;

    constructor(public container: HTMLElement, public debug: boolean = false) {
        this.images = [];
        this.active_image = 0;

        this.overlay_canvas = this.container.getElementsByTagName("canvas")[0];
        this.bounds = this.container.getBoundingClientRect();
        this.reRender();
    }

    reRender() {
        console.log("rerendering");
        this.bounds = this.container.getBoundingClientRect();
        this.overlay_canvas.width = this.bounds.width;
        this.overlay_canvas.height = this.bounds.height;
        this.delaunay = d3_delaunay.Delaunay.from(this.getDisplayPoints().map(p => [p.x, p.y]));
        this.redraw()
    }

    addImage(img: HTMLImageElement, points: Array<Point>) {
        points.forEach(point => this.images.push(new DisplayableImage(img, point)));
        this.reRender();
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
            const x = i.point.x * rect.width * scale + left;
            const y = i.point.y * rect.height * scale + top;
            //   console.log("point", x, y);
            if (this.bounds.left <= x && this.bounds.right >= x && this.bounds.top <= y && this.bounds.bottom >= y) {
                points.push(new DisplayPoint(x, y, new ImagePosition(left, top, scale), i.img));
            }
        });
        console.log(points);
        return points;
    }

    redraw(point: ScreenPosition | null = null) {
        if (!this.delaunay || this.images.length == 0) {
            return;
        }
        console.log("redrawing", this.delaunay.points);
        let context = this.overlay_canvas.getContext("2d");
        context.clearRect(0, 0, this.overlay_canvas.width, this.overlay_canvas.height);

        const i = point ? this.delaunay.find(point.x, point.y) : 0;
        const img = this.getDisplayPoints()[i];
        const box = img.img.getBoundingClientRect();
        context.drawImage(img.img, img.position.x, img.position.y, box.width * img.position.scale, box.height * img.position.scale);
        this.active_image = i;

        if (this.debug) {
            context.beginPath();
            this.delaunay.renderPoints(context);
            context.fill();

            context.beginPath();
            context.strokeStyle = "#ccc";
            this.delaunay.voronoi([0, 0, this.overlay_canvas.width, this.overlay_canvas.height]).render(context);
            context.stroke();
        }
    }
}


function displayImages(images: Array<MappedImage>, container: HTMLElement) {
    const urlParams = new URLSearchParams(window.location.search);
    let map = new MultiImageMap(container, urlParams.get("debug") == "on");
    images.forEach(image => {
        let img = container.ownerDocument.createElement("img");
        img.src = "/images/" + image.src;
        img.classList.add("load-image");
        img.addEventListener("load", () => {
            container.appendChild(img);
            map.addImage(img, image.points);
            map.redraw();
        });
    })

    map.overlay_canvas.addEventListener("touchmove", event => {
        event.preventDefault();
        map.redraw(new ScreenPosition(event.touches[0].clientX, event.touches[0].clientY));
    });
    map.overlay_canvas.addEventListener("mousemove", event => {
        map.redraw(new ScreenPosition(event.clientX, event.clientY));
    });
    window.addEventListener("resize", () => {
        map.reRender();
    });
}

window.addEventListener("load", event => {
    fetch("/images/images.json").then(value => value.json()).then(
        parseImagesResponse).then(images =>
            displayImages(images, document.getElementById("map")));
})