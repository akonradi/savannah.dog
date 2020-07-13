class EditImage {
    img: HTMLImageElement;
    div: HTMLDivElement;
    constructor(public image: MappedImage, parent: HTMLElement) {
        this.div = parent.ownerDocument.createElement("div");
        parent.appendChild(this.div);

        this.img = parent.ownerDocument.createElement("img");
        this.div.appendChild(this.img);
        this.img.classList.add("select");
        this.img.src = "images/" + image.src;

        this.image.points.forEach(point => this.addDot(point))

        this.img.addEventListener("click", event => {
            const rect = this.img.getBoundingClientRect();
            const x = event.clientX - rect.x;
            const y = event.clientY - rect.y;

            let point = new Point(x / rect.width, y / rect.height);
            this.addDot(point);

            this.image.points.push(point);
        });
    }

    addDot(point: Point) {
        let dot = document.createElement("div");
        dot.classList.add("dot");
        dot.style.left = `${point.x * 100}%`;
        dot.style.top = `${point.y * 100}%`;
        this.div.appendChild(dot);

        let editImage = this;
        dot.addEventListener("click", function (event) {
            editImage.image.points.splice(editImage.image.points.indexOf(point), 1);
            editImage.div.removeChild(this);
        });
    }
}

function loadImages(images: Array<MappedImage>, container: HTMLElement) {
    container.childNodes.forEach(container.removeChild);
    images.forEach(image => new EditImage(image, container));
}

function outputJson(images: Array<MappedImage>, output: HTMLElement) {
    output.innerHTML = "<textarea>" + JSON.stringify({ "images": images }, null, 2) + "</textarea>";
}

window.addEventListener("load", (ev) => {
    console.log("on window load");

    fetch("images/images.json").then(response => response.json())
        .then(parseImagesResponse)
        .then(images => {
            loadImages(images, document.getElementById("image-select"));
            document.getElementById("output").addEventListener("click", function (event) { outputJson(images, this); });
        });
})