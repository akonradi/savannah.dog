export class Point {
    constructor(public x: number, public y: number) {
        if (x < 0 || x > 1) {
            throw `x out of bounds: ${x}`;
        }
        if (y < 0 || y > 1) {
            throw `x out of bounds: ${y}`;
        }
    }
}

export class Circle {
    constructor(public center: Point, public radius: number) { }
}

export class MappedImage {
    constructor(public src: string, public points: Array<Circle>) { }
}

export function parsePoint(point: object): Point {
    return new Point(point["x"], point["y"]);
}

export function parseCircle(circle: object): Circle {
    let point = (circle["center"] != undefined) ?
        parsePoint(circle["center"]) : parsePoint(circle);
    return new Circle(point, circle["radius"] || 0.05);
}

export async function parseImagesResponse(response_obj: object): Promise<Array<MappedImage>> {
    let mapped_images = new Array<MappedImage>();
    let response_images: Array<object> = response_obj["images"];
    response_images.forEach((image: object) => {
        const src: string = image["src"];
        const points: Array<Circle> = (image["points"] || []).map(parseCircle);
        mapped_images.push(new MappedImage(src, points));
    });
    return mapped_images;
}
