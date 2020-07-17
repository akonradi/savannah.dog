import * as d3_delaunay from "./d3-delaunay.js";
import { parseImagesResponse, MappedImage, Point } from "./types.js"

class ScreenPosition {
    constructor(public x: number, public y: number) { }
}

class DisplayableImage {
    constructor(public img: HTMLImageElement, public point: Point) { }
}

class ScreenBounds {
    constructor(public x_min: number, public y_min: number, public x_max: number, public y_max: number) { }
}

class ImageDisplay {
    constructor(public img: HTMLImageElement, public x_offset: number, public y_offset: number, public scale: number) { }
}

class MovableImage {
    constructor(public display: ImageDisplay, public point: ScreenPosition, public bounds: ScreenBounds) { }
}

function clamp(x: number, min: number, max: number) {
    return Math.max(Math.min(x, max), min);
}

function relaxPoints(points: Array<MovableImage>, num_rounds = 1) {
    const spring_constant = 100;
    const max_force_component = 10;
    const max_movement_per_round = 10;

    for (let round = 0; round < num_rounds; round++) {
        let forces = points.map(() => [0, 0]);
        points.forEach((p, i) => {
            points.forEach((q, j) => {
                if (i <= j) {
                    return;
                }
                let components = [spring_constant / (p.point.x - q.point.x), spring_constant / (p.point.y - q.point.y)];
                components = components.map(v => clamp(v, -max_force_component, max_force_component));
                forces[i][0] += components[0];
                forces[i][1] += components[1];
                forces[j][0] -= components[0];
                forces[j][1] -= components[1];
            });
            forces[i][0] += 20 * spring_constant / (p.point.x - p.bounds.x_min);
            forces[i][0] += 20 * spring_constant / (p.point.x - p.bounds.x_max);

            forces[i][1] += 20 * spring_constant / (p.point.y - p.bounds.y_min);
            forces[i][1] += 20 * spring_constant / (p.point.y - p.bounds.y_max);
        });
        points.forEach((p, i) => {
            let movement = forces[i].map(v => clamp(v, -max_movement_per_round, max_movement_per_round));
            let old_x = p.point.x, old_y = p.point.y;
            p.point.x = clamp(p.point.x + movement[0], p.bounds.x_min, p.bounds.x_max);
            p.point.y = clamp(p.point.y + movement[1], p.bounds.y_min, p.bounds.y_max);
            if (i == 0) {
                console.log(old_x, old_y, "to", p.point.x, p.point.y);
            }
        })
    }
}
function toDisplayPoints(bounds: DOMRect, images: Array<DisplayableImage>): Array<MovableImage> {
    let points = new Array<MovableImage>();

    return images.map(i => {
        // Scale image to fit the screen
        const rect = i.img.getBoundingClientRect();
        const width_scale = bounds.width / rect.width;
        const height_scale = bounds.height / rect.height;
        const scale = Math.max(width_scale, height_scale);

        const width_difference = bounds.width - rect.width * scale;
        const height_difference = bounds.height - rect.height * scale;

        const left = width_difference / 2 + bounds.left;
        const top = height_difference / 2 + bounds.top;

        const x = i.point.x * rect.width * scale + left;
        const y = i.point.y * rect.height * scale + top;

        const screen_bounds = new ScreenBounds(
            Math.max(bounds.left, Math.min(x - width_difference / 2, x + width_difference / 2)),
            Math.max(bounds.top, Math.min(y - height_difference / 2, y + height_difference / 2)),
            Math.min(bounds.right, Math.max(x - width_difference / 2, x + width_difference / 2)),
            Math.min(bounds.bottom, Math.max(y - height_difference / 2, y + height_difference / 2)));

        const display = new ImageDisplay(i.img, left - x, top - y, scale);

        return new MovableImage(display, new ScreenPosition(x, y), screen_bounds);
    });
}
let point_to_array_handler = {
    get(target, propKey, receiver) {
        const index = Number(propKey);
        if (index == 0) {
            return target.point.x;
        } else if (index == 1) {
            return target.point.y;
        } else {
            throw "bad index";
        }
    }
};


class MultiImageMap {
    images: Array<DisplayableImage>;
    overlay_canvas: HTMLCanvasElement;
    bounds: DOMRect;
    display_points: Array<MovableImage>;
    delaunay: d3_delaunay.Delaunay;
    active_image: number;

    constructor(public container: HTMLElement, public debug: boolean = false) {
        this.images = [];
        this.display_points = [];
        this.active_image = 0;

        this.overlay_canvas = this.container.getElementsByTagName("canvas")[0];
        this.bounds = this.container.getBoundingClientRect();
    }

    render() {
        console.log("rendering");
        this.bounds = this.container.getBoundingClientRect();
        this.overlay_canvas.width = this.bounds.width;
        this.overlay_canvas.height = this.bounds.height;
        this.display_points = toDisplayPoints(this.bounds, this.images);
        relaxPoints(this.display_points, 20);
        this.delaunay = d3_delaunay.Delaunay.from(this.display_points.map(p => new Proxy(p, point_to_array_handler)));
        this.redraw()
    }

    addImage(img: HTMLImageElement, points: Array<Point>) {
        const first_index = this.images.length;
        points.forEach(point => this.images.push(new DisplayableImage(img, point)));
    }

    relaxPoints() {
        console.log("relaxing");
        relaxPoints(this.display_points);
        this.delaunay = d3_delaunay.Delaunay.from(this.display_points.map(p => new Proxy(p, point_to_array_handler)));
        this.redraw();
    }

    redraw(point: ScreenPosition | null = null) {
        if (!this.delaunay || this.images.length == 0) {
            return;
        }
        console.log("redrawing", this.delaunay.points);
        let context = this.overlay_canvas.getContext("2d");
        context.clearRect(0, 0, this.overlay_canvas.width, this.overlay_canvas.height);

        const i = point ? this.delaunay.find(point.x, point.y) : 0;
        const img = this.display_points[i];
        const box = img.display.img.getBoundingClientRect();
        context.drawImage(img.display.img,
            img.point.x + img.display.x_offset, img.point.y + img.display.y_offset, box.width * img.display.scale, box.height * img.display.scale);
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

    function onImagesLoaded() {
        map.render();
        map.overlay_canvas.addEventListener("touchmove", event => {
            event.preventDefault();
            map.redraw(new ScreenPosition(event.touches[0].clientX, event.touches[0].clientY));
        });
        map.overlay_canvas.addEventListener("mousemove", event => {
            map.redraw(new ScreenPosition(event.clientX, event.clientY));
        });
        window.addEventListener("resize", () => {
            map.render();
        });
        window.addEventListener("click", () => {
            map.relaxPoints();
        })
    }

    let loadedCount = 0;
    let rendered = false;

    let loaded_msg = document.getElementById("loading").getElementsByTagName("span")[0];
    function onLoadImage() {
        loaded_msg.innerHTML = `loaded ${loadedCount} of ${images.length}`;
        if (loadedCount == images.length) {
            if (!rendered) {
                onImagesLoaded();
                rendered = true;
            }
        }
    }
    images.forEach(image => {
        let img = container.ownerDocument.createElement("img");
        img.classList.add("load-image");

        img.addEventListener("load", () => {
            container.appendChild(img);
            map.addImage(img, image.points);
            loadedCount++;
            onLoadImage();
        });
        img.addEventListener("error", () => {
            loadedCount++;
            onLoadImage();
        });
        img.src = "/images/" + image.src;
    })

}

window.addEventListener("load", event => {
    fetch("/images/images.json").then(value => value.json()).then(
        parseImagesResponse).then(images =>
            displayImages(images, document.getElementById("map")));
})