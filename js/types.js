var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        if (x < 0 || x > 1) {
            throw `x out of bounds: ${x}`;
        }
        if (y < 0 || y > 1) {
            throw `x out of bounds: ${y}`;
        }
    }
}
export class Circle {
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
}
export class MappedImage {
    constructor(src, points) {
        this.src = src;
        this.points = points;
    }
}
export function parsePoint(point) {
    return new Point(point["x"], point["y"]);
}
export function parseCircle(circle) {
    let point = (circle["center"] != undefined) ?
        parsePoint(circle["center"]) : parsePoint(circle);
    return new Circle(point, circle["radius"] || 0.05);
}
export function parseImagesResponse(response_obj) {
    return __awaiter(this, void 0, void 0, function* () {
        let mapped_images = new Array();
        let response_images = response_obj["images"];
        response_images.forEach((image) => {
            const src = image["src"];
            const points = (image["points"] || []).map(parseCircle);
            mapped_images.push(new MappedImage(src, points));
        });
        return mapped_images;
    });
}
//# sourceMappingURL=types.js.map