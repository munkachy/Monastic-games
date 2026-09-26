// New Apologetics — pixel portraits.
//
// Every character is built from one recipe: a 32×32 bust (head, hair, beard,
// glasses, clothes and a prop) so the whole cast shares one style. The same
// recipe draws the 48×48 "Camera Mog" close-up, and the full-length figures
// (40×52, with walking and reaching poses) that act out the moves in battle.

const Art = (() => {
  const OUTLINE = "#1a1326";

  function grid(w, h) {
    const cells = Array.from({ length: h }, () => Array(w).fill(null));
    return {
      w, h, cells,
      put(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) cells[y][x] = c; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? cells[y][x] : null; },
    };
  }

  // Draw a dark edge around every filled shape, as hand-made pixel art has.
  function outline(g) {
    const edge = [];
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        if (g.get(x, y)) continue;
        const solid = (c) => c && c !== OUTLINE;
        if (solid(g.get(x - 1, y)) || solid(g.get(x + 1, y)) || solid(g.get(x, y - 1)) || solid(g.get(x, y + 1))) edge.push([x, y]);
      }
    }
    for (const [x, y] of edge) g.put(x, y, OUTLINE);
  }

  const inEllipse = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

  // ---- The bust --------------------------------------------------------------

  function bust(s) {
    const g = grid(32, 32);
    const hair = s.hair || "#3a2618";
    const beard = s.beardColor || hair;

    // Shoulders and clothes.
    for (let y = 23; y < 32; y++) {
      const half = Math.min(15, 7 + (y - 23) * 1.4);
      for (let x = Math.floor(16 - half); x < Math.ceil(16 + half); x++) g.put(x, y, s.clothes);
    }
    // Neck.
    for (let y = 19; y < 24; y++) for (let x = 13; x < 19; x++) g.put(x, y, s.shade);

    if (s.outfit === "suit" || s.outfit === "whiteshirt") {
      const shirt = s.outfit === "suit" ? "#f2efe6" : "#f7f5ee";
      if (s.outfit === "whiteshirt") {
        for (let y = 23; y < 32; y++) {
          const half = Math.min(15, 7 + (y - 23) * 1.4);
          for (let x = Math.floor(16 - half); x < Math.ceil(16 + half); x++) g.put(x, y, shirt);
        }
        for (let y = 24; y < 32; y++) { g.put(9, y, "#d9d4c8"); g.put(22, y, "#d9d4c8"); }
      } else {
        for (let y = 23; y < 30; y++) {
          const half = Math.max(0, 3 - Math.floor((y - 23) / 2.4));
          for (let x = 16 - half - 1; x < 16 + half + 1; x++) g.put(x, y, shirt);
        }
        for (let y = 24; y < 32; y++) { g.put(11 + Math.floor((y - 24) / 3), y, s.lapel || "#1b2033"); g.put(20 - Math.floor((y - 24) / 3), y, s.lapel || "#1b2033"); }
      }
      if (s.tie) for (let y = 24; y < 32; y++) { g.put(15, y, s.tie); g.put(16, y, s.tie); }
    } else if (s.outfit === "sweater") {
      for (let x = 12; x < 20; x++) { g.put(x, 23, s.trim || "#e9e2d0"); }
      for (let x = 11; x < 21; x++) g.put(x, 24, s.trimDark || s.clothes);
    } else if (s.outfit === "hoodie") {
      for (let y = 21; y < 26; y++) { g.put(10, y, s.trim); g.put(11, y, s.trim); g.put(20, y, s.trim); g.put(21, y, s.trim); }
      for (let y = 25; y < 31; y++) { g.put(14, y, "#e9e2d0"); g.put(18, y, "#e9e2d0"); }
    } else if (s.outfit === "shirt") {
      g.put(13, 23, s.trim || "#e9e2d0"); g.put(12, 24, s.trim || "#e9e2d0");
      g.put(18, 23, s.trim || "#e9e2d0"); g.put(19, 24, s.trim || "#e9e2d0");
      for (let y = 25; y < 32; y += 2) g.put(16, y, s.trim || "#e9e2d0");
    } else if (s.outfit === "clerical") {
      g.put(15, 23, "#f7f5ee"); g.put(16, 23, "#f7f5ee");
    } else if (s.outfit === "habit" || s.outfit === "dominican") {
      // A monk's hood lies in folds around the neck.
      for (let y = 21; y < 27; y++) { g.put(9, y, s.trim); g.put(10, y, s.trim); g.put(21, y, s.trim); g.put(22, y, s.trim); }
      for (let x = 11; x < 21; x++) g.put(x, 26, s.trim);
      if (s.outfit === "dominican") {
        // The black cappa over the white habit.
        for (let y = 25; y < 32; y++) {
          const half = Math.min(15, 7 + (y - 23) * 1.4);
          for (let x = Math.floor(16 - half); x < Math.ceil(16 + half); x++) if (x < 8 || x > 23) g.put(x, y, "#1d1d24");
        }
      }
    } else if (s.outfit === "sisters") {
      // A white habit under a dark blue scapular.
      for (let y = 23; y < 32; y++) for (let x = 12; x < 20; x++) g.put(x, y, s.trim);
    } else if (s.outfit === "blouse") {
      for (let y = 23; y < 26; y++) for (let x = 14 - (y - 23); x < 18 + (y - 23); x++) g.put(x, y, s.skin);
    } else if (s.outfit === "thobe") {
      for (let y = 23; y < 32; y++) g.put(16, y, s.trim);
    }
    if (s.prop === "cross") {
      for (let y = 25; y < 31; y++) g.put(16, y, "#e8b94a");
      for (let x = 14; x < 19; x++) g.put(x, 27, "#e8b94a");
    }
    if (s.prop === "nametag") for (let x = 18; x < 22; x++) { g.put(x, 26, "#15151a"); g.put(x, 27, "#15151a"); }

    // Long hair or a veil falls behind the head and over the shoulders.
    const style = s.style || "short";
    if (style === "long" || style === "veil") {
      const c = style === "veil" ? s.veil : s.hair;
      for (let y = 2; y < (style === "veil" ? 29 : 28); y++) {
        for (let x = 5; x < 27; x++) {
          const w = y < 12 ? 9.4 : 9.4 + (y - 12) * 0.12;
          if (y >= 19 && x > 10 && x < 21) continue;   // the face and neck stay clear
          if (Math.abs(x + 0.5 - 16) <= w && inEllipse(x, Math.min(y, 13), 16, 12.5, 9.6, 11)) g.put(x, y, c);
        }
      }
      if (style === "veil") for (let y = 20; y < 29; y++) { g.put(6, y, s.veilTrim); g.put(25, y, s.veilTrim); }
    }

    // Head, ears and a little shading on the far cheek.
    for (let y = 2; y < 23; y++) {
      for (let x = 6; x < 26; x++) {
        if (!inEllipse(x, y, 16, 12.5, 7.6, 9.6)) continue;
        const rim = ((x + 0.5 - 16) / 7.6) ** 2 + ((y + 0.5 - 12.5) / 9.6) ** 2;
        g.put(x, y, rim > 0.62 && x > 17 ? s.shade : s.skin);
      }
    }
    for (let y = 11; y < 15; y++) { g.put(7, y, s.skin); g.put(24, y, s.shade); }
    g.put(7, 12, s.shade);

    // Hair.
    if (style === "short" || style === "long" || style === "side" || style === "crew" || style === "curly") {
      const top = style === "crew" ? 5 : style === "curly" ? 7 : 6;
      for (let y = 1; y <= top; y++) {
        for (let x = 6; x < 26; x++) {
          if (inEllipse(x, y, 16, 12.5, 8.3, 10.6)) g.put(x, y, hair);
        }
      }
      for (let y = top + 1; y < 11; y++) { g.put(8, y, hair); g.put(23, y, hair); }
      if (style === "long") { for (let x = 9; x < 15; x++) g.put(x, 7, hair); g.put(9, 8, hair); }
      if (style === "side") {
        for (let x = 9; x < 18; x++) g.put(x, 7, hair);
        g.put(9, 8, hair); g.put(10, 8, hair);
        g.put(20, 3, s.hairLight || hair);
        g.put(12, 2, s.skin);
      }
      if (style === "curly") {
        for (const [x, y] of [[7, 5], [24, 5], [10, 8], [13, 8], [19, 8], [22, 8], [9, 2], [22, 2]]) g.put(x, y, hair);
      }
      if (s.hairLight) for (const [x, y] of [[13, 2], [14, 2], [15, 3]]) g.put(x, y, s.hairLight);
    } else if (style === "receding") {
      for (let y = 2; y < 12; y++) {
        for (let x = 6; x < 26; x++) {
          if (!inEllipse(x, y, 16, 12.5, 8.3, 10.6)) continue;
          if (x <= 9 || x >= 22 || y <= 2) g.put(x, y, hair);
        }
      }
      for (const [x, y] of [[13, 4], [14, 4]]) g.put(x, y, s.shine || "#fff1e0");
    } else if (style === "bald") {
      for (const [x, y] of [[12, 4], [13, 4], [12, 5], [11, 6]]) g.put(x, y, s.shine || "#fff1e0");
      for (let y = 9; y < 13; y++) { g.put(8, y, s.shade); g.put(23, y, s.shade); }
    } else if (style === "veil") {
      // The veil covers the hair; a band crosses the forehead.
      for (let y = 1; y < 7; y++) {
        for (let x = 6; x < 26; x++) if (inEllipse(x, y, 16, 12.5, 8.8, 11.4)) g.put(x, y, s.veil);
      }
      for (let x = 8; x < 24; x++) g.put(x, 6, s.veilTrim);
      for (let y = 7; y < 20; y++) { g.put(7, y, s.veil); g.put(8, y, s.veilTrim); g.put(23, y, s.veilTrim); g.put(24, y, s.veil); }
    } else if (style === "zucchetto") {
      for (let y = 9; y < 13; y++) { g.put(8, y, s.hair); g.put(23, y, s.hair); }
      for (let y = 1; y < 4; y++) for (let x = 11; x < 21; x++) if (inEllipse(x, y, 16, 4, 5.2, 3.2)) g.put(x, y, s.cap);
      g.put(16, 0, s.cap);
      for (const [x, y] of [[11, 6], [12, 6], [11, 7]]) g.put(x, y, s.shine || "#fff1e0");
    } else if (style === "kufi") {
      for (let y = 1; y < 6; y++) {
        for (let x = 6; x < 26; x++) if (inEllipse(x, y, 16, 12.5, 8.1, 10.6)) g.put(x, y, s.cap);
      }
      for (let x = 9; x < 23; x += 2) g.put(x, 4, s.capTrim);
    }

    // Brows and eyes.
    const browY = s.browY || 10;
    for (const x of s.browThin ? [12, 13, 18, 19] : [11, 12, 13, 18, 19, 20]) g.put(x, browY, s.brow || hair);
    for (const x of [12, 13, 18, 19]) g.put(x, 12, "#221a22");
    g.put(12, 12, "#fdfaf2"); g.put(19, 12, "#fdfaf2");

    // Nose.
    g.put(16, 14, s.shade); g.put(16, 15, s.shade); g.put(15, 16, s.shade);

    // Beard.
    const b = s.beard;
    if (b === "full" || b === "short") {
      for (let y = b === "full" ? 14 : 16; y < 24; y++) {
        for (let x = 6; x < 26; x++) {
          if (!inEllipse(x, y, 16, 13, 8, b === "full" ? 10.6 : 9.8)) continue;
          if (y < 17 && x > 10 && x < 21) continue;
          g.put(x, y, beard);
        }
      }
      for (let y = 11; y < 16; y++) { g.put(8, y, beard); g.put(23, y, beard); }
      for (let x = 13; x < 19; x++) g.put(x, 17, beard);
    } else if (b === "goatee") {
      for (let x = 13; x < 19; x++) g.put(x, 17, beard);
      for (let y = 19; y < 23; y++) for (let x = 13; x < 19; x++) if (!(y === 22 && (x === 13 || x === 18))) g.put(x, y, beard);
      g.put(13, 18, beard); g.put(18, 18, beard);
    } else if (b === "stubble") {
      for (let y = 16; y < 22; y++) {
        for (let x = 9; x < 23; x++) {
          if ((x + y) % 2 === 0 && inEllipse(x, y, 16, 12.5, 7.6, 9.6) && !(y === 18 && x > 13 && x < 18)) g.put(x, y, beard);
        }
      }
    } else if (b === "chin") {
      for (let y = 18; y < 24; y++) {
        for (let x = 6; x < 26; x++) {
          if (!inEllipse(x, y, 16, 13, 8, 10.6)) continue;
          if (y < 19 && x > 12 && x < 19) continue;
          g.put(x, y, beard);
        }
      }
      for (let y = 12; y < 19; y++) { g.put(8, y, beard); g.put(23, y, beard); }
    }

    // Mouth.
    for (let x = 14; x < 18; x++) g.put(x, 18, s.mouth || "#8e4a40");
    if (s.smile) { g.put(13, 17, s.mouth || "#8e4a40"); g.put(18, 17, s.mouth || "#8e4a40"); }

    // Glasses.
    if (s.glasses) {
      const c = s.glasses;
      const gy = 11 + (s.glassesDrop || 0);
      for (const x0 of [10, 17]) {
        for (let x = x0; x < x0 + 5; x++) { g.put(x, gy - 1, c); g.put(x, gy + 2, c); }
        g.put(x0, gy, c); g.put(x0, gy + 1, c); g.put(x0 + 4, gy, c); g.put(x0 + 4, gy + 1, c);
      }
      g.put(15, gy, c); g.put(16, gy, c);
      g.put(8, gy, c); g.put(9, gy, c); g.put(22, gy, c); g.put(23, gy, c);
    }

    // Props.
    if (s.prop === "pint") {
      for (let y = 22; y < 32; y++) for (let x = 23; x < 29; x++) g.put(x, y, y < 24 ? "#fbf6e8" : (x === 24 ? "#f4c75c" : "#d9962b"));
      for (let y = 25; y < 29; y++) g.put(29, y, "#cfd6dc");
      g.put(30, 25, "#cfd6dc"); g.put(30, 28, "#cfd6dc"); g.put(31, 26, "#cfd6dc"); g.put(31, 27, "#cfd6dc");
    } else if (s.prop === "book") {
      for (let y = 24; y < 32; y++) for (let x = 2; x < 10; x++) g.put(x, y, x === 9 ? "#f4efe0" : s.bookColor || "#6b1e22");
      for (let x = 4; x < 8; x++) g.put(x, 26, "#e2c46a");
    } else if (s.prop === "mic") {
      for (let y = 23; y < 32; y++) g.put(27, y, "#2b2b33");
      for (let y = 18; y < 23; y++) for (let x = 26; x < 29; x++) g.put(x, y, (x + y) % 2 ? "#6f7380" : "#454954");
    } else if (s.prop === "headset") {
      for (let x = 8; x < 24; x++) if (inEllipse(x, 1, 16, 9, 8.8, 8.6) && !inEllipse(x, 1, 16, 9, 7.6, 7.6)) g.put(x, 1, "#2b2b33");
      for (let y = 2; y < 13; y++) { g.put(7, y + 0, y > 9 ? "#2b2b33" : g.get(7, y)); }
      for (let y = 10; y < 15; y++) { g.put(6, y, "#2b2b33"); g.put(25, y, "#2b2b33"); }
      for (let x = 7; x < 13; x++) g.put(x, 16 + Math.floor((x - 7) / 3), "#2b2b33");
    } else if (s.prop === "sign") {
      for (let y = 12; y < 24; y++) for (let x = 0; x < 9; x++) g.put(x, y, "#f7f1de");
      for (const y of [14, 16, 18, 20]) for (let x = 1; x < 8; x++) if ((x + y) % 3) g.put(x, y, "#b3261e");
      for (let y = 24; y < 32; y++) g.put(4, y, "#8a5a2b");
    }

    outline(g);
    return g;
  }

  // ---- The full figure ------------------------------------------------------------
  // The bust on top of a body, for acting out moves. Poses: "stand", "walkA",
  // "walkB" (the two steps of a walk), "reach" (the near arm held out, to
  // hand something over or rest a hand on a shoulder) and "raise" (the arm
  // lifted, for a toast, a blessing or a point of order).
  const ROBES = { habit: 1, dominican: 1, sisters: 1, blouse: 1 };
  const PANTS = { suit: null, whiteshirt: "#23252e", clerical: "#1b1b22", sweater: "#34405a", hoodie: "#34405a", shirt: "#3a3f4f", thobe: null };
  const figures = new Map();

  function figure(s, pose) {
    const key = JSON.stringify(s) + pose;
    if (figures.has(key)) return figures.get(key);
    const keep = s.prop === "cross" || s.prop === "nametag" || s.prop === "headset" ? s.prop : null;
    const top = bust({ ...s, prop: keep });
    const g = grid(40, 52);
    const X = 4;
    // The body first, so the bust's outline sits over it cleanly.
    const clothes = s.clothes;
    const dark = shadeOf(clothes);
    const robe = ROBES[s.outfit] || s.style === "veil";
    const robeColor = s.outfit === "blouse" ? (s.skirt || "#5b4a66") : s.outfit === "sisters" ? "#f7f5ee" : clothes;
    for (let y = 31; y < 39; y++) for (let x = 4; x < 28; x++) g.put(X + x, y, clothes);
    if (s.outfit === "sisters") for (let y = 31; y < 49; y++) for (let x = 12; x < 20; x++) g.put(X + x, y, "#1f2f66");
    if (s.outfit === "suit" || s.outfit === "clerical" || s.outfit === "whiteshirt") for (let y = 31; y < 39; y++) { g.put(X + 15, y, s.tie || dark); }
    // Arms at the sides: sleeves, then hands.
    const armL = pose === "raise" ? null : [[1, 3]];
    for (let y = 29; y < 39; y++) { g.put(X + 1, y, dark); g.put(X + 2, y, clothes); g.put(X + 3, y, dark); }
    g.put(X + 1, 39, s.skin); g.put(X + 2, 39, s.skin); g.put(X + 2, 40, s.skin);
    if (pose === "reach") {
      for (let x = 28; x < 38; x++) { g.put(X + x - 4, 31, clothes); g.put(X + x - 4, 32, clothes); g.put(X + x - 4, 33, dark); }
      g.put(X + 34, 31, s.skin); g.put(X + 35, 31, s.skin); g.put(X + 34, 32, s.skin); g.put(X + 35, 32, s.skin);
    } else if (pose === "raise") {
      for (let y = 16; y < 31; y++) { g.put(X + 28, y, dark); g.put(X + 29, y, clothes); g.put(X + 30, y, clothes); }
      g.put(X + 29, 14, s.skin); g.put(X + 30, 14, s.skin); g.put(X + 29, 15, s.skin); g.put(X + 30, 15, s.skin);
    } else {
      for (let y = 29; y < 39; y++) { g.put(X + 28, y, dark); g.put(X + 29, y, clothes); g.put(X + 30, y, dark); }
      g.put(X + 29, 39, s.skin); g.put(X + 30, 39, s.skin); g.put(X + 29, 40, s.skin);
    }
    // Legs, or a robe to the ground.
    const stepL = pose === "walkA" ? -2 : pose === "walkB" ? 1 : 0;
    const stepR = pose === "walkA" ? 1 : pose === "walkB" ? -2 : 0;
    if (robe) {
      for (let y = 39; y < 50; y++) {
        const half = 11 + Math.floor((y - 39) / 4);
        for (let x = 16 - half; x < 16 + half; x++) g.put(X + x, y, robeColor);
      }
      if (s.outfit === "sisters") for (let y = 39; y < 49; y++) for (let x = 12; x < 20; x++) g.put(X + x, y, "#1f2f66");
      for (let x = 5; x < 27; x += 4) g.put(X + x, 47, shadeOf(robeColor));
      for (const [x0, dx] of [[10, stepL], [18, stepR]]) for (let x = x0; x < x0 + 5; x++) { g.put(X + x + dx, 50, "#231c1c"); g.put(X + x + dx, 51, "#231c1c"); }
    } else {
      const pants = s.pants || PANTS[s.outfit] || clothes;
      for (let x = 7; x < 25; x++) g.put(X + x, 39, "#2a2226");
      for (const [x0, dx] of [[8, stepL], [17, stepR]]) {
        for (let y = 40; y < 50; y++) {
          const d = y > 44 ? dx : Math.round(dx / 2);
          for (let x = x0; x < x0 + 6; x++) g.put(X + x + d, y, pants);
        }
        for (let x = x0 - 1; x < x0 + 6; x++) { g.put(X + x + dx, 50, "#231c1c"); g.put(X + x + dx, 51, "#231c1c"); }
      }
    }
    // Now the bust, over the top of the body.
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (top.cells[y][x] && !(y === 31 && top.cells[y][x] === OUTLINE)) g.put(X + x, y, top.cells[y][x]);
    outline(g);
    figures.set(key, g);
    return g;
  }

  function shadeOf(hex) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.round(v * 0.72)).toString(16).padStart(2, "0");
    return "#" + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
  }

  // ---- Camera Mog -------------------------------------------------------------
  // The debater leans right into the lens and peers over the top of his
  // glasses. `t` runs 0 → 1 as the glasses slide down and the brows go up.
  function mog(s, t) {
    const g = grid(48, 48);
    const hair = s.hair;
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        if (!inEllipse(x, y, 24, 30, 21, 26)) continue;
        const rim = ((x + 0.5 - 24) / 21) ** 2 + ((y + 0.5 - 30) / 26) ** 2;
        g.put(x, y, rim > 0.7 && x > 28 ? s.shade : s.skin);
      }
    }
    for (let y = 0; y < 13; y++) for (let x = 0; x < 48; x++) if (inEllipse(x, y, 24, 30, 22, 27.5)) g.put(x, y, hair);
    for (let y = 13; y < 22; y++) { g.put(3, y, hair); g.put(4, y, hair); g.put(43, y, hair); g.put(44, y, hair); }
    for (let x = 6; x < 22; x++) g.put(x, 13, hair);

    const lift = Math.round(t * 3);
    for (const [x0, dir] of [[10, 1], [27, -1]]) {
      for (let i = 0; i < 10; i++) {
        const arch = Math.round(Math.sin((i / 9) * Math.PI) * (1 + lift * 0.6));
        g.put(x0 + i, 20 - arch - lift, s.brow || hair);
        g.put(x0 + i, 21 - arch - lift, s.brow || hair);
      }
    }
    // Eyes looking up and straight at you.
    for (const x0 of [12, 29]) {
      for (let y = 23; y < 28; y++) for (let x = x0; x < x0 + 7; x++) g.put(x, y, "#fdfaf2");
      for (let y = 23; y < 27; y++) for (let x = x0 + 2; x < x0 + 5; x++) g.put(x, y, "#221a22");
      g.put(x0 + 2, 23, "#ffffff");
    }
    // Nose and a flat, unimpressed mouth.
    for (let y = 28; y < 35; y++) g.put(24, y, s.shade);
    for (let x = 21; x < 27; x++) g.put(x, 35, s.shade);
    for (let x = 18; x < 31; x++) g.put(x, 40, s.mouth || "#8e4a40");
    if (s.beard === "stubble") for (let y = 37; y < 48; y++) for (let x = 8; x < 40; x++) if ((x + y) % 2 === 0 && g.get(x, y) === s.skin && y !== 40) g.put(x, y, s.beardColor);

    // The glasses slide from the eyes to the end of the nose.
    const gy = 22 + Math.round(t * 9);
    const c = s.glasses || "#1d1d24";
    for (const x0 of [9, 27]) {
      for (let x = x0; x < x0 + 12; x++) { g.put(x, gy, c); g.put(x, gy + 1, c); g.put(x, gy + 6, c); }
      for (let y = gy; y < gy + 7; y++) { g.put(x0, y, c); g.put(x0 + 11, y, c); }
      if (t > 0.5) for (let x = x0 + 1; x < x0 + 11; x += 3) g.put(x, gy + 3, "#bfe0ff");
    }
    for (let x = 21; x < 27; x++) g.put(x, gy + 1, c);
    for (let x = 2; x < 9; x++) g.put(x, gy + 1, c);
    for (let x = 39; x < 46; x++) g.put(x, gy + 1, c);
    return g;
  }

  // Paint a grid onto a canvas at (x, y), each cell `scale` pixels wide.
  function paint(ctx, g, x, y, scale, flip) {
    for (let r = 0; r < g.h; r++) {
      for (let c = 0; c < g.w; c++) {
        const col = g.cells[r][flip ? g.w - 1 - c : c];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }

  // ---- The cast ---------------------------------------------------------------
  // Likenesses are first drafts from each man's best-known look; they are
  // meant to be corrected against real photographs.

  const CAST = {
    akin: { skin: "#eab99a", shade: "#c98f72", hair: "#8d877e", style: "receding", beard: "goatee", beardColor: "#9d978e", glasses: "#3a3a44", outfit: "shirt", clothes: "#3f6aa8", trim: "#dfe6f2", smile: true },
    muse: { skin: "#efc6a8", shade: "#cf9c7e", hair: "#3a2618", hairLight: "#5a3d28", style: "side", beard: "stubble", beardColor: "#b98c70", glasses: "#1d1d24", outfit: "sweater", clothes: "#1f3b5c", trim: "#e9e2d0" },
    bertuzzi: { skin: "#e3b08e", shade: "#c28a6a", hair: "#2b1d16", style: "short", beard: "full", outfit: "sweater", clothes: "#4c5d3f", trim: "#d8d2bf", prop: "mic", smile: true },
    horn: { skin: "#f0c4a4", shade: "#cf9a7c", hair: "#4a3222", hairLight: "#6a4a32", style: "side", outfit: "suit", clothes: "#2d3550", lapel: "#1b2033", tie: "#9c2b2b", smile: true },
    fradd: { skin: "#f1c3a2", shade: "#d19c7d", hair: "#6b4a33", style: "bald", beard: "full", beardColor: "#6b4a33", brow: "#6b4a33", outfit: "shirt", clothes: "#2f2f35", trim: "#56565e", prop: "pint", smile: true },
    godlogic: { skin: "#7a4e33", shade: "#5e3b26", hair: "#16100c", style: "crew", beard: "short", beardColor: "#16100c", brow: "#16100c", mouth: "#4a2a22", shine: "#9a6a4a", outfit: "hoodie", clothes: "#8a2d3b", trim: "#6a1f2b", prop: "headset", smile: true },
    white: { skin: "#f0c6aa", shade: "#cf9e84", hair: "#dedad3", style: "receding", beard: "goatee", beardColor: "#e2ded8", brow: "#bdb8b0", outfit: "suit", clothes: "#26272e", lapel: "#15161b", tie: "#5a6f8c", prop: "book", bookColor: "#1f2d4f" },
    hansen: { skin: "#f2c9a9", shade: "#d3a283", hair: "#5a3a22", style: "short", beard: "short", beardColor: "#5a3a22", outfit: "whiteshirt", clothes: "#f7f5ee", tie: "#2c4a7a", smile: true },
    schmitz: { skin: "#f1c6a6", shade: "#d19d7f", hair: "#5a3c26", hairLight: "#7a5438", style: "side", outfit: "clerical", clothes: "#1b1b22", smile: true },
    barron: { skin: "#efc3a3", shade: "#cf9a7c", hair: "#9a8f84", style: "zucchetto", cap: "#9b1f5a", brow: "#8a8076", outfit: "clerical", clothes: "#1b1b22", prop: "cross", smile: true },
    hicks: { skin: "#eec4a6", shade: "#cd9b7e", hair: "#6f5a48", style: "short", outfit: "habit", clothes: "#16161c", trim: "#2a2a33", smile: true },
    pine: { skin: "#f0c8aa", shade: "#cf9f82", hair: "#3b2a1e", style: "short", beard: "short", beardColor: "#3b2a1e", outfit: "dominican", clothes: "#f2efe6", trim: "#d8d3c6" },
    marygrace: { skin: "#f2cdb2", shade: "#d3a68a", hair: "#5a3c26", style: "veil", veil: "#f7f5ee", veilTrim: "#1f2f66", browThin: true, mouth: "#b45a5a", outfit: "sisters", clothes: "#1f2f66", trim: "#f7f5ee", smile: true },
    rose: { skin: "#f3d0b6", shade: "#d6a98c", hair: "#4a2e1c", hairLight: "#6a4630", style: "long", browThin: true, mouth: "#b8505a", outfit: "blouse", clothes: "#e9dccb", smile: true },
    holdsworth: { skin: "#eec2a2", shade: "#cd9a7c", hair: "#3e2b1e", style: "short", beard: "full", beardColor: "#4a3222", outfit: "sweater", clothes: "#6b5a44", trim: "#e0d6c2" },
    jurado: { skin: "#dcae8c", shade: "#bb8b6a", hair: "#1e1612", style: "short", beard: "short", beardColor: "#1e1612", brow: "#1e1612", outfit: "shirt", clothes: "#1f1f26", trim: "#3a3a44", prop: "mic" },
    heschmeyer: { skin: "#f0c6a8", shade: "#cf9d80", hair: "#4a3526", style: "side", beard: "short", beardColor: "#4a3526", glasses: "#2a2a33", outfit: "suit", clothes: "#3a4356", lapel: "#262c3b", tie: "#6b2d3a", smile: true },
    // Rank-and-file opponents, invented for the game.
    elder: { skin: "#f4d0b3", shade: "#d7a98a", hair: "#d9b25a", hairLight: "#f0cf7a", style: "side", outfit: "whiteshirt", clothes: "#f7f5ee", tie: "#243a66", prop: "nametag", smile: true },
    preacher: { skin: "#e9b896", shade: "#c78f70", hair: "#6b4a2f", style: "short", beard: "chin", beardColor: "#6b4a2f", outfit: "shirt", clothes: "#7a6a4f", trim: "#e9e2d0", prop: "sign" },
    speaker: { skin: "#b98563", shade: "#976746", hair: "#1c140f", style: "kufi", cap: "#f2efe6", capTrim: "#c9c3b4", beard: "chin", beardColor: "#1c140f", brow: "#1c140f", outfit: "shirt", clothes: "#4f5a3a", trim: "#d8d2bf" },
    skeptic: { skin: "#f3cdb2", shade: "#d3a58a", hair: "#9a5a2e", style: "curly", outfit: "hoodie", clothes: "#5d6470", trim: "#434955", prop: "headset" },
  };

  return { bust, mog, figure, paint, CAST };
})();
