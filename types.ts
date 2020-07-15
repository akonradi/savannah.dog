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

export class MappedImage {
    constructor(public src: string, public points: Array<Point>) {}
}

export function parsePoint(point: object): Point {
    return new Point(point["x"], point["y"]);
}

export async function parseImagesResponse(response_obj: object): Promise<Array<MappedImage>> {
    let mapped_images = new Array<MappedImage>();
    let response_images: Array<object> = response_obj["images"];
    response_images.forEach((image: object) => {
        const src: string = image["src"];
        const points: Array<Point> = (image["points"] || []).map(parsePoint);
        mapped_images.push(new MappedImage(src, points));
    });
    return mapped_images;
}
