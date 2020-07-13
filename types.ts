class Point {
    constructor(public x: number, public y: number) {
        if (x < 0 || x > 1) {
            throw `x out of bounds: ${x}`;
        }
        if (y < 0 || y > 1) {
            throw `x out of bounds: ${y}`;
        }
    }
}

class MappedImage {
    constructor(public src: string, public points: Array<Point>) {}
}
