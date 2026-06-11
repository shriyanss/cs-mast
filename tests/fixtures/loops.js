for (let i = 0; i < 10; i++) {
  console.log(i);
}

while (true) {
  break;
}

do {
  let x = 1;
} while (false);

const obj = { a: 1, b: 2 };
for (const key in obj) {
  console.log(key);
}

const arr = [1, 2, 3];
for (const val of arr) {
  console.log(val);
}
