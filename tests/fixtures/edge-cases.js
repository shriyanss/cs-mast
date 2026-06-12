// No-initializer variable
let x;
const y = undefined;

// Unary operators
const neg = -5;
const notFlag = !true;
let z = 0;
z++;
++z;
z--;

// Ternary
const result = x > 0 ? "positive" : "non-positive";

// Regex
const pattern = /hello/gi;
const pattern2 = /world/gi;

// BigInt
const big = 9007199254740993n;

// Switch
switch (z) {
    case 0:
        break;
    case 1:
        break;
    default:
        break;
}

// Empty function
function noop() {}

// Class without superclass
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
