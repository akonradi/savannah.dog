import { parseImagesResponse, Circle, Point } from "./types.js";
class EditImage {
    constructor(image, parent) {
        this.image = image;
        this.div = parent.ownerDocument.createElement("div");
        parent.appendChild(this.div);
        this.img = parent.ownerDocument.createElement("img");
        this.div.appendChild(this.img);
        this.img.classList.add("select");
        this.img.src = "images/" + image.src;
        this.image.points.forEach(point => this.addDot(point));
        let drag = null;
        this.img.addEventListener("mousedown", (event) => {
            const rect = this.img.getBoundingClientRect();
            const startX = event.clientX - rect.x;
            const startY = event.clientY - rect.y;
            console.log("start drag at ", startX, startY);
            drag = [new Point(startX / rect.width, startY / rect.height), rect];
            event.preventDefault();
        });
        this.img.addEventListener("mouseup", event => {
            if (drag == null) {
                return;
            }
            const start = drag[0];
            const rect = drag[1];
            const finishX = event.clientX - rect.x;
            const finishY = event.clientY - rect.y;
            const finish = new Point(finishX / rect.width, finishY / rect.height);
            const radius = Math.sqrt(Math.pow(finish.x - start.x, 2) + Math.pow(finish.y - start.y, 2));
            if (radius > 0.001) {
                let circle = new Circle(drag[0], radius);
                console.log("finish drag at ", finishX, finishY, "with radius", circle.radius);
                this.addDot(circle);
                this.image.points.push(circle);
            }
            drag = null;
            event.preventDefault();
        });
        this.img.addEventListener("mouseleave", (event) => {
            drag = null;
        });
    }
    addDot(circle) {
        let dot = document.createElement("div");
        dot.classList.add("dot");
        dot.style.left = `${circle.center.x * 100}%`;
        dot.style.top = `${circle.center.y * 100}%`;
        dot.style.width = `${circle.radius * 100 * 2}%`;
        dot.style.height = `${circle.radius * 100 * 2}%`;
        dot.style.marginLeft = `-${circle.radius * 100}%`;
        dot.style.marginTop = `-${circle.radius * 100}%`;
        this.div.appendChild(dot);
        dot.addEventListener("click", event => {
            const index = this.image.points.indexOf(circle);
            if (index != -1) {
                this.image.points.splice(index, 1);
            }
            else {
                console.log("Couldn't find point", circle, "for", this.image.src);
            }
            this.div.removeChild(dot);
        });
    }
}
function loadImages(images, container) {
    container.childNodes.forEach(container.removeChild);
    images.forEach(image => new EditImage(image, container));
}
function outputJson(images, output) {
    output.innerHTML = "<textarea>" + JSON.stringify({ "images": images }, null, 2) + "</textarea>";
}
function filterImages(images) {
    let srcs = new Set();
    let new_images = [];
    images.forEach(image => {
        if (srcs.has(image.src)) {
            return;
        }
        new_images.push(image);
        srcs.add(image.src);
    });
    return new_images;
}
window.addEventListener("load", (ev) => {
    console.log("on window load");
    fetch("images/images.json").then(response => response.json())
        .then(parseImagesResponse)
        .then(filterImages)
        .then(images => {
        loadImages(images, document.getElementById("image-select"));
        document.getElementById("output").addEventListener("click", function (event) { outputJson(images, this); });
    });
});
//# sourceMappingURL=editor.js.map