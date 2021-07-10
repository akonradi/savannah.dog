import * as d3_delaunay from "./d3-delaunay.js";
import { parseImagesResponse } from "./types.js";
class ScreenPosition {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
class DisplayableImage {
    constructor(img, point, weight) {
        this.img = img;
        this.point = point;
        this.weight = weight;
    }
}
class ScreenBounds {
    constructor(x_min, y_min, x_max, y_max) {
        this.x_min = x_min;
        this.y_min = y_min;
        this.x_max = x_max;
        this.y_max = y_max;
    }
}
class ImageDisplay {
    constructor(img, x_offset, y_offset, scale) {
        this.img = img;
        this.x_offset = x_offset;
        this.y_offset = y_offset;
        this.scale = scale;
    }
}
class MovableImage {
    constructor(display, point, bounds, weight) {
        this.display = display;
        this.point = point;
        this.bounds = bounds;
        this.weight = weight;
    }
}
function clamp(x, min, max) {
    return Math.max(Math.min(x, max), min);
}
function relaxPoints(points, num_rounds = 1) {
    const spring_constant = 200;
    const max_force_component = 100;
    const max_movement_per_round = 20;
    const average_weight = points.map(p => p.weight).reduce((a, b) => a + b, 0) / points.length;
    for (let round = 0; round < num_rounds; round++) {
        let forces = points.map(() => [0, 0]);
        points.forEach((p, i) => {
            points.forEach((q, j) => {
                if (i <= j) {
                    return;
                }
                const denominator = Math.pow(p.point.x - q.point.x, 2) + Math.pow(p.point.y - q.point.y, 2);
                const scale = Math.pow(p.weight + q.weight, 2) / average_weight / denominator;
                let components = [(p.point.x - q.point.x), (p.point.y - q.point.y)].map(v => v * spring_constant * scale);
                components = components.map(v => clamp(v, -max_force_component, max_force_component));
                forces[i][0] += components[0];
                forces[i][1] += components[1];
                forces[j][0] -= components[0];
                forces[j][1] -= components[1];
            });
            forces[i][0] += 10 * spring_constant / (p.point.x - p.bounds.x_min);
            forces[i][0] += 10 * spring_constant / (p.point.x - p.bounds.x_max);
            forces[i][1] += 10 * spring_constant / (p.point.y - p.bounds.y_min);
            forces[i][1] += 10 * spring_constant / (p.point.y - p.bounds.y_max);
        });
        points.forEach((p, i) => {
            let movement = forces[i].map(v => clamp(v, -max_movement_per_round, max_movement_per_round));
            let old_x = p.point.x, old_y = p.point.y;
            p.point.x = clamp(p.point.x + movement[0], p.bounds.x_min, p.bounds.x_max);
            p.point.y = clamp(p.point.y + movement[1], p.bounds.y_min, p.bounds.y_max);
        });
    }
}
function toDisplayPoints(bounds, images) {
    let points = new Array();
    return images.map(i => {
        // Scale image to fit the screen
        const rect = i.img.getBoundingClientRect();
        const width_scale = bounds.width / rect.width;
        const height_scale = bounds.height / rect.height;
        const scale = Math.max(width_scale, height_scale) * 1.1;
        const width_difference = bounds.width - rect.width * scale;
        const height_difference = bounds.height - rect.height * scale;
        const left = width_difference / 2 + bounds.left;
        const top = height_difference / 2 + bounds.top;
        const x = i.point.x * rect.width * scale + left;
        const y = i.point.y * rect.height * scale + top;
        const screen_bounds = new ScreenBounds(Math.max(bounds.left, Math.min(x - width_difference / 2, x + width_difference / 2)), Math.max(bounds.top, Math.min(y - height_difference / 2, y + height_difference / 2)), Math.min(bounds.right, Math.max(x - width_difference / 2, x + width_difference / 2)), Math.min(bounds.bottom, Math.max(y - height_difference / 2, y + height_difference / 2)));
        const display = new ImageDisplay(i.img, left - x, top - y, scale);
        return new MovableImage(display, new ScreenPosition(x, y), screen_bounds, i.weight * scale);
    });
}
let point_to_array_handler = {
    get(target, propKey, receiver) {
        const index = Number(propKey);
        if (index == 0) {
            return target.point.x;
        }
        else if (index == 1) {
            return target.point.y;
        }
        else {
            throw "bad index";
        }
    }
};
class MultiImageMap {
    constructor(container, debug = false) {
        this.container = container;
        this.debug = debug;
        this.touch_opacity = 0;
        this.images = [];
        this.display_points = [];
        this.active_point = null;
        this.last_drawn_image = null;
        this.overlay_canvas = this.container.getElementsByTagName("canvas")[0];
        this.bounds = this.container.getBoundingClientRect();
        this.measure_box = this.container.ownerDocument.getElementById("measure-box");
    }
    render() {
        console.log("rendering");
        this.bounds = this.container.getBoundingClientRect();
        this.overlay_canvas.width = this.bounds.width;
        this.overlay_canvas.height = this.bounds.height;
        this.display_points = toDisplayPoints(this.bounds, this.images);
        this.relaxPoints(40);
    }
    addImage(img, points) {
        const first_index = this.images.length;
        points.forEach(point => this.images.push(new DisplayableImage(img, point.center, point.radius)));
    }
    relaxPoints(iterations = 1) {
        console.log("relaxing with", iterations, "iterations");
        relaxPoints(this.display_points, iterations);
        this.delaunay = d3_delaunay.Delaunay.from(this.display_points.map(p => new Proxy(p, point_to_array_handler)));
        this.redraw(true);
    }
    setTouchOpacity(opacity) {
        this.touch_opacity = opacity;
    }
    redraw(force_redraw = false) {
        if (!this.delaunay || this.images.length == 0) {
            return;
        }
        let context = this.overlay_canvas.getContext("2d");
        const i = this.active_point ? this.delaunay.find(this.active_point.x, this.active_point.y) : 0;
        context.clearRect(0, 0, this.overlay_canvas.width, this.overlay_canvas.height);
        const img = this.display_points[i];
        const box = img.display.img.getBoundingClientRect();
        context.drawImage(img.display.img, img.point.x + img.display.x_offset, img.point.y + img.display.y_offset, box.width * img.display.scale, box.height * img.display.scale);
        this.last_drawn_image = i;
        if (this.active_point != null) {
            context.beginPath();
            const cm_pixels = this.measure_box.getBoundingClientRect().width;
            console.log("width: ", cm_pixels);
            context.arc(this.active_point.x, this.active_point.y, cm_pixels * 1.2, 0, 2 * Math.PI);
            const opacity_suffix = Math.round(this.touch_opacity * 255).toString(16).padStart(2, '0');
            const fill_style = "#bbbbbb" + opacity_suffix;
            context.fillStyle = fill_style;
            context.strokeStyle = "#ffffff" + opacity_suffix;
            context.setLineDash([5, 5]);
            context.lineWidth = cm_pixels * .05;
            context.fill();
            context.stroke();
        }
        if (this.debug) {
            context.beginPath();
            this.delaunay.renderPoints(context);
            context.fill();
            context.beginPath();
            context.strokeStyle = "#ccc";
            this.delaunay.voronoi([0, 0, this.overlay_canvas.width, this.overlay_canvas.height]).render(context);
            context.stroke();
            this.display_points.forEach((i, index) => {
                const rect = i.display.img.getBoundingClientRect();
                context.strokeStyle = "#f004";
                context.beginPath();
                context.arc(i.point.x, i.point.y, i.weight * Math.max(rect.width, rect.height), 0, 2 * Math.PI);
                context.stroke();
                if (index == this.last_drawn_image) {
                    context.fillStyle = "#f004";
                    context.beginPath();
                    context.arc(i.point.x, i.point.y, i.weight * Math.max(rect.width, rect.height), 0, 2 * Math.PI);
                    context.fill();
                }
            });
        }
    }
}
class ImageLoader {
    constructor(document) {
        this.document = document;
    }
    loadImage(src, high_res_src, onLoad, onHighResLoad) {
        let img = this.document.createElement("img");
        let finishLowResLoad = () => {
            console.log("finished first load of", img);
            onLoad();
            img.removeEventListener("load", finishLowResLoad);
            this.loadHighRes(img, high_res_src, onHighResLoad);
        };
        img.addEventListener("load", finishLowResLoad);
        img.src = src;
        return img;
    }
    loadHighRes(img, high_res_src, onLoad) {
        let high_res = this.document.createElement("img");
        let finishHighResLoad = () => {
            img.src = high_res.src;
            high_res.removeEventListener("load", finishHighResLoad);
            onLoad();
        };
        high_res.addEventListener("load", finishHighResLoad);
        high_res.src = high_res_src;
    }
}
class FixedTimeEvent {
    constructor(interval, callback) {
        this.interval = interval;
        this.callback = callback;
        this.timeout_handle = null;
    }
    start() {
        if (this.timeout_handle != null) {
            return;
        }
        this.timeout_handle = setInterval(() => this.onEvent(), this.interval * 1000);
    }
    onEvent() {
        if (!this.callback()) {
            clearInterval(this.timeout_handle);
        }
    }
}
function displayImages(images, container) {
    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.get("debug") == "on";
    let map = new MultiImageMap(container, debug);
    let loadedCount = 0;
    let loaded_msg = document.getElementById("loading").getElementsByTagName("span")[0];
    let touchOpacity = 0.5;
    let reduceTouchOpacity = () => {
        map.setTouchOpacity(touchOpacity);
        touchOpacity -= 0.02;
        if (touchOpacity > 0) {
            map.redraw();
            return true;
        }
        return false;
    };
    let lower_opacity = new FixedTimeEvent(0.2, reduceTouchOpacity);
    map.setTouchOpacity(touchOpacity);
    function onInteraction(x, y) {
        map.active_point = new ScreenPosition(x, y);
        map.redraw();
        lower_opacity.start();
    }
    function onLoadImage() {
        ++loadedCount;
        loaded_msg.innerHTML = `loaded ${loadedCount} of ${images.length}`;
        if (loadedCount == images.length) {
            map.render();
            map.overlay_canvas.addEventListener("touchmove", event => {
                event.preventDefault();
                onInteraction(event.touches[0].clientX, event.touches[0].clientY);
            });
            map.overlay_canvas.addEventListener("mousemove", event => {
                onInteraction(event.clientX, event.clientY);
            });
            window.addEventListener("resize", () => {
                map.active_point = null;
                map.render();
            });
            if (debug) {
                window.addEventListener("click", () => {
                    map.relaxPoints();
                    map.redraw();
                });
            }
        }
    }
    let loader = new ImageLoader(container.ownerDocument);
    images.forEach(image => {
        let img = loader.loadImage("images/low." + image.src, "images/" + image.src, () => {
            onLoadImage();
            map.addImage(img, image.points);
        }, () => { map.redraw(true); });
        img.classList.add("load-image");
        container.appendChild(img);
        img.addEventListener("error", () => {
            loadedCount++;
            onLoadImage();
        });
    });
}
window.addEventListener("load", event => {
    fetch("images/images.json").then(value => value.json()).then(parseImagesResponse).then(images => displayImages(images, document.getElementById("map")));
});
//# sourceMappingURL=map.js.map