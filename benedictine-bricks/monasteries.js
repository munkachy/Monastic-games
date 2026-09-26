// Benedictine Bricks — the monasteries you build on.
//
// Each monastery is drawn with simple shapes in units of one stone (T world
// pixels). The origin is the centre of the building's top, where you build;
// y grows downward, and the ground is 12.5 stones below the top.
//
// Only the flat tops listed in game.js (WORLDS[].base) are solid. Anything
// drawn above the top, or to the side of the solid parts, is scenery behind
// the tower, and stones pass in front of it.

const MONASTERY_T = 24;

const MonasteryArt = (() => {
  const T = MONASTERY_T;

  function box(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x * T), Math.round(y * T), Math.round(w * T), Math.round(h * T));
  }

  // A wall with courses of stone.
  function masonry(c, x, y, w, h, color, line) {
    box(c, x, y, w, h, color);
    c.fillStyle = line;
    for (let row = 0; row * 0.5 < h; row++) {
      const yy = Math.round((y + row * 0.5) * T);
      c.fillRect(Math.round(x * T), yy, Math.round(w * T), 2);
      const offset = row % 2 ? 0.5 : 0;
      for (let xx = x + offset + 0.5; xx < x + w; xx += 1) {
        c.fillRect(Math.round(xx * T), yy, 2, Math.round(0.5 * T));
      }
    }
  }

  function poly(c, points, color) {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x * T, y * T) : c.moveTo(x * T, y * T)));
    c.closePath();
    c.fill();
  }

  function disc(c, x, y, r, color) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x * T, y * T, r * T, 0, Math.PI * 2);
    c.fill();
  }

  // A round-headed window or doorway.
  function arch(c, x, y, w, h, color) {
    box(c, x, y + w / 2, w, h - w / 2, color);
    c.fillStyle = color;
    c.beginPath();
    c.arc((x + w / 2) * T, (y + w / 2) * T, (w / 2) * T, Math.PI, 0);
    c.fill();
  }

  // A pointed Gothic window.
  function lancet(c, x, y, w, h, color) {
    box(c, x, y + w * 0.8, w, h - w * 0.8, color);
    poly(c, [[x, y + w * 0.8], [x + w / 2, y], [x + w, y + w * 0.8]], color);
  }

  function water(c, y, color, light) {
    box(c, -40, y, 80, 4, color);
    c.fillStyle = light;
    for (let x = -40; x < 40; x += 1.5) c.fillRect(Math.round(x * T), Math.round((y + 0.4 + (x % 3 === 0 ? 0.3 : 0)) * T), Math.round(0.6 * T), 3);
  }

  // St. Bernard Abbey, Cullman, Alabama: the abbey church, a great square
  // block of rough sandstone quarried on the monastery's own land, with one
  // tall window of gold-tinted panes over the door. Low college buildings and
  // trees stand beside it.
  function stbernard(c) {
    for (const [x0, x1] of [[-17, -4.6], [4.6, 17]]) {
      box(c, x0, 8.6, x1 - x0, 3.9, "#d8b48a");
      box(c, x0, 8.3, x1 - x0, 0.35, "#9aa0a8");
      for (let x = x0 + 0.6; x < x1 - 0.8; x += 1.5) box(c, x, 9.6, 0.7, 1.4, "#4a5a6a");
    }
    for (const [x, y, r] of [[-12, 6.4, 2.2], [-8.6, 5.8, 2.6], [8.4, 6, 2.4], [12.4, 6.6, 2.1], [15.6, 7.2, 1.8]]) {
      box(c, x - 0.25, y, 0.5, 12.5 - y, "#6a4a2a");
      disc(c, x, y, r, "#4f8a3a");
      disc(c, x - r * 0.4, y + r * 0.2, r * 0.7, "#5f9a45");
    }
    // Rough coursed sandstone: rows of blocks of uneven size and colour.
    const tones = ["#b8955e", "#a88450", "#c9a86e", "#967244", "#bf9a62"];
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < 12.5;) {
      const h = 0.35 + rnd() * 0.3;
      for (let x = -4; x < 4;) {
        const w = Math.min(0.6 + rnd() * 0.9, 4 - x);
        box(c, x, y, w, Math.min(h, 12.5 - y), tones[Math.floor(rnd() * tones.length)]);
        x += w;
      }
      y += h;
    }
    c.fillStyle = "rgba(60,40,20,0.35)";
    for (let y = 0; y < 12.5; y += 0.5) c.fillRect(-4 * T, Math.round(y * T), 8 * T, 1);
    box(c, -4, 0, 8, 0.3, "#d8c8a0");
    // The tall window over the door: a grid of gold-tinted panes.
    box(c, -1.5, 1.6, 3, 8.4, "#6a5236");
    box(c, -1.3, 1.8, 2.6, 8, "#f2e2a8");
    c.fillStyle = "#8a8a88";
    for (let i = 0; i <= 5; i++) c.fillRect(Math.round((-1.3 + i * 0.52) * T), Math.round(1.8 * T), 2, Math.round(8 * T));
    for (let j = 0; j <= 12; j++) c.fillRect(Math.round(-1.3 * T), Math.round((1.8 + j * 0.667) * T), Math.round(2.6 * T), 2);
    box(c, -0.9, 10.4, 1.8, 2.1, "#3a2a1e");
  }

  // Subiaco: the Sacro Speco, built into the cliff around Benedict's cave.
  function subiaco(c) {
    poly(c, [[3, 13], [3.6, 3], [5, -4], [9, -8], [13, -7.5], [16, -3], [17, 13]], "#8a7a68");
    poly(c, [[6, 13], [7, 0], [9.5, -6], [11, 13]], "#7a6a58");
    for (const [x, y, r] of [[8.8, -8.4, 1.2], [10.6, -8.2, 1.4], [12.8, -8, 1.2], [14.6, -6.2, 1.1]]) disc(c, x, y, r, "#4f8a5a");
    masonry(c, -3.5, 0, 7, 12.5, "#d9c49c", "#bfa97f");
    box(c, -3.5, 0, 7, 0.35, "#a8583a");
    for (let i = 0; i < 5; i++) arch(c, -3.1 + i * 1.35, 1.1, 0.9, 1.6, "#5a3a2a");
    for (let i = 0; i < 4; i++) arch(c, -2.7 + i * 1.6, 4, 0.6, 1.1, "#5a3a2a");
    for (let i = 0; i < 3; i++) arch(c, -2.2 + i * 1.7, 6.2, 0.6, 1.1, "#5a3a2a");
    for (let i = 0; i < 3; i++) arch(c, -3 + i * 2.2, 8.8, 1.6, 3.7, "#4a3426");
  }

  // Monte Cassino: the abbey on its mountain, two wings about the cloister.
  function montecassino(c) {
    poly(c, [[-20, 13], [-7, 3], [0, 2], [7, 3], [20, 13]], "#7f8f78");
    poly(c, [[-20, 13], [-10, 7], [-4, 9], [0, 7.5], [5, 9], [11, 7], [20, 13]], "#6f7f68");
    box(c, -1.5, 2.6, 3, 10, "#d6cdb9");
    disc(c, 0, 2.7, 1.1, "#8e9ca6");
    box(c, -0.1, 1.1, 0.2, 0.5, "#e0b030");
    arch(c, -0.5, 4.5, 1, 1.8, "#4a4050");
    for (const x0 of [-5.5, 1.5]) {
      masonry(c, x0, 0, 4, 8.6, "#efe7d6", "#d8cfbd");
      box(c, x0, 0, 4, 0.4, "#b0503a");
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) box(c, x0 + 0.55 + col * 1.2, 1.2 + row * 1.8, 0.5, 0.9, "#3a3a48");
      }
      masonry(c, x0, 8.6, 4, 3.9, "#8a8a7a", "#76766a");
    }
  }

  // Cluny: the octagonal bell tower that still stands, and the great nave behind it.
  function cluny(c) {
    masonry(c, -15, 5.6, 30, 7, "#a8a090", "#968e7e");
    poly(c, [[-15.5, 5.7], [-14, 3.6], [14, 3.6], [15.5, 5.7]], "#4a5060");
    for (let x = -13.5; x < 13; x += 2.2) if (Math.abs(x) > 3) arch(c, x, 7.4, 0.7, 1.5, "#4a4450");
    masonry(c, -2.5, 0, 5, 12.5, "#c8bca8", "#ada18d");
    box(c, -2.5, 0, 0.8, 12.5, "rgba(0,0,0,0.12)");
    box(c, 1.7, 0, 0.8, 12.5, "rgba(0,0,0,0.12)");
    for (const y of [0, 3.3, 6.6]) box(c, -2.5, y, 5, 0.35, "#8e8272");
    for (const x of [-1.7, -0.75, 0.25, 1.2]) arch(c, x, 0.8, 0.55, 1.9, "#3a3440");
    for (const x of [-1.7, -0.75, 0.25, 1.2]) arch(c, x, 4.1, 0.55, 1.8, "#3a3440");
    for (const x of [-1.2, 0.7]) arch(c, x, 7.4, 0.5, 1.4, "#3a3440");
  }

  // Melk: the Baroque abbey above the Danube, with its green-domed towers.
  function melk(c) {
    for (const x0 of [-6.3, 4.3]) {
      box(c, x0, -4, 2, 16.5, "#e8b83c");
      box(c, x0, -4, 0.2, 16.5, "#fff4d8");
      box(c, x0 + 1.8, -4, 0.2, 16.5, "#fff4d8");
      for (const y of [-2.5, 0.5, 3.5]) arch(c, x0 + 0.6, y, 0.8, 1.6, "#6a5a4a");
      disc(c, x0 + 1, -4, 1.15, "#3f9a72");
      box(c, x0 + 0.75, -6.2, 0.5, 1.2, "#3f9a72");
      disc(c, x0 + 1, -6.4, 0.35, "#3f9a72");
      box(c, x0 + 0.93, -7.4, 0.14, 0.8, "#f0c030");
      box(c, x0 + 0.75, -7.1, 0.5, 0.12, "#f0c030");
    }
    box(c, -4, 0, 8, 9, "#f2c64a");
    box(c, -4, 0, 8, 0.4, "#fff4d8");
    for (const x of [-3.9, -1.35, 1.1, 3.65]) box(c, x, 0.4, 0.25, 8.6, "#fff4d8");
    for (let row = 0; row < 3; row++) {
      for (const x of [-3.2, -2.3, 1.7, 2.6]) {
        box(c, x - 0.08, 1.4 + row * 2.4 - 0.08, 0.56, 1.16, "#fff4d8");
        box(c, x, 1.4 + row * 2.4, 0.4, 1, "#6a5a4a");
      }
    }
    arch(c, -0.6, 1.2, 1.2, 2.4, "#6a5a4a");
    arch(c, -0.5, 5.6, 1, 2.2, "#6a5a4a");
    masonry(c, -4, 9, 8, 3.5, "#a8987c", "#948468");
    water(c, 12.4, "#4a8ac8", "#8ac4ee");
  }

  // Mont-Saint-Michel: the abbey on its rock in the bay, with the spire and St. Michael.
  function montsaintmichel(c) {
    poly(c, [[-16, 12.5], [-9, 7.5], [-5, 4], [5, 4], [10, 7.5], [17, 12.5]], "#9a9080");
    for (const [x, y] of [[-9, 8.6], [-7.2, 7.2], [6, 7], [8, 8.4], [-11.5, 10.2], [11, 10]]) {
      box(c, x, y, 1.4, 1.2, "#c8bca8");
      poly(c, [[x - 0.1, y], [x + 0.7, y - 0.8], [x + 1.5, y]], "#5a6070");
    }
    box(c, -16, 11, 33, 1.5, "#8a8272");
    for (let x = -16; x < 17; x += 1) box(c, x, 10.6, 0.5, 0.4, "#8a8272");
    masonry(c, -6, 2.2, 12, 3, "#a8a090", "#968e7e");
    for (const x of [-5, -3.6, 3.1, 4.5]) lancet(c, x, 2.7, 0.5, 1.6, "#3a3a48");
    poly(c, [[-0.7, 0], [0, -9], [0.7, 0]], "#5a6070");
    box(c, -0.15, -9.9, 0.3, 0.9, "#f0c030");
    poly(c, [[-0.15, -9.6], [-0.7, -9.3], [-0.15, -9.3]], "#f0c030");
    masonry(c, -2, 0, 4, 9, "#b8b0a0", "#a09888");
    for (const x of [-1.4, 0.6]) lancet(c, x, 1, 0.8, 2.6, "#3a3a48");
    lancet(c, -0.4, 4.8, 0.8, 2.2, "#3a3a48");
    masonry(c, -2, 9, 4, 3.5, "#9a9080", "#88806f");
    water(c, 12.3, "#5a9ac8", "#9ad0f0");
  }

  // Montserrat: the basilica among the saw-toothed peaks.
  function montserrat(c) {
    // The saw-toothed ridge: rounded towers of conglomerate rock, the far
    // ones paler with distance.
    const peaks = [
      [-16, 3.4, 4, 0], [-12.8, 2.6, 9, 1], [-10.4, 3, 6, 0], [-7.6, 2.4, 11, 1], [-5.3, 2.8, 7, 0],
      [5.2, 2.6, 8, 0], [7.6, 3.2, 12, 1], [10.6, 2.4, 7, 0], [12.8, 3, 10, 1], [15.6, 3.4, 5, 0],
      [-3, 2.2, 13, 2], [3, 2.4, 12, 2], [-0.4, 2.6, 15, 3],
    ];
    peaks.sort((a, b) => b[3] - a[3]); // farthest first
    for (const [x, w, h, far] of peaks) {
      const color = ["#c49c82", "#b58a70", "#d4b8a4", "#dcc6b6"][far];
      const shade = ["#a8806a", "#9a725c", "#c0a28e", "#cab2a0"][far];
      box(c, x, -h + w / 2, w, 14 + h, color);
      disc(c, x + w / 2, -h + w / 2, w / 2, color);
      box(c, x, -h + w / 2, w * 0.25, 14 + h, shade);
      for (let y = -h + w; y < 12; y += 1.7) box(c, x + w * 0.4, y, w * 0.35, 0.12, shade);
    }
    masonry(c, -5, 1, 3, 11.5, "#d8ceb8", "#c2b8a2");
    for (let i = 0; i < 3; i++) arch(c, -4.7 + i * 0.95, 2, 0.6, 1.4, "#5a4a4a");
    for (let i = 0; i < 3; i++) arch(c, -4.7 + i * 0.95, 5, 0.6, 1.4, "#5a4a4a");
    masonry(c, -2, 0, 6, 12.5, "#e4dccb", "#cbc3b1");
    box(c, -2, 0, 6, 0.35, "#9a8a78");
    disc(c, 1, 2.4, 1, "#6a4a5a");
    disc(c, 1, 2.4, 0.55, "#c86a8a");
    disc(c, 1, 2.4, 0.2, "#f0c030");
    for (const x of [-1.2, 0.45, 2.1]) arch(c, x, 7.6, 1.1, 3.2, "#4a3a3a");
    for (const x of [-1.4, 3]) arch(c, x, 4.3, 0.5, 1.4, "#4a3a3a");
  }

  return { stbernard, subiaco, montecassino, cluny, melk, montsaintmichel, montserrat };
})();
