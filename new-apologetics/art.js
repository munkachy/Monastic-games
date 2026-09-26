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
      const shirt = s.shirt || (s.outfit === "suit" ? "#f2efe6" : "#f7f5ee");
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
    } else if (s.outfit === "gingham") {
      for (let y = 23; y < 32; y++) {
        const half = Math.min(15, 7 + (y - 23) * 1.4);
        for (let x = Math.floor(16 - half); x < Math.ceil(16 + half); x++) if (x % 3 === 0 || y % 3 === 0) g.put(x, y, s.trim);
      }
      for (const [x, y] of [[12, 23], [13, 24], [14, 25], [19, 23], [18, 24], [17, 25]]) g.put(x, y, s.clothes);
      for (let y = 24; y < 32; y++) g.put(16, y, s.trim);
    } else if (s.outfit === "choir") {
      for (let y = 23; y < 29; y++) {
        const half = Math.min(15, 7 + (y - 23) * 1.4) + 1;
        for (let x = Math.floor(16 - half); x < Math.ceil(16 + half); x++) g.put(x, y, s.cape || shadeOf(s.clothes));
      }
      for (let x = 2; x < 30; x++) if (g.get(x, 28)) g.put(x, 28, "#c8243a");
      g.put(15, 23, "#f7f5ee"); g.put(16, 23, "#f7f5ee");
      for (let y = 24; y < 32; y += 2) g.put(16, y, "#c8243a");
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
    if (s.prop === "cross" && s.cord) {
      for (let i = 0; i < 4; i++) { g.put(12 + i, 23 + i, i % 2 ? s.cord : "#e8b94a"); g.put(20 - i, 23 + i, i % 2 ? s.cord : "#e8b94a"); }
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
    const rx = s.faceW || 7.6;
    const face = (x, y) => s.jaw === "chiseled"
      ? (y >= 14 ? Math.abs(x + 0.5 - 16) <= Math.max(3, rx - (y - 14) * 0.62) && y < 23 : inEllipse(x, y, 16, 12.5, rx, 9.6))
      : s.faceW ? inEllipse(x, y, 16, 12.5, rx, 9.8) : s.jaw === "square"
      ? (y >= 12 ? Math.abs(x + 0.5 - 16) <= 7.6 - (y > 19 ? (y - 19) * 1.2 : 0) && y < 22 : inEllipse(x, y, 16, 12.5, 7.6, 9.6))
      : inEllipse(x, y, 16, 12.5, 7.6, 9.6);
    for (let y = 2; y < 23; y++) {
      for (let x = 6; x < 26; x++) {
        if (!face(x, y)) continue;
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
      if (style === "long" && s.part) { for (let y = 1; y < 5; y++) g.put(16, y, s.shade); for (let x = 9; x < 13; x++) g.put(x, 7, hair); for (let x = 20; x < 24; x++) g.put(x, 7, hair); }
      else if (style === "long") { for (let x = 9; x < 15; x++) g.put(x, 7, hair); g.put(9, 8, hair); }
      if (s.lock) { g.put(13, 7, hair); g.put(14, 8, hair); g.put(13, 9, hair); }
      if (style === "side") {
        for (let x = 9; x < 18; x++) g.put(x, 7, hair);
        g.put(9, 8, hair); g.put(10, 8, hair);
        g.put(20, 3, s.hairLight || hair);
        g.put(12, 2, s.skin);
      }
      if (style === "curly") {
        for (const [x, y] of [[10, 8], [13, 8], [19, 8], [22, 8]]) g.put(x, y, hair);
        for (const [x, y] of [[11, 3], [15, 2], [19, 3], [13, 5], [17, 5], [21, 6], [9, 6]]) g.put(x, y, s.hairLight || shadeOf(hair));
      }
      if (s.hairLight) for (const [x, y] of [[13, 2], [14, 2], [15, 3]]) g.put(x, y, s.hairLight);
    } else if (style === "bowl") {
      // Straight, full hair with a fringe cut straight across, covering the ears.
      for (let y = 0; y < 9; y++) for (let x = 5; x < 27; x++) if (inEllipse(x, y, 16, 12.5, 9.4, 12.6)) g.put(x, y, (x * 7 + y * 13) % 29 === 0 ? (s.hairLight || hair) : hair);
      for (let x = 8; x < 24; x++) g.put(x, 9, hair);
      for (let y = 9; y < 15; y++) { g.put(6, y, hair); g.put(7, y, hair); g.put(24, y, hair); g.put(25, y, hair); }
    } else if (style === "fauxhawk") {
      // Short faded sides, and a tall swept ridge down the middle.
      for (let y = 4; y < 10; y++) { g.put(8, y, s.hairFade || shadeOf(s.skin)); g.put(23, y, s.hairFade || shadeOf(s.skin)); }
      for (let y = 2; y < 7; y++) for (let x = 9; x < 23; x++) if (inEllipse(x, y, 16, 12.5, 7.8, 10.4)) g.put(x, y, s.hairFade || shadeOf(s.skin));
      for (let y = 0; y < 6; y++) for (let x = 11; x < 21; x++) if (y > 0 || (x > 12 && x < 19)) g.put(x, y, hair);
      for (const [x, y] of [[14, 0], [15, 0], [17, 0], [12, 1], [19, 1]]) g.put(x, y, s.hairLight || hair);
      g.put(12, 6, hair); g.put(13, 6, hair); g.put(19, 6, hair);
    } else if (style === "receding" && s.buzz) {
      // A close buzz cut: the sides dark, the top a light stubble, receding at the temples.
      for (let y = 1; y < 12; y++) for (let x = 6; x < 26; x++) {
        if (!inEllipse(x, y, 16, 12.5, 8.3, 10.6)) continue;
        if (x <= 8 || x >= 23) g.put(x, y, hair);
        else if (y < 6 && !(y > 3 && (x < 11 || x > 20)) && (x + y) % 2 === 0) g.put(x, y, hair);
      }
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
    } else if (style === "shaggy") {
      // A mop of hair with a jagged fringe that hangs to the brows.
      for (let y = 0; y < 10; y++) for (let x = 5; x < 27; x++) if (inEllipse(x, y, 16, 12.5, 9, 11.4)) g.put(x, y, (x * 7 + y * 3) % 11 === 0 ? (s.hairLight || hair) : hair);
      for (const x of [9, 10, 12, 13, 14, 17, 18, 20, 21, 22]) g.put(x, 10, hair);
      for (let y = 8; y < 15; y++) { g.put(7, y, hair); g.put(24, y, hair); g.put(6, y - 2, hair); g.put(25, y - 2, hair); }
    } else if (style === "cowboy") {
      for (let y = 7; y < 12; y++) { g.put(8, y, hair); g.put(23, y, hair); }
      const hat = s.hat || "#efe6d2";
      const hatShade = s.hatShade || "#cfc4ac";
      for (let y = 0; y < 6; y++) for (let x = 10; x < 22; x++) if (!(y === 0 && (x < 12 || x > 19))) g.put(x, y, hat);
      g.put(15, 1, hatShade); g.put(16, 1, hatShade); g.put(15, 2, hatShade); g.put(16, 2, hatShade);
      for (let x = 10; x < 22; x++) g.put(x, 5, s.hatBand || "#8a6a4a");
      for (let x = 3; x < 29; x++) { g.put(x, 6, hat); g.put(x, 7, x < 6 || x > 25 ? hat : hatShade); }
      for (const x of [3, 4, 27, 28]) g.put(x, 5, hat);
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
    if (s.wideEyes) {
      // Big, delighted eyes: white all round, the pupil in the middle.
      for (const x0 of [11, 18]) for (let x = x0; x < x0 + 3; x++) for (const y of [11, 12, 13]) g.put(x, y, "#fdfaf2");
      g.put(12, 12, s.eyeColor || "#221a22"); g.put(19, 12, s.eyeColor || "#221a22");
      if (s.eyeColor) { g.put(12, 11, "#221a22"); g.put(19, 11, "#221a22"); }
    } else {
      for (const x of [12, 13, 18, 19]) g.put(x, 12, "#221a22");
      g.put(12, 12, "#fdfaf2"); g.put(19, 12, "#fdfaf2");
    }

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
    } else if (b === "long") {
      // A long beard that falls to the chest, narrowing as it goes.
      for (let y = 14; y < 32; y++) {
        const half = y < 19 ? 8 : Math.max(2, 8 - (y - 19) * (s.beardTaper || 0.45));
        for (let x = 0; x < 32; x++) {
          if (Math.abs(x + 0.5 - 16) > half) continue;
          if (y < 17 && x > 10 && x < 21) continue;
          if (y < 23 && !inEllipse(x, y, 16, 13, 8.2, 11) && y < 19) continue;
          g.put(x, y, (x * 3 + y * 7) % 13 === 0 ? (s.beardLight || beard) : beard);
        }
      }
      for (let y = 11; y < 16; y++) { g.put(8, y, beard); g.put(23, y, beard); }
      for (let x = 12; x < 20; x++) g.put(x, 17, beard);
    } else if (b === "mustache") {
      for (let x = 14; x < 18; x++) g.put(x, 17, beard);
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
    if (s.cheeks) for (const [x, y] of [[10, 14], [11, 15], [21, 14], [20, 15]]) g.put(x, y, s.shade);
    if (s.grin) {
      for (let x = 13; x < 19; x++) { g.put(x, 18, s.mouth || "#8e4a40"); g.put(x, 19, x > 13 && x < 18 ? "#fdfaf2" : s.mouth || "#8e4a40"); }
      g.put(12, 17, s.mouth || "#8e4a40"); g.put(19, 17, s.mouth || "#8e4a40");
    } else if (s.smirk) {
      // Flat on one side, turned up on the other.
      for (let x = 14; x < 18; x++) g.put(x, 18, s.mouth || "#8e4a40");
      g.put(18, 17, s.mouth || "#8e4a40"); g.put(19, 16, s.mouth || "#8e4a40");
      g.put(19, 10, s.brow || hair); g.put(20, 9, s.brow || hair);
    } else {
      for (let x = 14; x < 18; x++) g.put(x, 18, s.mouth || "#8e4a40");
      if (s.smile) { g.put(13, 17, s.mouth || "#8e4a40"); g.put(18, 17, s.mouth || "#8e4a40"); }
    }

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
      if (s.lens) for (const x0 of [10, 17]) for (let x = x0 + 1; x < x0 + 4; x++) for (const y of [gy, gy + 1]) if (g.get(x, y) !== "#221a22") g.put(x, y, s.lens);
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
    } else if (s.prop === "headphones") {
      for (let x = 7; x < 25; x++) if (inEllipse(x, 0, 16, 9, 9.2, 9.2) && !inEllipse(x, 0, 16, 9, 8, 8)) g.put(x, 0, "#1d1d24");
      for (let y = 1; y < 9; y++) { g.put(5, y, "#1d1d24"); g.put(26, y, "#1d1d24"); }
      for (let y = 9; y < 16; y++) for (const x of [4, 5, 26, 27]) g.put(x, y, "#2b2b33");
    } else if (s.prop === "chain") {
      for (let i = 0; i < 4; i++) { g.put(13 + i, 23 + i, "#e8b94a"); g.put(19 - i, 23 + i, "#e8b94a"); }
    } else if (s.prop === "pendant") {
      for (let i = 0; i < 4; i++) { g.put(12 + i, 23 + i, "#cfd6dc"); g.put(20 - i, 23 + i, "#cfd6dc"); }
      g.put(16, 27, "#f4f8ff"); g.put(16, 28, "#f4f8ff"); g.put(15, 27, "#dbe4ec");
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
  const ROBES = { habit: 1, dominican: 1, sisters: 1, blouse: 1, choir: 1 };
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
    const robeColor = s.outfit === "choir" ? "#f7f5ee" : s.outfit === "blouse" ? (s.skirt || "#5b4a66") : s.outfit === "sisters" ? "#f7f5ee" : clothes;
    for (let y = 31; y < 39; y++) for (let x = 4; x < 28; x++) g.put(X + x, y, clothes);
    if (s.outfit === "sisters") for (let y = 31; y < 49; y++) for (let x = 12; x < 20; x++) g.put(X + x, y, "#1f2f66");
    if (s.outfit === "gingham") for (let y = 31; y < 39; y++) for (let x = 4; x < 28; x++) if (x % 3 === 0 || y % 3 === 0) g.put(X + x, y, s.trim);
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
      if (s.outfit === "choir") {
        // Lace at the rochet's hem, and the magenta cassock beneath it.
        for (let y = 45; y < 50; y++) { const half = 11 + Math.floor((y - 39) / 4); for (let x = 16 - half; x < 16 + half; x++) g.put(X + x, y, y === 45 ? ((x % 2) ? "#e2ddd2" : "#f7f5ee") : clothes); }
      }
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
    // Drawn from Ethan Muse's own Camera Mog: the head tipped down toward the
    // lens, a shaggy fringe hanging over the forehead, heavy brows, and eyes
    // looking up over glasses that have slid down the nose.
    const g = grid(48, 48);
    const hair = s.hair;
    const hairLight = s.hairLight || hair;
    const dark = "#221a22";
    // A wide face, so close to the camera it fills the frame.
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        if (!inEllipse(x, y, 24, 27, 22.5, 27)) continue;
        const rim = ((x + 0.5 - 24) / 22.5) ** 2 + ((y + 0.5 - 27) / 27) ** 2;
        g.put(x, y, rim > 0.72 ? s.shade : s.skin);
      }
    }
    // The checked shirt at the bottom corners.
    for (let y = 36; y < 48; y++) for (let x = 0; x < 48; x++) {
      if (g.get(x, y) && inEllipse(x, y, 24, 27, 21.5 - (y - 36) * 0.9, 27)) continue;
      g.put(x, y, x % 3 === 0 || y % 3 === 0 ? (s.trim || "#3a5aa0") : (s.clothes || "#eef2f8"));
    }
    // The shaggy mop: a mass on top, a jagged fringe, strands at the sides.
    const fringe = [16, 17, 19, 18, 20, 19, 21, 20, 19, 21, 20, 18, 19, 20, 18, 17];
    for (let x = 0; x < 48; x++) {
      const bottom = x < 6 || x > 41 ? 30 - Math.abs(x < 6 ? x : 47 - x) : fringe[Math.floor(x / 3) % fringe.length] - (x > 34 ? 2 : 0);
      for (let y = 0; y < bottom; y++) g.put(x, y, (x * 13 + y * 7 + x * y) % 17 === 0 ? hairLight : hair);
    }
    for (const [x, y] of [[9, 20], [14, 21], [22, 22], [27, 21], [31, 20]]) { g.put(x, y, hair); g.put(x, y + 1, hair); }
    // Heavy brows, drawn down toward the middle: a scowl that deepens.
    const scowl = Math.round(t * 2);
    for (const [x0, dir] of [[8, 1], [27, -1]]) {
      for (let i = 0; i < 13; i++) {
        const x = dir > 0 ? x0 + i : x0 + 12 - i;
        const drop = Math.round((i / 12) * (1 + scowl));
        g.put(x, 22 + drop, s.brow || dark);
        g.put(x, 23 + drop, s.brow || dark);
      }
    }
    // Eyes peering up from under the brows.
    const eyeTop = 25 + scowl;
    for (const x0 of [11, 29]) {
      for (let y = eyeTop; y < eyeTop + 4; y++) for (let x = x0; x < x0 + 8; x++) g.put(x, y, "#f4eee4");
      for (let y = eyeTop; y < eyeTop + 3; y++) for (let x = x0 + 3; x < x0 + 6; x++) g.put(x, y, dark);
      g.put(x0 + 3, eyeTop, "#6a4a36");
      for (let x = x0; x < x0 + 8; x++) g.put(x, eyeTop - 1, s.shade);
    }
    // A broad nose and a small, pressed mouth.
    for (let y = 31; y < 39; y++) { g.put(23, y, s.shade); if (y > 34) g.put(25, y, s.shade); }
    for (let x = 20; x < 29; x++) g.put(x, 39, s.shade);
    g.put(21, 38, dark); g.put(27, 38, dark);
    for (let x = 19; x < 30; x++) g.put(x, 43, s.mouth || "#8e4a40");
    g.put(18, 44, s.mouth || "#8e4a40"); g.put(30, 44, s.mouth || "#8e4a40");
    // The glasses slide from the eyes to the end of the nose.
    const gy = 24 + Math.round(t * 8);
    const c = s.glasses || "#1d1d24";
    for (const x0 of [7, 26]) {
      for (let x = x0; x < x0 + 15; x++) { g.put(x, gy, c); g.put(x, gy + 1, c); g.put(x, gy + 6, c); }
      for (let y = gy; y < gy + 7; y++) { g.put(x0, y, c); g.put(x0 + 14, y, c); }
      for (let x = x0 + 2; x < x0 + 13; x += 4) g.put(x, gy + 3, "#c8e0f0");
      g.put(x0 + 2, gy + 2, "#e8f4ff");
    }
    for (let x = 21; x < 27; x++) g.put(x, gy + 1, c);
    for (let x = 0; x < 7; x++) g.put(x, gy + 1, c);
    for (let x = 41; x < 48; x++) g.put(x, gy + 1, c);
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
    akin: { skin: "#efc2a4", shade: "#d09c80", hair: "#c4562a", style: "cowboy", hat: "#efe6d2", hatShade: "#d6cbb2", beard: "long", beardColor: "#c4562a", beardLight: "#e07a44", brow: "#b04a24", outfit: "shirt", clothes: "#f4f1ea", trim: "#c9c3b4", pants: "#3a4a6a" },
    muse: { skin: "#f0c4a6", shade: "#d09c80", hair: "#5a3e2c", hairLight: "#7a5a44", style: "shaggy", faceW: 8.4, brow: "#3a2618", browY: 11, glasses: "#1d1d24", outfit: "gingham", clothes: "#eef2f8", trim: "#4a6ab0", pants: "#3a3f4f" },
    bertuzzi: { skin: "#e8b99a", shade: "#c8957a", hair: "#1c1410", hairLight: "#3a2a20", hairFade: "#6a5446", style: "fauxhawk", beard: "goatee", beardColor: "#5a4232", outfit: "suit", clothes: "#243a66", lapel: "#1a2a4c", shirt: "#1d1d22", prop: "mic", smile: true },
    horn: { skin: "#e6b692", shade: "#c69272", hair: "#16100c", style: "curly", brow: "#16100c", outfit: "suit", clothes: "#6a6d74", lapel: "#55585e", shirt: "#f2efe6", smirk: true },
    fradd: { skin: "#efc3a4", shade: "#cf9c80", hair: "#8a6a4a", hairLight: "#a8845c", style: "side", beard: "short", beardColor: "#9a6a44", outfit: "suit", clothes: "#243452", lapel: "#1a2640", shirt: "#f7f5ee", prop: "pint", smile: true },
    godlogic: { skin: "#6a4228", shade: "#52321e", hair: "#120c08", style: "curly", beard: "goatee", beardColor: "#120c08", brow: "#120c08", mouth: "#3e2218", shine: "#8a5a3a", outfit: "sweater", clothes: "#16161a", trim: "#2a2a30" },
    white: { skin: "#f0c6aa", shade: "#cf9e84", hair: "#c8c2b8", style: "bald", beard: "short", beardColor: "#e4e0da", brow: "#bdb8b0", glasses: "#6a6a72", outfit: "suit", clothes: "#26272e", lapel: "#15161b", tie: "#2a2a30", prop: "book", bookColor: "#1f2d4f" },
    hansen: { skin: "#f2c9a9", shade: "#d3a283", hair: "#5a3a22", style: "short", beard: "short", beardColor: "#5a3a22", outfit: "whiteshirt", clothes: "#f7f5ee", tie: "#2c4a7a", smile: true },
    schmitz: { skin: "#ecc0a0", shade: "#cc9678", hair: "#1c1410", hairLight: "#3a2a20", style: "side", lock: true, jaw: "chiseled", faceW: 7.4, outfit: "clerical", clothes: "#1b1b22", smile: true },
    barron: { skin: "#efc3a3", shade: "#cf9a7c", hair: "#c9c6c0", style: "zucchetto", cap: "#b0205e", brow: "#9a958e", glasses: "#1d1d24", outfit: "choir", clothes: "#b0205e", cape: "#9a1a52", prop: "cross", cord: "#2f7a4a", smile: true },
    spitzer: { skin: "#efc6ac", shade: "#cf9e86", hair: "#d8d6d0", hairLight: "#f0efec", style: "side", brow: "#b8b4ac", glasses: "#1d1d24", lens: "#d98a3a", outfit: "clerical", clothes: "#1b1b22", smile: true },
    hicks: { skin: "#eec4a6", shade: "#cd9b7e", hair: "#3a2a1e", style: "crew", beard: "long", beardColor: "#4a3526", beardLight: "#6a5040", beardTaper: 0.3, brow: "#3a2a1e", outfit: "habit", clothes: "#16161c", trim: "#2a2a33", smile: true },
    pine: { skin: "#f0c8aa", shade: "#cf9f82", hair: "#8a6a4e", style: "receding", buzz: true, faceW: 7, beard: "short", beardColor: "#6a4a32", brow: "#6a4a32", outfit: "dominican", clothes: "#f2efe6", trim: "#d8d3c6", grin: true },
    marygrace: { skin: "#f2cdb2", shade: "#d3a68a", hair: "#5a3c26", style: "veil", veil: "#f7f5ee", veilTrim: "#1f2f66", browThin: true, mouth: "#b45a5a", outfit: "sisters", clothes: "#1f2f66", trim: "#f7f5ee", smile: true },
    rose: { skin: "#f0caae", shade: "#d2a08a", hair: "#141018", hairLight: "#2a2230", style: "long", part: true, browThin: true, brow: "#2a1e1a", mouth: "#c06070", outfit: "blouse", clothes: "#1a1a24", skirt: "#1a1a24", prop: "pendant", smile: true },
    holdsworth: { skin: "#f0c6a8", shade: "#cf9d82", hair: "#8a3e1e", hairLight: "#a8542a", style: "long", beard: "full", beardColor: "#9a4a24", brow: "#8a3e1e", outfit: "shirt", clothes: "#9a8a6a", trim: "#7a6a4e" },
    jurado: { skin: "#d8a482", shade: "#b27e5e", hair: "#1c1410", hairLight: "#3a2a20", style: "side", beard: "goatee", beardColor: "#241a14", brow: "#1c1410", cheeks: true, outfit: "suit", clothes: "#6e6c6c", lapel: "#5a5858", shirt: "#26262c", prop: "chain" },
    heschmeyer: { skin: "#f0c6a8", shade: "#cf9d80", hair: "#3a2618", style: "side", beard: "full", beardColor: "#3a2618", outfit: "suit", clothes: "#2a4a8a", lapel: "#1e3a6e", shirt: "#cfe0f2", tie: "#3a5a9a", smile: true },
    hahn: { skin: "#e8b596", shade: "#c89276", hair: "#8e887e", hairLight: "#b8b2a8", style: "side", beard: "short", beardColor: "#dcd8d0", brow: "#6a645c", browY: 9, wideEyes: true, outfit: "suit", clothes: "#26293a", lapel: "#1a1c28", shirt: "#b8cce4", smile: true },
    oconnor: { skin: "#f2d0ba", shade: "#d4a88e", hair: "#2a1c14", hairLight: "#4a3424", style: "side", beard: "mustache", beardColor: "#6a5040", mouth: "#c47e70", outfit: "suit", clothes: "#5a5d66", lapel: "#474a52", shirt: "#f7f5ee", tie: "#7a2a34" },
    ryan: { skin: "#f0c4a8", shade: "#d09c84", hair: "#6a3a26", hairLight: "#8a5236", style: "bowl", brow: "#5a3222", wideEyes: true, eyeColor: "#5aa0e0", outfit: "shirt", clothes: "#1c2440", trim: "#e9e2d0", prop: "headphones", smile: true },
    seminarian: { skin: "#f0c8aa", shade: "#cf9f82", hair: "#6a4a2f", style: "side", glasses: "#2a2a33", outfit: "suit", clothes: "#3a3f4a", lapel: "#2a2f3a", tie: "#5a2a2a", prop: "book", bookColor: "#1f2d4f" },
    // Rank-and-file opponents, invented for the game.
    elder: { skin: "#f4d0b3", shade: "#d7a98a", hair: "#d9b25a", hairLight: "#f0cf7a", style: "side", outfit: "whiteshirt", clothes: "#f7f5ee", tie: "#243a66", prop: "nametag", smile: true },
    preacher: { skin: "#e9b896", shade: "#c78f70", hair: "#6b4a2f", style: "short", beard: "chin", beardColor: "#6b4a2f", outfit: "shirt", clothes: "#7a6a4f", trim: "#e9e2d0", prop: "sign" },
    speaker: { skin: "#b98563", shade: "#976746", hair: "#1c140f", style: "kufi", cap: "#f2efe6", capTrim: "#c9c3b4", beard: "chin", beardColor: "#1c140f", brow: "#1c140f", outfit: "shirt", clothes: "#4f5a3a", trim: "#d8d2bf" },
    skeptic: { skin: "#f3cdb2", shade: "#d3a58a", hair: "#9a5a2e", style: "curly", outfit: "hoodie", clothes: "#5d6470", trim: "#434955", prop: "headset" },
  };

  return { bust, mog, figure, paint, CAST };
})();
