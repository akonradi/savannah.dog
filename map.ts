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
        console.log("Drawing ", this);
        let m = this.overlay_map;
        m.childNodes.forEach(child => m.removeChild(child));

        this.getDisplayPoints().forEach(point => {
            let area = this.container.ownerDocument.createElement("area");
            area.addEventListener("mouseenter", () => {
                console.log("enter", point.img);
                point.img.classList.add("show");
            });
            area.addEventListener("mouseleave", () => {
                console.log("leave", point.img);
                point.img.classList.remove("show");
            });

            area.shape = "circle";
            area.coords = `${point.x},${point.y},100`;

            this.overlay_map.appendChild(area);
        })
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