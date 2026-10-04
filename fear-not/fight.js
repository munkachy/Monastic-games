"use strict";
// Fear Not: the fight. Down on the wet street round the car, side on, with room to move up and
// down as in Double Dragon. Flowing crowd combat, as in Batman: Arkham Asylum: strikes (flown in on
// a flip, a roll, a flying kick, a cartwheel or a prostrate dive), counters that catch and pin, a
// block in prayer, takedowns of demons knocked flat, and the priest's own gadgets in the flow: holy
// water, the rosary thrown to wrap one and haul it in, a demon thrown into the others, a launch and
// a slam. One rule, the drunken master's: never the same blow twice on the same demon, or he
// trips over his own feet. Three falls in a row (trips, or blows taken) and they drag the whole
// fight down into the Depths, until ten in a row bring him up.
// Touch: tap a demon to zip to it and strike; tap a gold sign to counter; hold on the open street
// to block (one blow at a time; a red sign can only be blocked); tap open street to zip there; hold
// on a demon a moment, then let go, for holy water; tap twice for a heavy blow; swipe up on a demon
// to launch it, down to slam it; drag a far demon to throw the rosary round it; drag a near one to
// throw it; tap one lying down to finish it.
// Keyboard: the arrows move him; Space strikes toward the arrow held; X counters, Q (or Z, or
// Shift) blocks, C heavy, E launch, V slam, F holy water, R the rosary, T throw, B bless.
// The longer the flow, the harder every blow lands and the slower time runs. His angel waits
// above, out of sight, and comes down every fifth blow of a combo. Twelve in a row carries the
// whole fight up to the Heights; there, a blow from on high brings them all down, and the count
// starts again.
// Before the street, the angel shows him all of it, in his mind, against shades: the practice.

const Fight = (() => {
  const Y0 = 250, Y1 = 338, SPIRIT = 10, SKY = 430;
  const depth = (y) => 0.82 + 0.24 * (y - Y0) / (Y1 - Y0);
  let G = null, bg = null, bgKey = "";
  // The street is three screens wide, the car in the middle of it. The camera stays on Fr. Lawrence,
  // and he is kept half a screen from either end, so it never has to stop following him.
  const carX = () => (G ? G.ww / 2 : W * 0.5), CARY = 238;
  const HX0 = () => W / 2, HX1 = () => G.ww - W / 2;          // where he can go
  const FX0 = 24, FX1 = () => G.ww - 24;                        // where they can go
  const keepX = (x) => clamp(x, HX0(), HX1());
  const pan = (x) => clamp((x - G.view.cx) / W, -0.8, 0.8);
  // Fr. Lawrence in the fight: a steel-blue coat, a gold band on his hat, the light of his angel
  // round his edges and a ring of it at his feet, so he can never be mistaken for the demons,
  // who are black and edged in red.
  const PRIEST_FIGHT = { trouser: "#2a3656", trouser2: "#1c2640", coat: "#3a4c78", coat2: "#283658", lapel: "#6a7ca8", shoe: "#0c0e18", skin: "#9a6e58", skinSh: "#4e342a", collar: "#ffffff", hat: "#33446c", band: "#e8c46a", glass: "#c4f0ff" };
  const DEMON_RIMS = ["#ff2a2a", "#ff6a2a", "#e0105a"];
  // The rules of each world: how long a demon winds up, how fast his blows are, how hard theirs
  // land, how long a combo lasts between blows, how often his angel comes, and how long a demon
  // knocked down stays down.
  const WORLD = {
    street: { wind: 1, strike: 1, hurt: 1, comboT: 2.6, swoop: 5, floor: 2.6 },
    kata: { wind: 1.25, strike: 1, hurt: 0, comboT: 3.4, swoop: 5, floor: 4.5 },
    heights: { wind: 1.7, strike: 0.72, hurt: 0.6, comboT: 3.4, swoop: 3, regen: 6, floor: 3.6 },
    depths: { wind: 0.85, strike: 1, hurt: 1.5, comboT: 1.4, swoop: 0, floor: 1.6 },
  };
  const R = () => WORLD[G.world];
  const HEIGHTS_AT = 12, DEPTHS_OUT = 10, WATER_MS = 300;
  // A demon is knocked flat when his blows wear it down past each of these (a share of its strength).
  const WORN = [0.5, 0.2];

  // ---- Poses ---------------------------------------------------------------------------------------
  // Fr. Lawrence's drunken-fist stance: always swaying, a cupped hand up as if it held a cup.
  const idleP = (t) => pose({ lean: 0.1 + 0.1 * Math.sin(t * 1.7), head: -0.05 + 0.1 * Math.sin(t * 1.7 + 1), sF: 1.15 + 0.15 * Math.sin(t * 1.7), eF: 1.6, sB: -0.35 + 0.12 * Math.sin(t * 1.7 + 2), eB: 0.9, hF: 0.3 + 0.08 * Math.sin(t * 1.7), kF: 0.38, hB: -0.3 + 0.05 * Math.sin(t * 1.7 + 1), kB: 0.28 });
  // The lurching run: legs crossing, leaning, arms loose; now and then a trip.
  const walkP = (ph, trip) => trip ? pose({ lean: 0.95, head: 0.4, sF: 2.1, eF: 0.3, sB: 2.4, eB: 0.2, hF: 0.9, kF: 0.6, hB: -0.9, kB: 0.4 })
    : pose({ lean: 0.32 + 0.14 * Math.sin(ph * 0.5), head: 0.1 * Math.sin(ph * 0.5 + 1), sF: 0.9 + 0.6 * Math.sin(ph * 0.5 + 1), eF: 1.2, sB: -0.6 + 0.5 * Math.sin(ph * 0.5), eB: 0.7, hF: 0.6 * Math.sin(ph), kF: 0.25 + 0.35 * Math.max(0, Math.cos(ph)), hB: -0.6 * Math.sin(ph), kB: 0.25 + 0.35 * Math.max(0, -Math.cos(ph)) });
  // The flying kick; flat out in the air, arms ahead, like a monk's prostration; the cartwheel.
  const FLYKICK = pose({ lean: -0.3, head: 0.1, hF: 1.9, kF: 0.1, hB: -0.2, kB: 1.4, sF: 2.4, eF: 0.4, sB: -1.4, eB: 0.5 });
  const PROSTRATE = pose({ lean: 1.45, head: -0.55, sF: 1.62, eF: 0.0, sB: 1.52, eB: 0.05, hF: -1.4, kF: 0.05, hB: -1.5, kB: 0.1, lift: 16 });
  const CARTWHEEL = pose({ lean: 0, head: 0, sF: 2.7, eF: 0.1, sB: -2.7, eB: 0.1, hF: 0.7, kF: 0, hB: -0.7, kB: 0 });
  const TUCK = pose({ lean: 0.5, head: 0.4, sF: 1.6, eF: 2.2, sB: 1.4, eB: 2.2, hF: 2.2, kF: 2.6, hB: 2.0, kB: 2.5 });
  // The strikes he flows through: [wind-up, blow, name].
  const STRIKES = [
    [{ lean: -0.1, sF: 0.6, eF: 1.6, sB: -0.4, eB: 0.6, hF: 0.3, kF: 0.3, hB: -0.4, kB: 0.2 }, { lean: 0.32, sF: 1.68, eF: 0.05, sB: -0.9, eB: 0.3, hF: 0.75, kF: 0.4, hB: -0.65, kB: 0.05 }, "palm"],
    [{ lean: 0.25, sB: 0.3, eB: 1.8, sF: 0.8, eF: 1.2, hF: 0.4, kF: 0.5 }, { lean: -0.35, head: 0.25, sB: 1.95, eB: 0.15, sF: -0.6, eF: 1.0, hF: 0.95, kF: 0.25, hB: -0.2, kB: 0.6 }, "cup"],
    [{ lean: 0.1, hF: 0.6, kF: 1.6, sF: 1.2, eF: 1.2, sB: -1.0 }, { lean: -0.5, hF: 2.15, kF: 0.05, hB: -0.12, kB: 0.05, sF: 2.4, eF: 0.4, sB: -1.6, eB: 0.3 }, "kick"],
    [{ kF: 0.6, hF: 0.3, lean: 0.12, sF: 1.0, eF: 1.5 }, { lift: 18, hF: 1.75, kF: 2.2, hB: -0.5, kB: 0.9, sF: 1.4, eF: 1.9, sB: -1.3, lean: 0.18 }, "knee"],
    [{ lean: 0.3, hF: 0.9, kF: 1.9, hB: -0.4, kB: 1.7, sF: 1.0, eF: 1.2, sB: -0.8 }, { lean: 0.42, hF: 1.55, kF: 0.1, hB: -0.25, kB: 2.1, sF: 1.3, eF: 0.4, sB: -1.5, eB: 0.4 }, "sweep"],
  ];
  // His other moves, each [wind-up, blow, name].
  const HEAVY = [{ sF: 0.4, eF: 2.0, sB: 0.3, eB: 2.0, lean: -0.15, kF: 0.7, kB: 0.7, hF: 0.4, hB: -0.3 }, { sF: 1.62, eF: 0, sB: 1.5, eB: 0.1, lean: 0.38, hF: 0.85, kF: 0.6, hB: -0.75, kB: 0.1 }, "heavy"];
  const LAUNCH = [{ lean: 0.3, hF: 0.9, kF: 1.8, hB: -0.3, kB: 1.6, sF: 0.8, eF: 1.4, sB: -0.5 }, { lean: -0.55, hF: 2.7, kF: 0.1, hB: -0.1, kB: 0.05, sF: 2.6, eF: 0.3, sB: -1.8, eB: 0.3, lift: 26 }, "launch"];
  const SLAM = [{ sF: 3.0, eF: 0.4, sB: 2.8, eB: 0.4, lean: -0.3, hF: 0.4, kF: 0.4 }, { sF: 1.2, eF: 0.1, sB: 1.1, eB: 0.1, lean: 0.6, hF: 0.9, kF: 1.0, hB: -0.5, kB: 0.6 }, "slam"];
  const TOSS = [{ sF: 2.6, eF: 0.6, sB: -0.6, lean: -0.15, hF: 0.4, kF: 0.4 }, { sF: 1.25, eF: -0.25, sB: -1.0, lean: 0.25, hF: 0.7, kF: 0.3, hB: -0.5 }, "water"];
  const LASH = [{ sF: 2.9, eF: 0.4, sB: -0.8, lean: -0.25, hF: 0.3, kF: 0.3 }, { sF: 1.7, eF: 0.1, sB: -1.1, lean: 0.3, hF: 0.7, kF: 0.3, hB: -0.6 }, "rosary"];
  const HAUL = pose({ sF: 0.9, eF: 1.5, sB: -0.6, lean: -0.35, hF: 0.6, kF: 0.5, hB: -0.4, kB: 0.6 });
  const GRABP = pose({ sF: 1.5, eF: 0.3, sB: 1.4, eB: 0.4, lean: 0.2, hF: 0.5, kF: 0.6, hB: -0.4, kB: 0.4 });
  const FLING = pose({ sF: 2.8, eF: 0.2, sB: 2.6, eB: 0.2, lean: -0.3, hF: 0.7, kF: 0.3, hB: -0.6, kB: 0.2 });
  const HURT = pose({ lean: -0.45, head: -0.4, sF: 2.0, eF: 0.4, sB: 2.4, eB: 0.3, hF: 0.6, kF: 0.2, hB: -0.2, kB: 0.5 });
  const BLOCKP = pose({ lean: 0.2, head: 0.3, sF: 1.0, eF: 2.2, sB: 0.9, eB: 2.2, hF: 0.5, kF: 0.9, hB: -0.3, kB: 0.8 });
  const CROSS = [pose({ sF: 2.9, eF: 0.1, sB: -0.3, eB: 0.6, lean: -0.1, hF: 0.2, kF: 0.1, hB: -0.2 }), pose({ sF: 1.6, eF: 0.1, sB: -0.3, eB: 0.6, lean: 0.1 }), pose({ sF: 1.3, eF: 0.6, lean: 0.05 }), pose({ sF: 1.3, eF: 1.4, lean: 0.05 })];
  const blessP = (u) => keyPose([[0, CROSS[0]], [0.3, CROSS[1]], [0.55, CROSS[2]], [0.8, CROSS[3]], [1, idleP(0)]], u);
  const GRABBED = (t) => pose({ lean: -0.2 + 0.15 * Math.sin(t * 22), head: 0.3, sF: 1.8 + 0.4 * Math.sin(t * 17), eF: 0.4, sB: 2.2, eB: 0.6, hF: 0.4, kF: 0.3, hB: -0.3, kB: 0.4, lift: 8 });
  const DOWNP = pose({ lean: -1.45, head: -0.3, sF: 2.8, eF: 0.2, sB: 2.4, eB: 0.4, hF: 1.5, kF: 0.2, hB: 1.3, kB: 0.3, lift: -22 });
  // The takedown: a hop with the fist drawn back, then down on one knee, driving it home.
  const FIN_AIR = pose({ lean: -0.15, head: 0.2, sF: 3.0, eF: 0.6, sB: -0.9, eB: 0.6, hF: 1.5, kF: 2.3, hB: 0.5, kB: 1.9 });
  // The counter, as in Arkham Asylum: he catches the blow (the wrist, or the ankle of a kick),
  // twists, throws the demon down on its back, and pins it there with a knee.
  const CATCH_ARM = pose({ lean: 0.05, head: 0.2, sF: 1.55, eF: 0.12, sB: -0.5, eB: 1.3, hF: 0.5, kF: 0.6, hB: -0.45, kB: 0.4 });
  const CATCH_LEG = pose({ lean: 0.4, head: 0.45, sF: 1.05, eF: 0.1, sB: 0.7, eB: 0.4, hF: 0.6, kF: 1.1, hB: -0.45, kB: 0.8 });
  const TWIST = pose({ lean: -0.4, head: -0.1, sF: 2.75, eF: 0.35, sB: 2.3, eB: 0.6, hF: 0.75, kF: 0.4, hB: -0.65, kB: 0.35 });
  const PIN = pose({ lean: 0.62, head: 0.45, sF: 0.95, eF: 0.08, sB: -0.95, eB: 0.8, hF: 1.45, kF: 2.1, hB: -0.3, kB: 2.5, lift: -6 });
  const FIN_DROP = pose({ lean: 0.75, head: 0.45, sF: 0.75, eF: 0.05, sB: -1.2, eB: 0.5, hF: 1.4, kF: 2.0, hB: -0.35, kB: 2.5, lift: -6 });
  const CARRIEDP = pose({ lean: 0.1, head: -0.3, sF: 2.9, eF: 0.1, sB: 2.7, eB: 0.2, hF: 0.1, kF: 0.4, hB: -0.1, kB: 0.5 });
  // The angel: a dive with the wings folded back, a wing strike, and the climb away.
  const angelDive = pose({ lean: 0.9, head: 0.5, wa: -2.9, wl: 0.45, sF: 2.2, eF: 0.2, sB: 2.0, eB: 0.2, hF: -0.3, kF: 0.2, hB: -0.5, kB: 0.3 });
  const angelStrikeP = (u) => keyPose([[0, pose({ wa: -2.5, wl: 1, sF: 2.4, eF: 0.4, lean: -0.2, lift: 12 })], [0.45, pose({ wa: -0.35, wl: 1.25, sF: 1.6, eF: 0.0, lean: 0.4, lift: 6 })], [1, pose({ wa: -2.0, wl: 1, lift: 8 })]], u);
  const angelRise = pose({ wa: -2.3, wl: 1.25, lean: -0.1, sF: 0.4, eF: 0.3, hF: 0.1, kF: 0.3, hB: -0.1, kB: 0.4, lift: 10 });
  const angelCarry = pose({ wa: -2.2, wl: 1.2, lean: 0.1, sF: 1.0, eF: 0.6, sB: 0.9, eB: 0.7, hF: 0.1, kF: 0.3, hB: -0.1, kB: 0.4, lift: 10 });
  // Demons: hunched, twitching; the slapstick is all theirs.
  const demonIdle = (t, k) => pose({ lean: 0.35 + 0.08 * Math.sin(t * 2.3 + k), head: 0.3 + 0.2 * Math.sin(t * 3.1 + k), sF: 0.7 + 0.3 * Math.sin(t * 2 + k), eF: 0.8, sB: 0.4, eB: 0.9, hF: 0.25, kF: 0.5, hB: -0.3, kB: 0.4 });
  const demonWalk = (ph) => pose({ lean: 0.45, head: 0.3, sF: 0.5 + 0.5 * Math.sin(ph), eF: 0.8, sB: 0.5 - 0.5 * Math.sin(ph), eB: 0.8, hF: 0.5 * Math.sin(ph), kF: 0.6 + 0.3 * Math.cos(ph), hB: -0.5 * Math.sin(ph), kB: 0.6 - 0.3 * Math.cos(ph) });
  const KICK_WIND = pose({ lean: -0.3, head: 0.25, sF: 1.1, eF: 1.2, sB: -0.8, eB: 0.9, hF: 1.5, kF: 1.9, hB: -0.15, kB: 0.25 });
  const KICK_HIT = pose({ lean: -0.45, head: 0.3, sF: 1.3, eF: 0.8, sB: -1.0, eB: 0.6, hF: 1.75, kF: 0.05, hB: -0.1, kB: 0.15 });
  const demonWind = (grab) => grab === "kick" ? KICK_WIND : grab ? pose({ lean: -0.1, head: 0.1, sF: 2.4, eF: 0.4, sB: 2.2, eB: 0.5, hF: 0.4, kF: 0.6, hB: -0.5, kB: 0.6 }) : pose({ lean: -0.15, head: 0.2, sF: 2.7, eF: 0.8, sB: -0.6, eB: 0.6, hF: 0.4, kF: 0.4, hB: -0.6, kB: 0.3 });
  const demonLunge = (grab) => grab === "kick" ? KICK_HIT : grab ? pose({ lean: 0.9, head: 0.5, sF: 1.7, eF: 0.1, sB: 1.6, eB: 0.1, hF: 0.9, kF: 0.4, hB: -0.9, kB: 0.2 }) : pose({ lean: 0.7, head: 0.4, sF: 1.6, eF: -0.1, sB: -1.2, eB: 0.4, hF: 0.9, kF: 0.4, hB: -0.8, kB: 0.1 });
  const demonHurt = (t) => pose({ lean: -0.6, head: -0.7, sF: 2.3 + Math.sin(t * 30) * 0.4, eF: 0.6, sB: 2.8, eB: 0.3, hF: 0.7, kF: 0.4, hB: -0.1, kB: 0.6 });
  const demonDizzy = (t) => pose({ lean: 0.2 * Math.sin(t * 4), head: 0.5 * Math.sin(t * 4 + 1), sF: 0.2 + 0.4 * Math.sin(t * 4), eF: 0.3, sB: -0.2, eB: 0.3, hF: 0.25 * Math.sin(t * 4), kF: 0.5, hB: -0.25 * Math.sin(t * 4), kB: 0.5 });
  const demonFlail = (t) => pose({ lean: -0.5, head: -0.6, sF: 2.5 + Math.sin(t * 40) * 0.6, eF: 0.4, sB: 3.0 + Math.cos(t * 37) * 0.6, eB: 0.2, hF: 1.2 + Math.sin(t * 33) * 0.5, kF: 0.4, hB: 0.6 + Math.cos(t * 29) * 0.5, kB: 0.2, spin: -t * 4 });
  const demonFace = () => pose({ lean: 1.45, head: 0.8, sF: 2.9, eF: 0.1, sB: 3.0, eB: 0, hF: 0.2, kF: 0, hB: -0.2, kB: 0, lift: -18 });
  const demonPulled = (t) => pose({ lean: 0.9, head: 0.6, sF: -0.6 + 0.3 * Math.sin(t * 30), eF: 0.3, sB: -0.9, eB: 0.2, hF: -0.5, kF: 0.2, hB: -0.8, kB: 0.1, lift: 6 });
  // Knocked flat on its back, twitching, the feet toward him; and getting up again.
  const demonFloored = (t, big) => pose({ spin: -PI / 2 + 0.03 * Math.sin(t * 9), lean: -0.15, head: -0.5 + 0.25 * Math.sin(t * 13), sF: 2.7 + 0.15 * Math.sin(t * 11), eF: 0.5, sB: 2.2, eB: 0.7, hF: 0.55 + 0.1 * Math.sin(t * 7), kF: 1.0, hB: 0.2, kB: 0.5, lift: big ? -46 : -42 });
  const demonRise = (t, big, u, face) => blendPose(face ? demonFace() : demonFloored(t, big), demonIdle(t, 0), smooth(u));

  // ---- Words, for whichever hands are playing ---------------------------------------------------------
  const tip = (touch, keys) => (usingKeys() ? keys : touch);
  // Each wave: who comes, and when (seconds into the wave), and what the angel says.
  const WAVES = [
    { foes: [["whisper", 0.6], ["whisper", 1.6], ["whisper", 6], ["whisper", 9]], gap: [2.6, 3.4],
      say: () => G.practised ? "There they are. As I showed you: never the same blow twice, keep moving, and finish them when they fall." : tip("Tap a demon to strike, then on to the next: never the same blow twice on the same one. Keep the flow, and I will come down to you.", "Arrows to move, Space to strike, then on to the next: never the same blow twice on the same one. Keep the flow, and I will come down to you.") },
    { foes: [["whisper", 0.6], ["grab", 1.4], ["whisper", 4], ["whisper", 8], ["whisper", 11]], gap: [1.9, 2.7],
      say: () => tip("More of them. That big one grabs: if it catches you, it drags us all into the Depths. When it shows its red sign, hold to block it.", "More of them. That big one grabs: if it catches you, it drags us all into the Depths. When it shows its red sign, hold Q to block it.") },
    { chains: true, foes: [["whisper", 1.5], ["whisper", 4]], gap: [1.8, 2.6],
      say: () => tip("His guardian, in chains! Tap the chains to bless them. Break them!", "His guardian, in chains! Go to them and press Space to bless them. Break them!") },
    { foes: [["shield", 0.6], ["whisper", 1.2], ["grab", 4], ["whisper", 7], ["whisper", 10], ["whisper", 13]], gap: [1.4, 2.2],
      say: () => tip("That one hides behind a shield. Tap it twice, quickly, for a heavy blow.", "That one hides behind a shield. Press C for a heavy blow to break it.") },
    { foes: [["grab", 0.6], ["whisper", 1], ["shield", 3], ["whisper", 5], ["whisper", 8], ["grab", 11], ["whisper", 13]], gap: [1.3, 2.0],
      say: () => "The last of them, all together. Keep moving. Finish them where they fall." },
  ];

  // ---- The practice: the angel shows him every move, in his mind, against shades -------------------
  // Each lesson: what the angel says, a short hint at the foot of the screen, how many shades to keep
  // on the roof (and how tough), what to set up, and the event that finishes it.
  const KATA = [
    { say: () => tip("Before we go down, let me show you. Here a moment can be as long as we need. These shades are only pictures. Tap one to strike it.", "Before we go down, let me show you. Here a moment can be as long as we need. These shades are only pictures. Hold an arrow toward one and press Space."),
      hint: () => tip("TAP A SHADE", "ARROW + SPACE"), need: 2, hp: 4, done: (e) => e === "hit" },
    { say: () => tip("Now from one to the next. Never the same blow twice on the same one, or you trip over your own feet. Four in a row.", "Now from one to the next, turning the arrows. Never the same blow twice on the same one, or you trip over your own feet. Four in a row."), hint: () => tip("TAP ONE · THEN ANOTHER", "SPACE ON ONE · THEN ANOTHER"), need: 3, hp: 6, done: () => G.hero.combo >= 4 },
    { say: () => tip("Tap the open roof, and you are there at once. Get clear of them.", "The arrows move you. Run clear of them."), hint: () => tip("TAP THE OPEN ROOF", "ARROWS"), need: 2, hp: 6, done: (e) => e === "dash" || e === "run" },
    { say: () => tip("Watch for the gold sign. When it shows, tap him: you catch the blow, throw him down and pin him.", "Watch for the gold sign. When it shows, press X: you catch the blow, throw him down and pin him."), hint: () => tip("GOLD SIGN: TAP HIM", "GOLD SIGN: X"), need: 2, hp: 6, setup: "gold", done: (e) => e === "counter" },
    { say: () => tip("A red sign is a grab: it cannot be countered. Hold on the open roof to block it, and the light you pray in throws him off.", "A red sign is a grab: it cannot be countered. Hold Q to block it, and the light you pray in throws him off."), hint: () => tip("RED SIGN: HOLD ON THE OPEN ROOF", "RED SIGN: HOLD Q"), need: 1, hp: 6, kind: "grab", setup: "red", done: (e) => e === "blockred" },
    { say: () => tip("A block stops one blow, gold or red. Then let go, and hold again for the next. Block two.", "A block stops one blow, gold or red. Then let go of Q, and hold it again for the next. Block two."), hint: () => tip("HOLD · LET GO · HOLD AGAIN", "HOLD Q · LET GO · HOLD AGAIN"), need: 2, hp: 6, setup: "block", count: 2, done: (e) => e === "blocked" },
    { say: () => tip("This one hides behind a shield. Tap it twice, quickly: a heavy blow.", "This one hides behind a shield. Press C: a heavy blow."), hint: () => tip("TAP TWICE, QUICKLY", "C"), need: 1, hp: 6, kind: "shield", done: (e) => e === "guardbreak" },
    { say: () => tip("Swipe up on a shade to launch it, then tap it while it hangs in the air.", "Press E to launch a shade, then Space while it hangs in the air."), hint: () => tip("SWIPE UP ON IT · THEN TAP IT", "E · THEN SPACE"), need: 2, hp: 7, done: (e) => e === "juggle" },
    { say: () => tip("Launch one again, then swipe down on it in the air: slam it to the ground.", "Launch one again, then press V while it is in the air: slam it down."), hint: () => tip("SWIPE UP · THEN SWIPE DOWN ON IT", "E · THEN V"), need: 2, hp: 7, done: (e) => e === "spike" },
    { say: () => tip("When one goes down, it stays down a moment. Get to it before it rises, tap it, and finish it.", "When one goes down, it stays down a moment. Get to it before it rises, press Space toward it, and finish it."),
      hint: () => tip("TAP THE ONE THAT IS DOWN", "SPACE TOWARD THE ONE THAT IS DOWN"), need: 3, hp: 7, setup: "floor", count: 2, done: (e) => e === "takedown" },
    { say: () => tip("Now strike, and keep striking. When the gold shows, time will slow for you: tap him, then flow on. Six in a row.", "Now strike, and keep striking. When the gold shows, time will slow for you: press X, then flow on. Six in a row."),
      hint: () => tip("STRIKE · COUNTER THE GOLD · KEEP GOING", "SPACE · X ON THE GOLD · KEEP GOING"), need: 3, hp: 9, setup: "flowgold", done: () => G.hero.combo >= 6 && G.kata.countered },
    { say: () => tip("Holy water: hold on a shade a moment, until the ring fills, then let go. Near or far, it reaches.", "Holy water: press F, at a shade near or far."), hint: () => tip("HOLD ON A SHADE · THEN LET GO", "F"), need: 2, hp: 7, done: (e) => e === "water" },
    { say: () => tip("Now drag a shade that is far off: your rosary flies out, wraps round it, and hauls it in.", "Press R: your rosary flies out to a shade far off, wraps round it, and hauls it in."), hint: () => tip("DRAG A FAR SHADE", "R"), need: 2, hp: 7, far: true, done: (e) => e === "stole" },
    { say: () => tip("Now drag a shade that is close, toward another: you throw it.", "Now press T to throw a shade that is close, toward another."), hint: () => tip("DRAG A NEAR SHADE TOWARD ANOTHER", "ARROW + T"), need: 3, hp: 7, done: (e) => e === "throw" },
    { say: () => "Now flow, with all of it, never the same blow twice. Five in a row, and I will come down to you. And the longer you flow, the harder you strike.", hint: () => "FIVE IN A ROW", need: 3, hp: 8, done: (e) => e === "swoop" },
    { id: "heights", say: () => tip("Now the long flow: twelve in a row, and we rise to the Heights, all of them with us. Up there, keep going, then tap the gold, and we come down on them from on high.", "Now the long flow: twelve in a row, and we rise to the Heights, all of them with us. Up there, keep going, then press B, and we come down on them from on high."),
      hint: () => G.world === "heights" ? tip("TAP THE GOLD: FROM ON HIGH", "B: FROM ON HIGH") : tip("TWELVE IN A ROW", "TWELVE IN A ROW"), need: 3, hp: 9, done: (e) => e === "heightsOut" },
    { say: () => "And three falls in a row, from tripping or from blows, or a grab that catches you, and they drag you down into the Depths, all of them with you. Ten in a row down there, and we rise again.", hint: () => "", need: 0, wait: 7.5 },
    { say: () => "Enough. They are waiting for us. Down to the street.", hint: () => "", need: 0, wait: 3.2, last: true },
  ];
  const HEIGHTS_LESSON = KATA.findIndex((L) => L.id === "heights");

  function start(done, opts) {
    opts = opts || {};
    const ww = Math.round(W * 3), hx0 = ww / 2 - W * 0.22;
    bg = null;
    G = {
      done, opts, t: 0, ts: 1, slowT: 0, slowTs: 1, zoom: { k: 1, x: hx0, y: H / 2 }, cam: { k: 1, x: hx0, y: H / 2 }, view: { k: 1, cx: hx0, cy: H / 2 }, freeze: 0, muffled: false, ww,
      warnT: 0, warnF: null, pulseT: 0, pulseTs: 1, slowVis: 0, takedowns: 0, chainTD: 0,
      base: opts.kata ? "kata" : "street", world: opts.kata ? "kata" : "street", worldT: 0, shift: null, banner: null, whispers: [], whisperT: 2,
      wave: -1, waveT: 0, foes: [], parts: [], pops: [], spawnQ: [], nextAtk: 2, touch: null, lastTap: null, msg: null, flash: 0, flashC: "#fff", shake: 0,
      hero: { x: hx0, y: 300, z: 0, dir: 1, act: { kind: "idle", t: 0 }, resolve: 100, spirit: 0, inv: 0, combo: 0, comboT: 0, best: 0, queue: null, hits: 0, last: null },
      angel: { x: hx0, y: 300, z: SKY, dir: 1, act: { kind: "above", t: 0 }, t: 0, lightX: hx0, catchT: 0 },
      guard: { chains: 6, freed: false, t: 0, fight: 0, nextHit: 0, x: ww / 2 - 40 },
      taught: {}, over: 0, down: 0, keys: {}, launched: false, practised: false, kata: null,
    };
    if (opts.kata) { G.kata = { i: -1, t: 0, setT: 0, again: 0 }; kataNext(); Sound.play(SONGS.fight); Sound.setLevel(0); }
    else { nextWave(); Sound.play(SONGS.fight); Sound.setLevel(1); Sound.fill("hit"); }
    Sound.ambience({ wind: 0, rain: 0 });
    mode = Fight;
  }
  function say(t, who) { G.msg = { text: t, t: 0, who: who || "angel" }; if ((who || "angel") === "angel") Sound.fx.chord(G.t | 0); else if (who === "guardian") Sound.fx.lowChord(1); }
  function nextWave() {
    G.wave++; G.waveT = 0; G.hurtWave = false;
    const w = WAVES[G.wave]; if (!w) return;
    for (const [kind, at] of w.foes) G.spawnQ.push({ kind, at });
    say(w.say());
    if (G.wave > 0) Sound.fill("hit");
    G.nextAtk = 2.2;
  }
  let foeId = 0;
  // They come up out of the street near him, through a hole that burns open and closes after them.
  function spawn(kind, at, hp) {
    const H0 = G.hero, shade = G.world === "kata" || kind === "shade";
    let x = at ? at.x : 0, y = at ? at.y : lerp(Y0 + 10, Y1 - 6, Math.random());
    if (!at) {
      // A place on the screen to one side of him, not on top of another of them.
      for (let k = 0; k < 8; k++) {
        const side = (foeId + k) % 2 ? 1 : -1;
        x = clamp(H0.x + side * (W * 0.2 + Math.random() * W * 0.2), 60, G.ww - 60);
        if (!G.foes.some((o) => !o.gone && Math.abs(o.x - x) < 56 && Math.abs(o.y - y) < 30)) break;
      }
    }
    const f = { id: ++foeId, kind: kind === "shade" ? "whisper" : kind, x, y, z: 0, vz: 0, vx: 0, dir: H0.x >= x ? 1 : -1,
      hp: hp || (kind === "grab" ? 12 : kind === "shield" ? 10 : 9), act: { kind: "emerge", t: 0, dur: 0.95 }, sign: null, stun: 0, dizzy: 0, shield: kind === "shield", hat: true, hatKind: foeId % 3 === 0 ? 1 : 0,
      slot: Math.random() * TAU, ph: Math.random() * 10, seed: Math.random() * 10, rim: shade ? "#a8acc8" : DEMON_RIMS[foeId % 3], shade, holeT: 0 };
    f.max = f.hp; G.foes.push(f);
    puff(f.x, f.y - 4, "#000000", 8, true);
    Sound.fx.growl(0.6); Sound.fx.hit(0.35, pan(f.x));
    return f;
  }
  const alive = () => G.foes.filter((f) => !f.gone);

  // ---- Lessons -------------------------------------------------------------------------------------
  function kataNext() {
    const K = G.kata; K.i++; K.t = 0; K.setT = 0; K.again = 0; K.n = 0; K.countered = false;
    const L = KATA[K.i];
    if (!L) return;
    say(L.say());
    G.hero.combo = 0; G.hero.comboT = 0;
    for (const f of G.foes) if (!f.gone) { f.sign = null; if (f.act.kind === "wind" || f.act.kind === "lunge") f.act = { kind: "idle", t: 0 }; }
    // A shade of the right kind, if the lesson needs one.
    if (L.kind && !alive().some((f) => f.kind === L.kind)) spawn(L.kind, { x: clamp(G.hero.x + 170, 80, G.ww - 80), y: G.hero.y }, L.hp);
    if (L.far) for (const f of alive()) if (Math.abs(f.x - G.hero.x) < 200) { f.x = clamp(G.hero.x + (f.x >= G.hero.x ? 1 : -1) * W * 0.4, 60, G.ww - 60); }
  }
  // Something the player did, for the lesson in hand.
  function ev(name) {
    const K = G.kata; if (!K || K.passed) return;
    const L = KATA[K.i]; if (!L || !L.done) return;
    if (L.done(name)) {
      // Some lessons want the thing done more than once.
      if (L.count && ++K.n < L.count) { pop(G.hero.x, G.hero.y - 150, "AGAIN", C.holy); return; }
      pass();
    }
  }
  function pass() { const K = G.kata; K.passed = 0.9; Sound.fx.chord(K.i + 2, 1.2); pop(G.hero.x, G.hero.y - 150, "GOOD", C.holy); }
  function stepKata(dt) {
    const K = G.kata, L = KATA[K.i], H0 = G.hero;
    if (!L) return;
    K.t += dt;
    if (K.passed) { K.passed -= dt; if (K.passed <= 0) { K.passed = 0; kataNext(); } return; }
    if (L.wait && K.t > L.wait) { if (L.last) kataEnd(); else kataNext(); return; }
    if (L.done && L.done(null) && K.t > 0.5) { pass(); return; }
    // Keep enough shades on the roof.
    const n = alive().filter((f) => !f.shield || L.kind === "shield").length;
    if (L.need && n < L.need && !G.shift && G.world === "kata") {
      K.spawnT = (K.spawnT || 0) - dt;
      if (K.spawnT <= 0) { K.spawnT = 0.5; const x = clamp(H0.x + (Math.random() < 0.5 ? -1 : 1) * (L.far ? W * 0.4 : 110 + Math.random() * 120), 70, G.ww - 70); spawn("shade", { x, y: lerp(Y0 + 10, Y1 - 10, Math.random()) }, L.hp); }
    }
    // The set pieces: a gold sign to counter, a red one to dodge, a blow to block.
    const s = alive().filter((f) => f.act.kind === "idle" && f.z === 0 && !f.shield);
    const winding = G.foes.some((f) => !f.gone && (f.act.kind === "wind" || f.act.kind === "lunge"));
    if (L.setup === "gold" || L.setup === "red") {
      if (!winding && K.t > 1.2 && K.t - K.setT > 2.2) {
        const f = (L.setup === "red" ? s.filter((o) => o.kind === "grab") : s).sort((a, b) => Math.abs(a.x - H0.x) - Math.abs(b.x - H0.x))[0];
        if (f) { K.setT = K.t; windUp(f, L.setup === "red", 1.2); G.slowFor = f; if (K.again) say(L.setup === "red" ? "Again. Away from the red." : "Again. Watch for the gold."); K.again++; }
      }
    } else if (L.setup === "block") {
      if (H0.act.kind === "block" && H0.act.t > 0.25 && !winding) {
        const f = s.sort((a, b) => Math.abs(a.x - H0.x) - Math.abs(b.x - H0.x))[0];
        if (f) { f.x = H0.x + (f.x >= H0.x ? 70 : -70); windUp(f, false, 0.5); }
      }
    } else if (L.setup === "floor") {
      // One shade knocked flat, away from him, so he has to go to it.
      if (!G.foes.some((f) => !f.gone && f.act.kind === "floored") && K.t > 1.0 && K.t - K.setT > 1.2) {
        const f = s.sort((a, b) => Math.abs(b.x - H0.x) - Math.abs(a.x - H0.x))[0];
        if (f) { K.setT = K.t; floor(f); pop(f.x, f.y - 90, "DOWN", C.holy); }
      }
    } else if (L.setup === "flowgold") {
      // Once he has a combo going, one of the others draws back to strike.
      if (H0.combo >= 2 && !winding && K.t - K.setT > 1.6) {
        const f = s.filter((o) => o !== H0.last).sort((a, b) => Math.abs(a.x - H0.x) - Math.abs(b.x - H0.x))[0];
        if (f) { K.setT = K.t; windUp(f, false, 1.1); }
      }
    }
  }
  function kataEnd() {
    G.kata = null; G.practised = true; G.slowFor = null;
    save.practised = true; store();
    for (const f of G.foes) if (!f.gone) { f.gone = true; f.act = { kind: "castout", t: 0.5 }; puff(f.x, f.y - 60, C.holy, 8, false); }
    if (G.opts.only) { G.over = 0.001; G.leaving = true; return; }
    // Down to the street: the real fight.
    G.taught.gold = G.taught.red = true;
    G.base = "street"; G.shift = { from: "kata", to: "street", t: 0, down: true };
    G.hero.combo = 0; G.hero.spirit = Math.min(G.hero.spirit, 4); G.hero.resolve = 100;
  }

  // ---- Slow motion -----------------------------------------------------------------------------------
  // Time slows hard at the great moments (a counter, a takedown, the angel's swoop, the last demon
  // cast out), and the camera pushes in on them. Every blow lands with a short stop and a breath
  // of slow time, deeper as the combo builds; past four in a row the whole fight runs a little
  // slow, as time does for someone who is wholly in it. When a demon near him draws back, time
  // all but stops for a beat (the warning), then runs at half speed until the blow comes: time
  // to counter, and flow on.
  function slowmo(ts, secs, x, y, k) {
    if (G.slowT > 0 && ts > G.slowTs) return;
    G.slowTs = ts; G.slowT = secs; G.zoom = { k: k || 1.15, x, y };
  }
  const hitStop = (s) => { G.freeze = Math.max(G.freeze, s); };
  const pulse = (ts, secs) => { if (G.pulseT > 0 && ts > G.pulseTs) return; G.pulseTs = ts; G.pulseT = secs; };
  function engaged() {
    const H0 = G.hero;
    return G.foes.some((f) => !f.gone && f.act.kind === "wind" && f.act.t < f.act.dur * 0.6 && Math.abs(f.x - H0.x) < 260);
  }
  function warn(f) {
    if (G.over || G.down || G.shift || Math.abs(f.x - G.hero.x) > 340) return;
    G.warnT = G.hero.combo >= 2 ? 0.5 : 0.38; G.warnF = f;
    Sound.fx.tick(f.sign === "red" ? 1500 : 2600, 1.4); Sound.fx.whoosh(0.35, 0.35, true);
    G.parts.push({ kind: "warn", f, t: 0, c: f.sign === "red" ? "#ff3040" : C.holy });
  }

  // ---- What the player does -------------------------------------------------------------------------
  const BUSY = ["strike", "zip", "counter", "hurt", "grabbed", "dodge", "bless", "chain", "down", "jumpkick", "dash", "toss", "lash", "haul", "grab", "spike", "finish", "trip", "finisher"];
  const lying = (f) => f && !f.gone && f.act.kind === "floored";
  const busy = () => BUSY.includes(G.hero.act.kind) || !!G.shift;
  function act(kind, o) { G.hero.act = Object.assign({ kind, t: 0 }, o); }
  function reachX(f) { return f.x - Math.sign(f.x - G.hero.x || 1) * (f.kind === "grab" ? 62 : 54) * depth(f.y); }
  const near = (f) => Math.abs(f.x - G.hero.x) < 135 && Math.abs(f.y - G.hero.y) < 45;
  // ---- The drunken master's one rule: never the same blow twice on the same demon -------------------
  // The same move on the same demon twice running, and he trips over his own feet and goes down,
  // and it costs him. The same move on another demon is a new move. Three falls in a row (trips,
  // or blows taken) and they drag the whole fight down into the Depths; three clean blows in a row
  // and the count starts again.
  let replaying = false;
  // `instead`: this move takes the place of the blow just chosen on the same demon, before it landed
  // (a strike turned into a heavy blow by a second quick tap), so it is weighed against the move
  // before that one. Tapping one demon as fast as you can is strike, heavy, strike, heavy: a trip.
  function fresh(kind, f, instead) {
    if (replaying) return true;
    const L = instead ? G.prevMove : G.lastMove;
    if (L && L.kind === kind && L.f === f && f && !f.gone) { trip(); return false; }
    if (!instead) G.prevMove = G.lastMove;
    G.lastMove = { kind, f };
    return true;
  }
  const moved = (kind) => { if (!replaying) { G.prevMove = G.lastMove; G.lastMove = { kind, f: null }; } };
  function trip() {
    const H0 = G.hero;
    if (["trip", "down", "grabbed"].includes(H0.act.kind) || G.shift) return;
    G.lastMove = null; G.prevMove = null; H0.queue = null; H0.combo = 0; H0.comboT = 0;
    act("trip", { dur: 0.95, x0: H0.x });
    Sound.fx.gasp(); Sound.fx.hit(0.7); G.shake = 5;
    pop(H0.x, H0.y - 140, "TRIPPED: THE SAME BLOW TWICE", "#ff8a70");
    if (!G.taught.trip) { G.taught.trip = true; say("Never the same blow twice on the same one, or you trip over your own feet. Change your blow, or change your demon."); }
    if (!G.kata) hurtHero(8, true);
    woe();
  }
  // A fall counted: three in a row, and down to the Depths, all of them with him.
  function woe() {
    if (G.kata || G.world !== "street" || G.shift || G.over || G.down) return;
    G.woe = (G.woe || 0) + 1; G.woeT = 0.8;
    if (G.woe === 2 && !G.taught.woe) { G.taught.woe = true; say("Careful, Father! One more fall, and they drag us all down into the Depths."); }
    if (G.woe >= 3) { G.woe = 0; G.woeDrag = 0.55; pop(G.hero.x, G.hero.y - 165, "THREE FALLS: DRAGGED DOWN", "#ff5a3a"); Sound.fx.growl(1.2); }
  }
  function tapDemon(f, fromKey) {
    const H0 = G.hero, now = G.t;
    if (H0.act.kind === "grabbed" || H0.act.kind === "down" || G.over || G.shift) return;
    // One that is down: go to it and finish it.
    if (lying(f)) { finishFoe(f); return; }
    // Two quick taps on the same demon: the heavy blow. (On the keyboard, C.)
    if (!fromKey && G.lastTap && G.lastTap.f === f && now - G.lastTap.t < 0.34 * Math.max(G.ts, 0.3)) { G.lastTap = null; heavy(f); return; }
    G.lastTap = { f, t: now };
    // The gold sign: a counter, whatever he was doing.
    if (f.sign === "gold" && f.act.kind === "wind") { counter(f); return; }
    if (f.sign === "red" && f.act.kind === "wind") { pop(f.x, f.y - 120 * depth(f.y), tip("HOLD TO BLOCK!", "HOLD Q!"), "#ff8a70"); return; }
    if (!fresh(f.z > 20 ? "air" : "strike", f)) return;
    if (busy() && H0.act.kind !== "hurt") { H0.queue = { f, move: "strike" }; return; }
    goStrike(f, "strike");
  }
  // Zip to a demon (a flip, a roll, a lurch: never a walk), then the move. One in the air is met
  // with a jumping kick that keeps it there, or a slam that spikes it down.
  function goStrike(f, move) {
    const H0 = G.hero; if (f.gone) return;
    H0.dir = f.x >= H0.x ? 1 : -1;
    if (move === "finish") {
      // To one lying down: a flip to its side, then the hop and the blow.
      const side = Math.sign(f.x - H0.x || 1), tx = f.x - side * 26, ty = f.y + 4, d = Math.abs(tx - H0.x) + Math.abs(ty - H0.y);
      if (d > 60) { act("zip", { f, move, style: "flip", dur: clamp(d / 640, 0.16, 0.36), from: [H0.x, H0.y], to: [tx - side * 30, ty] }); Sound.fx.whoosh(0.22, 0.5); }
      else doMove(f, move);
      return;
    }
    if (f.z > 20 && (move === "strike" || move === "slam")) {
      act(move === "slam" ? "spike" : "jumpkick", { f, dur: 0.32, from: [H0.x, H0.y], to: [f.x - H0.dir * 40, f.y + 2] }); Sound.fx.whoosh(0.25, 0.6, true); return;
    }
    const tx = reachX(f), d = Math.abs(tx - H0.x) + Math.abs(f.y - H0.y);
    if (d > 26) {
      // Never the same way twice running: a flip, a roll, a flying kick, a cartwheel, or flat out
      // in the air like a monk's prostration (or Superman).
      G.zipN = (G.zipN || 0) + 1;
      const set = d > 220 ? ["flip", "superman", "jumpkick"] : d > 80 ? ["roll", "jumpkick", "cartwheel", "superman", "flip"] : ["lurch", "roll", "cartwheel"];
      const style = set[(G.zipN + f.id) % set.length];
      act("zip", { f, move, style, dur: clamp(d / 600, 0.16, 0.4) * (style === "superman" ? 1.15 : 1), from: [H0.x, H0.y], to: [tx, f.y + 1] });
      Sound.fx.whoosh(0.22, 0.5);
    } else doMove(f, move);
  }
  function doMove(f, move, style) {
    const H0 = G.hero, sp = R().strike;
    if (move === "finish") {
      const side = Math.sign(f.x - H0.x || H0.dir); H0.dir = side;
      act("finish", { f, dur: 0.5 * sp, hit: false, from: [H0.x, H0.y], to: [f.x - side * 24, f.y + 4] }); Sound.fx.effort(); return;
    }
    if (lying(f)) { finishFoe(f); return; }
    if (move === "heavy") { act("strike", { f, which: HEAVY, dur: 0.36 * sp, hit: false }); Sound.fx.effort(); return; }
    if (move === "launch") { act("strike", { f, which: LAUNCH, dur: 0.34 * sp, hit: false }); Sound.fx.effort(); return; }
    if (move === "slam") { act("strike", { f, which: SLAM, dur: 0.32 * sp, hit: false }); Sound.fx.effort(); return; }
    // Coming in with a flying kick, he strikes with the kick; out of the dive, with his palm.
    act("strike", { f, which: style === "jumpkick" ? STRIKES[2] : style === "superman" ? STRIKES[0] : STRIKES[H0.hits % STRIKES.length], dur: 0.24 * sp, hit: false });
    Sound.fx.effort(H0.dir * 0.3);
  }
  // A heavy blow, a launch or a slam: if he is already on his way to that demon, the move changes.
  function special(f, move) {
    if (!f || f.gone || G.over || G.shift) return;
    if (lying(f)) { finishFoe(f); return; }
    const a = G.hero.act, q = G.hero.queue, LM = G.lastMove;
    const pending = LM && LM.f === f && LM.kind === "strike" && ((a.kind === "zip" && a.f === f && a.move === "strike") || (a.kind === "strike" && a.f === f && !a.hit && STRIKES.includes(a.which)) || (q && q.f === f && q.move === "strike"));
    if (!fresh(move === "slam" && f.z > 20 ? "spike" : move, f, pending)) return;
    if (a.kind === "zip" && a.f === f) { a.move = move; return; }
    if (a.kind === "strike" && a.f === f && !a.hit && STRIKES.includes(a.which)) { doMove(f, move); return; }
    if (busy() && a.kind !== "hurt") { G.hero.queue = { f, move }; return; }
    goStrike(f, move);
  }
  const heavy = (f) => special(f, "heavy"), launch = (f) => special(f, "launch"), slam = (f) => special(f, "slam");
  // The takedown: to one lying on the street, before it rises.
  function finishFoe(f) {
    const H0 = G.hero;
    if (!lying(f) || G.over || G.shift || ["grabbed", "down", "bless"].includes(H0.act.kind)) return;
    const a = H0.act;
    if (a.kind === "finish" && a.f === f) return;
    moved("takedown");
    if (a.kind === "zip" && a.f === f) { a.move = "finish"; return; }
    if (busy() && a.kind !== "hurt") { H0.queue = { f, move: "finish" }; return; }
    goStrike(f, "finish");
  }
  // Knocked flat: it lies on the street a moment (longer in the Heights, hardly at all in the
  // Depths) and cannot strike; then it gets up. `face` for one that fell on its face.
  function floor(f, o) {
    o = o || {};
    if (f.gone) return;
    if (f.act.kind === "floored") { f.act.t = Math.min(f.act.t, f.act.dur * 0.3); return; }
    f.act = { kind: "floored", t: 0, dur: R().floor * (o.long || 1), face: !!o.face };
    f.sign = null; f.z = 0; f.vz = 0; f.dizzy = 0; f.stun = 0;
    f.worn = f.worn || 0; while (f.worn < WORN.length && f.hp <= f.max * WORN[f.worn]) f.worn++;
    if (G.slowFor === f) G.slowFor = null;
    dustAt(f.x, f.y); Sound.fx.step(2.2);
    if (!G.taught.finish && !G.kata && !G.over) { G.taught.finish = true; say(tip("He is down! Tap him before he rises, and finish him.", "He is down! Space toward him before he rises, and finish him.")); }
  }
  // The blow that finishes one that is down: it is cast out where it lies.
  function takedown(f) {
    const H0 = G.hero;
    if (f.gone) return;
    if (!lying(f)) { landHit(f, 2, 1.6, { breaks: true }); return; }   // it got up before he came down
    countHit(f);
    H0.spirit = Math.min(SPIRIT, H0.spirit + 1);
    G.takedowns++;
    // Takedowns one after another, with no blow taken between, are the flow at its best.
    G.chainTD = G.lastTD && G.t - G.lastTD < 4 && H0.combo > 1 ? G.chainTD + 1 : 1; G.lastTD = G.t;
    slowmo(0.15, 0.5, f.x, f.y - 30, 1.3);
    hitStop(0.12); G.shake = 10; G.flash = 0.4; G.flashC = C.holy;
    G.parts.push({ kind: "beam", x: f.x, t: 0.3 }); G.parts.push({ kind: "ring", x: f.x, y: f.y, r: 8, t: 0.2 });
    sparks(f.x, f.y - 14, "#ffffff", 12); dustAt(f.x, f.y);
    Sound.fx.hit(2.2, pan(f.x)); Sound.fx.hah(1.3, H0.dir * 0.3); Sound.fx.clang();
    f.takenDown = true; f.hp = 0;
    castOut(f);
    pop(f.x, f.y - 92, G.chainTD > 1 ? "TAKEDOWN ×" + G.chainTD : "TAKEDOWN", "#ffffff", true);
    ev("takedown");
  }
  // Holy water, flicked at a demon from where he stands: it stuns, and keeps the flow going.
  function water(f, dx, dy) {
    const H0 = G.hero;
    if (G.over || G.shift || ["grabbed", "down", "bless", "toss", "trip"].includes(H0.act.kind)) return;
    if (f ? !fresh("water", f) : (moved("water"), false)) return;
    if (busy() && H0.act.kind !== "hurt") { if (f) H0.queue = { f, move: "water" }; return; }
    if (f) H0.dir = f.x >= H0.x ? 1 : -1; else if (dx) H0.dir = dx > 0 ? 1 : -1;
    const tx = f ? f.x : clamp(H0.x + (dx || H0.dir) * 260, FX0, FX1()), ty = f ? f.y : clamp(H0.y + (dy || 0) * 140, Y0, Y1);
    act("toss", { f, which: TOSS, dur: 0.3 * R().strike, tx, ty, fired: false });
    Sound.fx.whoosh(0.2, 0.5, true);
  }
  // The rosary: thrown out to a demon far off, wrapped round it, and hauled in.
  function stole(f) {
    const H0 = G.hero;
    if (!f || f.gone || G.over || G.shift || ["grabbed", "down", "bless"].includes(H0.act.kind)) return;
    if (lying(f)) { finishFoe(f); return; }
    if (near(f)) { if (fresh("strike", f)) { if (busy() && H0.act.kind !== "hurt") H0.queue = { f, move: "strike" }; else goStrike(f, "strike"); } return; }
    if (!fresh("arm", f)) return;
    if (busy() && H0.act.kind !== "hurt") { H0.queue = { f, move: "stole" }; return; }
    H0.dir = f.x >= H0.x ? 1 : -1;
    act("lash", { f, which: LASH, dur: 0.44 * R().strike });
    rosaryThrow(f);
    Sound.fx.whoosh(0.3, 0.8, false);
  }
  // ---- The rosary ----------------------------------------------------------------------------------
  // Thrown crucifix first: a real chain of beads (the crucifix, the five beads and the medal of its
  // tail, then five decades with the larger beads between) that swings with its own weight. It wraps
  // twice round the demon's middle, he hauls it in, and it slides back into his hand.
  const RN = 18;
  const handPos = () => { const H0 = G.hero; return jointAt("priest", H0.x, H0.y - H0.z, depth(H0.y), H0.dir, heroPose(), "hF"); };
  const waistOf = (f) => { const s = depth(f.y); return { x: f.x, y: f.y - f.z - 56 * s, rx: 16 * s, ry: 5.5 * s, s }; };
  function rosaryThrow(f) {
    const hp = handPos();
    G.rosary = { f, phase: "out", t: 0, L: 6, turns: 0, side: Math.sign(f.x - hp[0]) || 1, nodes: Array.from({ length: RN }, () => ({ x: hp[0], y: hp[1], px: hp[0], py: hp[1] })) };
  }
  function stepRosary(dt) {
    const Q = G.rosary; if (!Q) return;
    Q.t += dt;
    const N = Q.nodes, hp = handPos(), f = Q.f, H0 = G.hero;
    const holding = (H0.act.kind === "lash" || H0.act.kind === "haul") && H0.act.f === f;
    if ((!f || f.gone || !holding) && Q.phase !== "back") { Q.phase = "back"; Q.t = 0; }
    let end = null;
    if (Q.phase === "out") {
      const w = waistOf(f), u = clamp(Q.t / 0.24, 0, 1), e = ease(u);
      Q.side = Math.sign(w.x - hp[0]) || 1;
      end = { x: lerp(hp[0], w.x - Q.side * w.rx, e), y: lerp(hp[1], w.y, e) - Math.sin(u * PI) * 30 * w.s };
      Q.L = Math.hypot(end.x - hp[0], end.y - hp[1]) * 1.1 + 8;
      if (u >= 1) { Q.phase = "wrap"; Q.t = 0; Sound.fx.chain(false); }
    } else if (Q.phase === "wrap" || Q.phase === "haul") {
      const w = waistOf(f);
      Q.side = Math.sign(w.x - hp[0]) || 1;
      Q.turns = Q.phase === "wrap" ? 2 * smooth(Q.t / 0.2) : 2;
      end = { x: w.x - Q.side * w.rx, y: w.y };
      Q.L = Math.hypot(end.x - hp[0], end.y - hp[1]) * (Q.phase === "wrap" ? 1.06 : 1.0) + 4;
      if (Q.phase === "wrap" && Q.t >= 0.2) { Q.phase = "haul"; Q.t = 0; }
    } else {
      // Unwound, and drawn back into his hand.
      Q.turns = Math.max(0, Q.turns - dt * 14);
      Q.L = Math.max(0, Q.L - dt * 1400);
      if (Q.L <= 1 && Q.turns <= 0) { G.rosary = null; return; }
    }
    // The cord between: weight and swing, its length held, never below the street.
    const seg = Q.L / (RN - 1), floorY = Math.max(H0.y, f ? f.y : H0.y) - 2;
    for (let i = 1; i < RN; i++) { const n = N[i], vx = (n.x - n.px) * 0.97, vy = (n.y - n.py) * 0.97; n.px = n.x; n.py = n.y; n.x += vx; n.y = Math.min(floorY, n.y + vy + 520 * dt * dt); }
    for (let it = 0; it < 8; it++) {
      N[0].x = hp[0]; N[0].y = hp[1]; if (end) { N[RN - 1].x = end.x; N[RN - 1].y = end.y; }
      for (let i = 0; i < RN - 1; i++) {
        const a = N[i], b = N[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, diff = (d - seg) / d;
        const aFix = i === 0, bFix = !!end && i + 1 === RN - 1;
        if (aFix && bFix) continue;
        if (aFix) { b.x -= dx * diff; b.y -= dy * diff; } else if (bFix) { a.x += dx * diff; a.y += dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
    }
    N[0].x = hp[0]; N[0].y = hp[1]; if (end) { N[RN - 1].x = end.x; N[RN - 1].y = end.y; }
  }
  // The beads, laid along the coil round the demon and the cord back to his hand, from the crucifix:
  // { x, y, kind (0 crucifix, 1 large bead, 2 small, 3 medal), coil, back, a (the cord's direction) }.
  function rosaryBeads() {
    const Q = G.rosary; if (!Q) return [];
    const pts = [];
    if (Q.turns > 0.01 && Q.f && !Q.f.gone) {
      const w = waistOf(Q.f), a0 = Q.side > 0 ? PI : 0, steps = Math.max(2, Math.ceil(Q.turns * 26));
      for (let k = steps; k >= 0; k--) {
        const a = Q.turns * TAU * k / steps, phi = a0 - Q.side * a;
        pts.push({ x: w.x + Math.cos(phi) * w.rx, y: w.y + Math.sin(phi) * w.ry + (a / TAU - Q.turns / 2) * 3 * w.s, coil: true, back: Math.sin(phi) < -0.05 });
      }
    }
    for (let i = RN - 1; i >= 0; i--) pts.push({ x: Q.nodes[i].x, y: Q.nodes[i].y, coil: false, back: false });
    const s = depth(G.hero.y);
    let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (total < 2) return [];
    const sp = clamp(total / 61, 3.4 * s, 4.6 * s), out = [];
    out.pts = pts;
    let i = 1, acc = 0, segLen = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    for (let b = 0; b < 61; b++) {
      const want = b * sp;
      while (acc + segLen < want && i < pts.length - 1) { acc += segLen; i++; segLen = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); }
      if (acc + segLen < want) break;
      const u = segLen ? (want - acc) / segLen : 0, A = pts[i - 1], B = pts[i];
      const kind = b === 0 ? 0 : b === 6 ? 3 : (b === 1 || b === 5 || (b >= 7 && (b - 7) % 11 === 10)) ? 1 : 2;
      out.push({ x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), kind, coil: A.coil && B.coil, back: A.back || B.back, a: Math.atan2(A.y - B.y, A.x - B.x) });
    }
    return out;
  }
  // `which`: the coil's back, the coil's front, or the free cord.
  function drawRosary(beads, which) {
    const s = depth(G.hero.y), pick = (b) => which === "free" ? !b.coil : b.coil && (which === "back") === b.back, pts = beads.pts || [];
    // The fine chain, its whole length back to his hand, catching a little gold light.
    ctx.lineWidth = Math.max(0.7, 0.8 * s); ctx.strokeStyle = "#a88a48"; ctx.beginPath();
    for (let k = 1; k < pts.length; k++) { const A = pts[k - 1], B = pts[k]; if (!pick({ coil: A.coil && B.coil, back: A.back || B.back })) continue; ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
    ctx.stroke();
    for (const b of beads) {
      if (!pick(b)) continue;
      if (b.kind === 0) {
        // The crucifix, hanging from the end, lit.
        glow(b.x, b.y, 10 * s, C.holy, 0.45);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a - PI / 2); ctx.scale(s * 1.25, s * 1.25);
        ctx.fillStyle = "#5a5040"; ctx.fillRect(-1.3, -1, 2.6, 11.4); ctx.fillRect(-4.3, 1.6, 8.6, 2.4);
        ctx.fillStyle = "#ece6d4"; ctx.fillRect(-0.8, -0.6, 1.6, 10.6); ctx.fillRect(-3.8, 2, 7.6, 1.6);
        ctx.fillStyle = "#c8a860"; ctx.fillRect(-0.4, 2.4, 0.8, 4.2);
        ctx.restore();
      } else if (b.kind === 3) { ctx.fillStyle = "#cfcfd8"; ctx.beginPath(); ctx.ellipse(b.x, b.y, 2.2 * s, 2.9 * s, b.a, 0, TAU); ctx.fill(); ctx.strokeStyle = "#7a7a88"; ctx.lineWidth = 0.6; ctx.stroke(); }
      else {
        const r = (b.kind === 1 ? 2.7 : 1.9) * s;
        circle(b.x, b.y, r, b.back ? "#28180e" : "#4a2c18"); circle(b.x - r * 0.38, b.y - r * 0.38, r * 0.44, b.back ? "#6a4a30" : "#e0b080");
      }
    }
    if (which === "free") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.16; ctx.strokeStyle = C.holy; ctx.lineWidth = 3 * s; ctx.beginPath(); beads.forEach((b, k) => k ? ctx.lineTo(b.x, b.y) : ctx.moveTo(b.x, b.y)); ctx.stroke(); ctx.restore(); }
  }
  // A demon close by, picked up and thrown into the others.
  function throwFoe(f, dx, dy) {
    const H0 = G.hero;
    if (!f || f.gone || G.over || G.shift || ["grabbed", "down", "bless"].includes(H0.act.kind)) return;
    if (lying(f)) { finishFoe(f); return; }
    if (f.shield) { landHit(f, 0, 0.5); return; }
    if (!near(f)) { stole(f); return; }
    if (!fresh("throw", f)) return;
    if (busy() && H0.act.kind !== "hurt") { H0.queue = { f, move: "throw", dx, dy }; return; }
    let m = Math.hypot(dx, dy); if (m < 0.1) { dx = f.x >= H0.x ? 1 : -1; dy = 0; m = 1; }
    H0.dir = f.x >= H0.x ? 1 : -1;
    act("grab", { f, dur: 0.46 * R().strike, d: [dx / m, dy / m], flung: false });
    f.act = { kind: "held", t: 0 }; f.sign = null; if (G.slowFor === f) G.slowFor = null;
    Sound.fx.effort();
  }
  function landHit(f, dmg, k, o) {
    o = o || {};
    if (f.gone) return;
    const H0 = G.hero;
    if (f.shield && !o.breaks && (o.front !== false)) {
      // The shield turns his blow aside. Clank.
      Sound.fx.hit(0.6); Sound.fx.tick(900, 1); pop(f.x, f.y - 110 * depth(f.y), tip("TAP TWICE", "PRESS C"), C.holy); sparks(f.x - f.dir * 14, f.y - 60, "#ff9a60", 6);
      if (!G.taught.shield && !G.kata) { G.taught.shield = true; say(WAVES[3].say()); }
      return false;
    }
    if (o.breaks && f.shield) { f.shield = false; Sound.fx.shatter(); shards(f.x + f.dir * 10, f.y - 60); pop(f.x, f.y - 120 * depth(f.y), "GUARD BROKEN", C.holy); f.dizzy = 2.2; ev("guardbreak"); }
    // The longer the flow, the harder every blow lands.
    const flow = 1 + Math.min(1.5, H0.combo * 0.07);
    const mult = (f.dizzy > 0 ? 1.5 : 1) * (G.world === "heights" ? 1.25 : 1) * flow;
    k *= 1 + Math.min(0.6, H0.combo * 0.03);
    f.hp -= dmg * mult; f.stun += 1; f.stunT = 1.6;
    if (f.act.kind === "wind" || f.act.kind === "lunge") { f.sign = null; if (G.slowFor === f) G.slowFor = null; }
    const kb = (o.kx === undefined ? 1 : o.kx) * Math.sign(f.x - (o.fromX === undefined ? H0.x : o.fromX) || 1) * (110 + 90 * k);
    if (f.act.kind === "floored") f.vx = kb * 0.4;
    else if (f.act.kind !== "thrown" && f.act.kind !== "pulled") { f.act = { kind: "hurt", t: 0, dur: 0.32 }; f.vx = kb; }
    if (k > 1.3 && f.hat && Math.random() < 0.6) { f.hat = false; G.parts.push({ kind: "hat", x: f.x, y: f.y - 115 * depth(f.y), vx: f.vx * 0.6, vy: -220, r: 0, vr: 12 * Math.sign(f.vx || 1), hk: f.hatKind, t: 0, s: depth(f.y), floor: f.y }); }
    if (f.stun >= 3 && f.dizzy <= 0) { f.dizzy = 2.0; f.stun = 0; pop(f.x, f.y - 128 * depth(f.y), "DIZZY", "#ffe08a"); }
    if (!o.angel) countHit(f);
    // Worn down past a mark, it is knocked flat: the last blow of a flurry. (Not while it is
    // flying, or being held, thrown or pulled: those moves have their own endings.)
    f.worn = f.worn || 0;
    if (f.hp > 0 && f.worn < WORN.length && f.hp <= f.max * WORN[f.worn] && f.z <= 0 && f.act.kind === "hurt" && !o.noFloor) {
      while (f.worn < WORN.length && f.hp <= f.max * WORN[f.worn]) f.worn++;
      floor(f); f.vx = Math.sign(f.vx || 1) * 240;
      slowmo(0.3, 0.28, f.x, f.y - 50, 1.16); hitStop(0.08);
      pop(f.x, f.y - 120 * depth(f.y), "DOWN", "#ffffff");
    }
    hitStop(k > 1.5 ? 0.09 : 0.045);
    G.shake = Math.max(G.shake, 2 + k * 2);
    Sound.fx.hit(k, pan(f.x));
    sparks(f.x - Math.sign(f.x - H0.x || 1) * 10, f.y - 70 * depth(f.y) - f.z, k > 1.3 ? "#ffffff" : f.rim, 6 + k * 3);
    if (f.hp <= 0) castOut(f);
    return true;
  }
  // A blow of his own landed: the combo, the Spirit, his angel, the way up out of the Depths.
  function countHit(f) {
    const H0 = G.hero;
    H0.combo++; H0.comboT = R().comboT; H0.hits++; H0.best = Math.max(H0.best, H0.combo); H0.last = f;
    if (H0.combo >= 3 && G.woe) G.woe = 0;
    // Each blow of a combo lands in a breath of slow time, deeper as it builds.
    if (H0.combo >= 3) pulse(Math.max(0.36, 0.64 - H0.combo * 0.022), 0.13);
    if (H0.spirit < SPIRIT) { H0.spirit++; if (H0.spirit === SPIRIT && !G.taught.bless) { G.taught.bless = true; say(tip("The Spirit fills you. Tap the gold cross to bless them all.", "The Spirit fills you. Press B to bless them all.")); } }
    const every = R().swoop;
    if (every && H0.combo % every === 0) G.callAngel = H0.combo % 10 === 0 ? "sweep" : "strike";
    if (H0.combo >= HEIGHTS_AT && G.world === G.base && !G.shift && !G.over && (!G.kata || G.kata.i >= HEIGHTS_LESSON)) {
      // A long flow lifts them all to the Heights.
      pop(H0.x, H0.y - 160, "TO THE HEIGHTS", C.holy, true); Sound.fx.hah(1.2); Sound.fx.chord(3, 0.8);
      if (f && !f.gone) { f.vz = Math.max(f.vz, 420); f.z = Math.max(f.z, 1); }
      shiftTo("heights");
    }
    if (G.world === "depths" && H0.combo >= DEPTHS_OUT) G.rising = true;
    ev("hit");
  }
  // The counter: the catch, the twist, the throw, the pin. Any others striking at him at the same
  // moment are dealt with in the same turn (a back kick, a sweep): a double or triple counter.
  function counter(f) {
    const H0 = G.hero;
    const others = alive().filter((o) => o !== f && o.sign === "gold" && o.act.kind === "wind" && Math.abs(o.x - H0.x) < 240 && Math.abs(o.y - H0.y) < 70);
    moved("counter");
    f.sign = null; H0.dir = f.x >= H0.x ? 1 : -1; H0.y = f.y + 1; H0.z = 0;
    H0.x = keepX(f.x - H0.dir * 48 * depth(f.y));
    H0.queue = null;
    act("counter", { f, dur: 0.72 * R().strike, leg: f.atk === "kick", others, slam: false, kicked: false, x0: H0.x });
    f.act = { kind: "countered", t: 0, u: 0 }; f.z = 0; f.vz = 0; f.vx = 0; f.dir = -H0.dir; f.dizzy = 0;
    for (const o of others) { o.sign = null; o.act = { kind: "idle", t: 0 }; o.dizzy = 0.6; }
    H0.inv = Math.max(H0.inv, 0.75);
    slowmo(0.2, 0.32, (f.x + H0.x) / 2, f.y - 60, 1.26); G.warnT = 0;
    if (G.kata) G.kata.countered = true;
    G.flash = 0.3; G.flashC = C.holy;
    Sound.fx.clang(pan(f.x));
    pop(f.x, f.y - 130 * depth(f.y), others.length === 2 ? "TRIPLE COUNTER" : others.length === 1 ? "DOUBLE COUNTER" : "COUNTER", C.holy, others.length > 0);
    if (G.slowFor === f || others.includes(G.slowFor)) G.slowFor = null;
    ev("counter");
  }
  function bless() {
    const H0 = G.hero;
    if (H0.spirit < SPIRIT || ["down", "grabbed", "bless"].includes(H0.act.kind) || G.shift) return;
    H0.spirit = 0; act("bless", { dur: 0.95, fired: false });
    Sound.fx.glory();
  }
  // From on high: the end of the flow in the Heights. He leaps up, the angel's light round him, and
  // they come down on the street together; every demon there is struck down by it, harder the
  // longer the flow was. Then the count starts again.
  function finisher() {
    const H0 = G.hero;
    if (G.world !== "heights" || G.finishing || G.shift || G.down) return;
    G.finishing = true; G.finishCombo = H0.combo; G.lastMove = null; H0.queue = null;
    act("finisher", { dur: 1.1, lifted: false, landed: false });
    H0.inv = 3;
    slowmo(0.4, 0.5, H0.x, H0.y - 100, 1.15);
    Sound.fx.glory(); Sound.fx.hah(1.3);
    pop(H0.x, H0.y - 170, "FROM ON HIGH", C.holy, true);
  }
  function finisherLands() {
    const H0 = G.hero, c = G.finishCombo || 0, mult = 1 + Math.min(2, c * 0.08);
    G.finishing = false;
    let n = 0;
    for (const f of alive()) { landHit(f, 2.5 * mult, 2.2, { angel: true, front: false, breaks: true, noFloor: true, fromX: H0.x }); if (!f.gone) floor(f, { long: 1.4 }); n++; }
    G.parts.push({ kind: "ring", x: H0.x, y: H0.y, r: 10, t: 0 }); G.parts.push({ kind: "beam", x: H0.x, t: 0 });
    dustAt(H0.x - 30, H0.y); dustAt(H0.x + 30, H0.y);
    G.shake = 14; G.flash = 0.8; G.flashC = C.holy; hitStop(0.14);
    slowmo(0.2, 0.7, H0.x, H0.y - 60, 1.2);
    Sound.fx.hit(2.4); Sound.fx.clang();
    pop(H0.x, H0.y - 150, c > 1 ? "FROM ON HIGH · " + c + " IN A ROW" : "FROM ON HIGH", "#ffffff", true);
    H0.spirit = Math.min(SPIRIT, H0.spirit + 3);
    H0.combo = 0; H0.comboT = 0;
    if (n) say("They fell with us. Finish them!");
    ev("heightsOut");
  }
  const chainsOpen = () => G.world === "street" && !G.kata && !G.guard.freed && WAVES[G.wave] && (WAVES[G.wave].chains || G.wave > 2);
  function tapChains() {
    const H0 = G.hero, g = G.guard;
    if (!chainsOpen()) return false;
    if (busy()) return true;
    const tx = g.x + 46, ty = Y0 + 4;
    if (Math.abs(H0.x - tx) + Math.abs(H0.y - ty) > 20) act("zip", { chain: true, style: "lurch", dur: clamp(Math.abs(H0.x - tx) / 500, 0.16, 0.4), from: [H0.x, H0.y], to: [tx, ty] });
    else act("chain", { dur: 0.42, hit: false });
    H0.dir = -1;
    return true;
  }
  // Tap the open street: he zips there at once, in a flip or a roll, to get clear of them.
  function tapGround(p) {
    const H0 = G.hero;
    if (["grabbed", "down", "bless", "grab"].includes(H0.act.kind) || G.over || G.shift) return;
    const ty = clamp(p.y, Y0, Y1), tx = keepX(p.x), d = dist(H0.x, H0.y, tx, ty);
    if (d < 12) return;
    H0.dir = tx >= H0.x ? 1 : -1; H0.queue = null; moved("dash");
    act("dash", { from: [H0.x, H0.y], to: [tx, ty], dur: clamp(d / 700, 0.16, 0.42), style: d > 160 ? "flip" : "roll" });
    H0.inv = Math.max(H0.inv, 0.2);
    Sound.fx.whoosh(0.25, 0.6);
    G.parts.push({ kind: "mark", x: tx, y: ty, t: 0 });
    ev("dash");
  }

  // ---- The Heights and the Depths -------------------------------------------------------------------
  // Pictures of the spiritual struggle, not places. Whoever is fighting goes too: all of them.
  function shiftTo(to) {
    if (G.shift || G.world === to) return;
    G.shift = { from: G.world, to, t: 0, down: to === "depths" || (to === G.base && G.world === "heights") };
    for (const f of G.foes) if (!f.gone) { f.sign = null; if (["wind", "lunge", "grabbing", "held", "thrown", "pulled"].includes(f.act.kind)) f.act = { kind: "idle", t: 0 }; }
    G.slowFor = null; G.hero.queue = null;
    if (G.hero.act.kind === "grabbed") act("idle");
    if (to === "heights") { Sound.fx.glory(); Sound.fill("hit"); slowmo(0.3, 1.0, G.hero.x, G.hero.y - 80, 1.1); }
    else if (to === "depths") { Sound.fx.growl(1.6); Sound.fx.whisper(2); }
    else Sound.fx.whoosh(0.8, 1, G.shift.from === "depths");
  }
  function arrive(to, from) {
    G.world = to; G.worldT = 0;
    if (to !== "heights" && !G.finishing) { G.hero.combo = 0; G.hero.comboT = 0; }
    if (to === "heights") G.hero.comboT = WORLD.heights.comboT;
    G.woe = 0;
    const all = alive();
    if (to === "heights") { G.banner = { text: "THE HEIGHTS", sub: "Keep the flow, then come down on them.", c: C.holy, t: 0 }; say(tip("Up! Keep the flow going. Then tap the gold, and we come down on them from on high.", "Up! Keep the flow going. Then press B, and we come down on them from on high.")); }
    else if (to === "depths") { G.banner = { text: "THE DEPTHS", sub: DEPTHS_OUT + " in a row, and we rise.", c: "#ff5a3a", t: 0 }; say("Do not listen to them. Ten in a row, and we rise. I am with you."); G.whisperT = 0.5; }
    else if (from === "heights") G.banner = null;     // the finisher lands when he does
    else if (from === "depths") {
      G.whispers = [];
      if (G.depthsWon) { G.depthsWon = false; for (const f of all) { landHit(f, 3, 1.8, { angel: true, front: false, breaks: true, noFloor: true }); if (!f.gone) floor(f, { long: 1.3 }); } G.hero.spirit = SPIRIT; G.flash = 0.8; G.flashC = C.holy; say("Up, and out! They fell. Finish them!"); }
      else say("I have you. Breathe.");
    }
    else if (from === "kata") { G.banner = { text: "THE STREET", sub: "", c: "#e9e6df", t: 0 }; nextWave(); Sound.setLevel(1); Sound.fill("hit"); }
  }
  function stepWorld(dt, dtRaw) {
    const H0 = G.hero;
    if (G.shift) {
      G.shift.t += dtRaw;
      if (!G.shift.mid && G.shift.t > 0.55) { G.shift.mid = true; arrive(G.shift.to, G.shift.from); }
      if (G.shift.t > 1.1) G.shift = null;
      return;
    }
    G.worldT += dt;
    if (G.world === "heights") {
      H0.resolve = Math.min(100, H0.resolve + R().regen * dt);
      if (G.worldT > (G.kata ? 9 : 12) || (alive().length === 0 && !G.kata)) finisher();
    } else if (G.world === "depths") {
      if (G.rising) { G.rising = false; G.depthsWon = true; slowmo(0.2, 0.9, H0.x, H0.y - 80, 1.2); G.flash = 0.6; G.flashC = C.holy; G.parts.push({ kind: "beam", x: H0.x, t: 0 }); Sound.fx.glory(); shiftTo(G.base); }
      else if (G.worldT > 25 || alive().length === 0) shiftTo(G.base);
      // The whispers.
      G.whisperT -= dt;
      if (G.whisperT <= 0) { G.whisperT = 1.6 + Math.random() * 1.4; G.whispers.push({ text: WHISPERS[Math.floor(Math.random() * WHISPERS.length)], x: 80 + Math.random() * (W - 160), y: 100 + Math.random() * 140, t: 0, dx: (Math.random() - 0.5) * 20 }); Sound.fx.whisper(1.2); if (Math.random() < 0.5) Sound.fx.heart(0.6); }
    }
    for (const w of G.whispers) { w.t += dt; w.x += w.dx * dt; }
    G.whispers = G.whispers.filter((w) => w.t < 3.4);
  }
  const WHISPERS = ["No one is coming.", "You are not Padre Pio.", "Go back to your desert.", "It is too late for him.", "You are alone down here.", "What use is a priest?", "Give it up, Father.", "He will do it anyway."];

  // ---- His angel, who waits above ------------------------------------------------------------------
  // He comes down in a dive, strikes (or sweeps through a group, or tears a demon off him, or
  // lifts him away), and climbs back out of sight.
  function swoop(kind, f) {
    const A = G.angel; if (A.act.kind !== "above") return false;
    if (kind !== "carry" && (!f || f.gone)) return false;
    const T = kind === "carry" ? G.hero : f;
    A.dir = T.x >= G.view.cx ? -1 : 1; if (Math.abs(T.x - G.hero.x) > 5 && kind !== "carry") A.dir = T.x >= G.hero.x ? 1 : -1;
    A.x = T.x - A.dir * 150; A.y = T.y - 2; A.z = SKY;
    A.act = { kind, phase: "dive", t: 0, f };
    Sound.fx.whoosh(0.45, 1, false);
    if (kind !== "carry") slowmo(0.28, 0.75, T.x, T.y - 70, 1.18);
    if (!G.taught.swoop && kind !== "carry" && !G.kata) { G.taught.swoop = true; say("Now. Together."); }
    if (kind !== "carry") ev("swoop");
    return true;
  }
  function stepAngel(dt) {
    const A = G.angel, H0 = G.hero, a = A.act; A.t += dt; a.t += dt;
    A.catchT = Math.max(0, A.catchT - dt);
    A.lightX = lerp(A.lightX, H0.x, Math.min(1, dt * 3));
    if (a.kind === "above") { A.z = SKY; A.x = A.lightX; return; }
    const T = a.kind === "carry" ? H0 : a.f;
    if (a.phase === "dive") {
      const u = clamp(a.t / 0.26, 0, 1), e = u * u;
      if (T && !(T.gone && a.kind !== "carry")) { A.x = lerp(T.x - A.dir * 150, T.x - A.dir * (a.kind === "carry" ? 10 : 48), e); A.y = T.y - 2; }
      A.z = lerp(SKY, 0, e);
      if (u >= 1) { a.phase = a.kind === "carry" ? "lift" : "hit"; a.t = 0; Sound.fx.hit(1.6); G.shake = 6; G.flash = 0.25; G.flashC = C.holy; }
    } else if (a.phase === "hit") {
      const u = clamp(a.t / 0.24, 0, 1);
      if (!a.hit && u > 0.42) {
        a.hit = true;
        if (a.kind === "sweep") {
          let n = 0;
          for (const f of G.foes) if (!f.gone && Math.abs(f.x - A.x) < 200 && Math.abs(f.y - A.y) < 60) { landHit(f, 2, 1.8, { breaks: true, front: false, angel: true, fromX: A.x }); if (!f.gone) floor(f); n++; }
          pop(A.x + A.dir * 40, A.y - 150, n > 1 ? "WING SWEEP ×" + n : "WING SWEEP", C.holy);
        } else if (a.f && !a.f.gone) {
          landHit(a.f, a.kind === "free" ? 2 : 3, 2, { breaks: true, front: false, angel: true, fromX: A.x });
          if (!a.f.gone) floor(a.f);
          pop(a.f.x, a.f.y - 150, a.kind === "free" ? "TORN AWAY" : "HIS ANGEL", C.holy);
          if (a.kind === "free" && H0.act.kind === "grabbed") { act("idle"); H0.inv = 0.8; }
        }
        G.flash = 0.3; G.flashC = C.holy; hitStop(0.1);
      }
      if (u >= 1) { a.phase = "rise"; a.t = 0; Sound.fx.flap(1.2); }
    } else if (a.phase === "rise") {
      const u = clamp(a.t / 0.42, 0, 1);
      A.z = lerp(0, SKY, u * u); A.x += A.dir * 60 * dt;
      if (u >= 1) A.act = { kind: "above", t: 0 };
    } else if (a.phase === "lift") {
      // Carrying him away to the church.
      A.z = lerp(0, SKY, clamp(a.t / 1.1, 0, 1) ** 2); H0.z = A.z + 6; H0.x = A.x + A.dir * 10;
    }
  }

  // ---- Time ---------------------------------------------------------------------------------------
  function step(dtRaw) {
    const HR = G.hero;
    // How fast time runs: slowed hard for the great moments and for the teaching; all but stopped
    // for the beat when a sign shows, then half speed until the blow comes; a breath slower with
    // each blow of a combo; and a little slow all through a long one.
    if (G.warnF && (G.warnF.gone || G.warnF.act.kind !== "wind")) { G.warnF = null; G.warnT = 0; }
    let target = 1;
    if (G.slowFor) target = 0.2;
    else if (G.slowT > 0) target = G.slowTs;
    else if (G.warnT > 0 && !G.over) target = 0.22;
    else if (engaged() && !G.over) target = 0.45;
    else if (HR.combo >= 4 && !G.over && !G.shift) target = 1 - Math.min(0.4, (HR.combo - 3) * 0.03);
    if (G.pulseT > 0) target = Math.min(target, G.pulseTs);
    G.ts += (target - G.ts) * Math.min(1, dtRaw * (target < G.ts ? 22 : 6));
    if (G.slowT > 0) G.slowT -= dtRaw;
    if (G.warnT > 0) G.warnT -= dtRaw;
    if (G.pulseT > 0) G.pulseT -= dtRaw;
    let dt = dtRaw * G.ts;
    if (G.freeze > 0) { G.freeze -= dtRaw; dt = 0; }
    // How slow it looks: eased, so a breath of slow time does not flicker the screen.
    const vis = clamp((0.85 - G.ts) / 0.6, 0, 1);
    G.slowVis += (vis - G.slowVis) * Math.min(1, dtRaw * (vis > G.slowVis ? 9 : 3));
    // The camera: pushed in on the great moments, on him and the one drawing back during the
    // warning, and drawn in a little on him as a combo builds.
    const wf = G.warnF, mid = (f) => ({ x: (f.x + HR.x) / 2, y: (f.y + HR.y) / 2 - 60 });
    let Z = { k: 1, x: HR.x, y: H / 2 };
    if (G.slowT > 0) Z = G.zoom;
    else if (G.slowFor) Z = Object.assign({ k: 1.12 }, mid(G.slowFor));
    else if (wf && (G.warnT > 0 || engaged())) Z = Object.assign({ k: G.warnT > 0 ? 1.17 : 1.1 }, mid(wf));
    else if (HR.combo >= 4 && !G.over && !G.shift) Z = { k: 1 + Math.min(0.14, (HR.combo - 3) * 0.014), x: HR.x, y: HR.y - 70 };
    const ck = Math.min(1, dtRaw * (Z.k > 1.09 ? 7 : 3));
    G.cam.k += (Z.k - G.cam.k) * ck; G.cam.y += (Z.y - G.cam.y) * ck;
    // Across, it is always on Fr. Lawrence, close behind him even when he zips.
    G.cam.x += (HR.x - G.cam.x) * Math.min(1, dtRaw * 14);
    // The music is muffled while time is slow, and in the Depths.
    const muff = G.world === "depths" || (G.muffled ? G.slowVis > 0.35 : G.slowVis > 0.55);
    if (muff !== G.muffled) { G.muffled = muff; Sound.muffle(muff, muff ? 0.05 : 0.2); }
    if (G.msg) G.msg.t += dtRaw;
    if (G.banner) { G.banner.t += dtRaw; if (G.banner.t > 3) G.banner = null; }
    G.flash = Math.max(0, G.flash - dtRaw * 2); G.shake = Math.max(0, G.shake - dtRaw * 20);
    stepParts(dt);
    stepWorld(dt, dtRaw);
    if (G.over) { G.over += dtRaw; if (G.over > (G.leaving ? 1.6 : 3.4) && !G.left) { G.left = true; Sound.muffle(false); G.done(); } }
    if (G.shift) return;            // everyone hangs in the air while the world changes round them
    G.t += dt; G.waveT += dt;
    const H0 = G.hero;
    if (G.kata) stepKata(dt);
    // Spawns.
    for (const s of G.spawnQ) if (!s.done && G.waveT > s.at) { s.done = true; spawn(s.kind); }
    G.spawnQ = G.spawnQ.filter((s) => !s.done);
    // The chains phase keeps sending demons until the guardian is free.
    const w = !G.kata && WAVES[G.wave];
    if (w && w.chains && !G.guard.freed && G.spawnQ.length === 0 && alive().length < 2 && G.waveT > 3) G.spawnQ.push({ kind: "whisper", at: G.waveT + 2.5 });
    // Hold on the open street to block; hold on a demon a moment, and the holy water is ready to throw.
    const TT = G.touch;
    if (TT && !TT.moved) {
      const held = performance.now() - TT.r0;
      if (!TT.target && !TT.spent && held > 230 && !busy() && H0.act.kind !== "block") { act("block", {}); TT.block = true; }
      if (TT.target && TT.target !== "chains" && !TT.water && held > WATER_MS) { TT.water = true; Sound.fx.tick(2200, 0.8); }
    }
    stepKeys(dt);
    stepHero(dt); stepRosary(dt); stepAngel(dt); stepGuard(dt);
    if (G.callAngel) { const kind = G.callAngel; G.callAngel = null; const f = H0.last && !H0.last.gone ? H0.last : nearestFoe(); if (f && G.world !== "depths") swoop(kind, f); }
    for (const f of G.foes) stepFoe(f, dt);
    G.foes = G.foes.filter((f) => !f.gone || f.act.t < 0.6);
    if (!G.kata) attackScheduler(dt);
    if (H0.comboT > 0) { H0.comboT -= dt; if (H0.comboT <= 0) H0.combo = 0; }
    if (!G.kata) Sound.setLevel(G.world === "heights" ? 3 : H0.combo >= 12 ? 3 : H0.combo >= 5 ? 2 : 1);
    // The wave is won when its demons are all cast out (and, in the chains phase, the guardian is free).
    if (w && !G.over && G.world === "street" && G.spawnQ.length === 0 && alive().length === 0 && G.waveT > 1.5 && (!w.chains || G.guard.freed)) {
      // Not touched once, the whole wave through: the flow unbroken.
      if (!G.hurtWave) { G.banner = { text: "PERFECT FREEFLOW", sub: "Not a blow on you.", c: C.holy, t: 0, small: true }; H0.spirit = Math.min(SPIRIT, H0.spirit + 3); Sound.fx.chord(4, 1); }
      if (G.wave >= WAVES.length - 1) { if (G.guard.freed) finish(); else { G.wave = 1; nextWave(); } }
      else nextWave();
    }
    if (G.down) { G.down += dtRaw; if (G.down > 2.8) recover(); }
  }
  const nearestFoe = () => alive().sort((a, b) => dist(a.x, a.y, G.hero.x, G.hero.y) - dist(b.x, b.y, G.hero.x, G.hero.y))[0];
  function finish() {
    G.over = 0.001; say("It is done. The street is clear.");
    Sound.queue(SONGS.noir); Sound.setLevel(0);
  }
  function recover() {
    // His angel has carried him to the church to recover. No death: the wave begins again.
    G.down = 0;
    const H0 = G.hero; H0.resolve = 100; H0.combo = 0; H0.spirit = Math.max(H0.spirit, 2); act("idle"); H0.x = G.ww / 2 - W * 0.22; H0.y = 300; H0.z = 0; H0.inv = 1.5;
    G.angel.act = { kind: "above", t: 0 }; G.world = G.base; G.whispers = [];
    for (const f of G.foes) f.gone = true;
    G.foes = []; G.spawnQ = []; G.slowFor = null;
    G.wave--; nextWave();
    say("Rested in the church's light. Again, Father: they are not so strong as they look.");
  }
  function stepHero(dt) {
    const H0 = G.hero, A0 = H0.act; A0.t += dt;
    H0.inv = Math.max(0, H0.inv - dt);
    const u = A0.dur ? clamp(A0.t / A0.dur, 0, 1) : 0;
    const after = () => {
      act("idle");
      if (H0.queue) {
        const q = H0.queue; H0.queue = null; if (q.f.gone) return;
        replaying = true;
        try { if (q.move === "water") water(q.f); else if (q.move === "stole") stole(q.f); else if (q.move === "throw") throwFoe(q.f, q.dx, q.dy); else if (q.move === "finish") finishFoe(q.f); else goStrike(q.f, q.move); }
        finally { replaying = false; }
      }
    };
    if (A0.kind === "run") {
      // Moved by the arrow keys: a lurching, staggering run.
      A0.ph += dt * 11;
      if (A0.trip === undefined) A0.trip = Math.random() < 0.15 ? 0.8 + Math.random() : -1;
      if (A0.trip > 0 && A0.t > A0.trip && A0.t < A0.trip + 0.25 && !A0.caught) { A0.caught = true; G.angel.catchT = 0.5; Sound.fx.gasp(); }
    } else if (["zip", "dodge", "jumpkick", "dash", "spike"].includes(A0.kind)) {
      const [fx, fy] = A0.from, [tx, ty] = A0.to, e = A0.kind === "dodge" || A0.kind === "dash" ? ease(u) : smooth(u);
      H0.x = lerp(fx, tx, e); H0.y = lerp(fy, ty, e);
      H0.z = A0.style === "flip" ? Math.sin(u * PI) * 60 : A0.style === "superman" ? Math.sin(u * PI) * 40 : A0.style === "jumpkick" ? Math.sin(u * PI) * 48 : A0.style === "cartwheel" ? Math.sin(u * PI) * 22 : A0.kind === "jumpkick" || A0.kind === "spike" ? Math.sin(u * PI * 0.5) * (A0.f ? A0.f.z * 0.8 + 30 : 40) : A0.vault ? Math.sin(u * PI) * 86 : A0.style === "roll" || A0.kind === "dodge" ? Math.sin(u * PI) * 8 : 0;
      if (A0.kind === "jumpkick" && u > 0.55 && !A0.hit) { A0.hit = true; if (!A0.f.gone) { landHit(A0.f, 1, 1.1, { kx: 0.4 }); if (!A0.f.gone) A0.f.vz = Math.max(A0.f.vz, 200); ev("juggle"); } }
      if (A0.kind === "spike" && u > 0.6 && !A0.hit) {
        A0.hit = true;
        if (!A0.f.gone) { const f = A0.f; landHit(f, 0, 1.4, { angel: true, kx: 0.1 }); countHit(f); if (!f.gone) { f.vz = -900; f.act = { kind: "spiked", t: 0 }; } pop(f.x, f.y - 120, "SLAM!", C.holy); Sound.fx.hah(1); ev("spike"); }
      }
      if (u >= 1) {
        H0.z = A0.kind === "jumpkick" || A0.kind === "spike" ? H0.z : 0;
        if (A0.kind === "zip" && A0.chain) act("chain", { dur: 0.42, hit: false });
        else if (A0.kind === "zip" && A0.f && !A0.f.gone) doMove(A0.f, A0.move || "strike", A0.style);
        else if (A0.kind === "jumpkick" || A0.kind === "spike") act("land", { dur: 0.25, z0: H0.z });
        else after();
      }
    } else if (A0.kind === "land") { H0.z = A0.z0 * (1 - ease(u)); if (u >= 1) { H0.z = 0; after(); } }
    else if (A0.kind === "counter") {
      const f = A0.f, live = f && !f.gone;
      if (live && f.act.kind === "countered") f.act.u = u;
      // The others: a back kick for the one behind, a sweep for the one beside.
      if (!A0.kicked && u > 0.3) {
        A0.kicked = true;
        for (const o of A0.others) if (!o.gone) { landHit(o, 2, 1.6, { front: false, breaks: true, noFloor: true }); if (!o.gone) { floor(o); o.vx = Math.sign(o.x - H0.x || 1) * 240; } sparks(o.x, o.y - 60, C.holy, 8); }
        if (A0.others.length) Sound.fx.whoosh(0.2, 0.7);
      }
      if (u < 0.2) { if (live) { f.x = H0.x + H0.dir * 50 * depth(f.y); f.y = H0.y - 1; } }
      else if (u < 0.5) {
        // The throw: up and over, down on its back.
        const k = (u - 0.2) / 0.3;
        if (live) { f.x = H0.x + H0.dir * lerp(50, 58, k) * depth(f.y); f.z = Math.sin(k * PI) * (A0.leg ? 16 : 34); }
      } else {
        if (!A0.slam) {
          A0.slam = true;
          if (live) {
            f.z = 0; f.act = { kind: "hurt", t: 0, dur: 0.3 };
            landHit(f, 2, 1.7, { front: false, noFloor: true, kx: 0 });
            if (!f.gone) { floor(f); f.vx = 0; f.act.pinned = true; }
            G.shake = 9; hitStop(0.09); dustAt(f.x, f.y); Sound.fx.hah(1.1, H0.dir * 0.3);
          }
        }
        // The pin: a step in and down on one knee, a hand on its chest.
        if (live) H0.x = lerp(A0.x0, f.x - H0.dir * 16, smooth(clamp((u - 0.5) / 0.12, 0, 1)));
      }
      if (u >= 1) { if (live && f.act.kind === "floored") f.act.pinned = false; after(); }
    }
    else if (A0.kind === "strike") {
      const f = A0.f;
      if (!A0.hit && u > 0.42) {
        A0.hit = true;
        if (f && !f.gone && Math.abs(f.x - H0.x) < 110 && Math.abs(f.y - H0.y) < 40) {
          const name = A0.which[2];
          if (name === "heavy") {
            const wasDizzy = f.dizzy > 0 && !f.shield;
            landHit(f, 2, 1.9, { breaks: true, front: false }); Sound.fx.hah(1, H0.dir * 0.3); splashAt(f.x, f.y - 70 * depth(f.y));
            if (wasDizzy && !f.gone && !lying(f)) { floor(f); f.vx = H0.dir * 260; pop(f.x, f.y - 120 * depth(f.y), "FLOORED", "#ffffff"); }
            slowmo(0.35, 0.3, f.x, f.y - 60, 1.1);
          } else if (name === "launch") {
            if (f.shield) landHit(f, 0, 0.6);
            else {
              landHit(f, 1, 1.3, { kx: 0.2, noFloor: true });
              if (!f.gone) { f.z = Math.max(f.z, 1); f.vz = 480; f.act = { kind: "air", t: 0 }; f.dizzy = Math.max(f.dizzy, 1); G.launched = true; pop(f.x, f.y - 140 * depth(f.y), "LAUNCHED", C.holy); }
            }
          } else if (name === "slam") {
            const landed = landHit(f, 1.5, 1.6, { kx: 0.3 });
            if (landed !== false && !f.gone) { f.dizzy = Math.max(f.dizzy, 1.0); G.shake = 7; }
          } else {
            const landed = landHit(f, 1, 1);
            if (landed === false) { act("hurt", { dur: 0.3, small: true }); return; }
            // Now and then he fumbles the holy water, and it splashes the demon behind him.
            const behind = G.foes.find((o) => !o.gone && o !== f && Math.sign(o.x - H0.x) === -H0.dir && Math.abs(o.x - H0.x) < 120 && Math.abs(o.y - H0.y) < 40);
            if (behind && Math.random() < 0.12) fumble(behind);
          }
        }
      }
      if (u >= 1) after();
    }
    else if (A0.kind === "toss") {
      if (!A0.fired && u > 0.42) {
        A0.fired = true;
        const hp = jointAt("priest", H0.x, H0.y - H0.z, depth(H0.y), H0.dir, heroPose(), "hF"), f = A0.f && !A0.f.gone ? A0.f : null;
        G.parts.push({ kind: "throwflask", x: hp[0], y: hp[1], x1: f ? f.x : A0.tx, y1: (f ? f.y : A0.ty) - 60 * depth(f ? f.y : A0.ty), t: 0, dur: 0.3, f });
      }
      if (u >= 1) after();
    }
    else if (A0.kind === "lash") {
      const f = A0.f;
      if (u >= 1) {
        if (!f || f.gone) { after(); return; }
        f.act = { kind: "pulled", t: 0, x0: f.x, y0: f.y, x1: H0.x + H0.dir * 60, y1: H0.y + 1 }; f.sign = null; if (G.slowFor === f) G.slowFor = null;
        act("haul", { f, dur: 0.28 }); Sound.fx.whoosh(0.3, 0.9, true);
      }
    }
    else if (A0.kind === "haul") {
      const f = A0.f;
      if (u >= 1) {
        if (f && !f.gone) { f.act = { kind: "hurt", t: 0, dur: 0.5 }; f.x = H0.x + H0.dir * 60; f.y = H0.y + 1; f.z = 0; landHit(f, 1, 0.9, { front: false, kx: 0.1 }); if (!f.gone) f.dizzy = Math.max(f.dizzy, 1.4); pop(f.x, f.y - 130, "THE ROSARY", C.holy); ev("stole"); }
        if (G.rosary) { G.rosary.phase = "back"; G.rosary.t = 0; }
        after();
      }
    }
    else if (A0.kind === "grab") {
      const f = A0.f;
      if (f && !f.gone && !A0.flung) { f.x = lerp(f.x, H0.x + H0.dir * 34, Math.min(1, dt * 20)); f.y = H0.y + 1; f.z = 6 + 30 * smooth(u * 2); }
      if (!A0.flung && u > 0.55) {
        A0.flung = true;
        if (f && !f.gone) { f.act = { kind: "thrown", t: 0, vx: A0.d[0] * 560, vy: A0.d[1] * 220, hits: [] }; f.vz = 160; f.z = Math.max(f.z, 30); countHit(f); pop(f.x, f.y - 140, "THROWN", C.holy); Sound.fx.hah(0.9); ev("throw"); }
      }
      if (u >= 1) after();
    }
    else if (A0.kind === "finish") {
      // The hop onto the one lying down (wherever it has slid to), and the blow driven home.
      const f = A0.f, k = clamp(u / 0.5, 0, 1), tx = f && !f.gone ? f.x - H0.dir * 24 : A0.to[0], ty = f && !f.gone ? f.y + 4 : A0.to[1];
      H0.x = lerp(A0.from[0], tx, smooth(k)); H0.y = lerp(A0.from[1], ty, smooth(k)); H0.z = u < 0.5 ? Math.sin(k * PI) * 36 : 0;
      if (!A0.hit && u >= 0.5) { A0.hit = true; if (f) takedown(f); }
      if (u >= 1) after();
    }
    else if (A0.kind === "hurt") { H0.x = keepX(H0.x - H0.dir * 60 * dt * (1 - u)); if (u >= 1) after(); }
    else if (A0.kind === "finisher") {
      // Up into the light; the world changes under him; down on them.
      if (u < 0.4) H0.z = 160 * ease(u / 0.4);
      if (!A0.lifted && u >= 0.4) { A0.lifted = true; shiftTo(G.base); }
      if (u > 0.82) H0.z = 160 * (1 - smooth((u - 0.82) / 0.18));
      if (!A0.landed && u >= 1) { A0.landed = true; H0.z = 0; finisherLands(); act("land", { dur: 0.3, z0: 0 }); }
    }
    else if (A0.kind === "trip") { if (u < 0.25) H0.x = keepX(A0.x0 + H0.dir * 46 * ease(u / 0.25)); if (u >= 1) act("idle"); }
    else if (A0.kind === "grabbed") {
      if (A0.t > (A0.tick || 0)) { A0.tick = A0.t + 0.4; hurtHero(5, true); }
      // In the Heights his angel tears the demon off him; in the Depths he must break free himself.
      if (A0.t > 1.0 && !A0.called && A0.by && !A0.by.gone && G.world === "heights") A0.called = swoop("free", A0.by);
      if (A0.t > (G.world === "depths" ? 1.4 : 2.2) || (A0.by && A0.by.gone)) { act("idle"); H0.inv = 0.6; }
    } else if (A0.kind === "bless") {
      if (!A0.fired && u > 0.5) {
        A0.fired = true; G.flash = 0.6; G.flashC = C.holy; G.parts.push({ kind: "ring", x: H0.x, y: H0.y - 60, r: 10, t: 0 });
        slowmo(0.25, 0.6, H0.x, H0.y - 60, 1.12);
        for (const f of G.foes) if (!f.gone) { landHit(f, 2, 1.4, { breaks: true, front: false, noFloor: true }); if (!f.gone) floor(f, { long: 1.3 }); }
        Sound.fx.hah(1); Sound.fx.clang();
      }
      if (u >= 1) act("idle");
    } else if (A0.kind === "chain") {
      if (!A0.hit && u > 0.55) {
        A0.hit = true; const g = G.guard;
        g.chains--; Sound.fx.chain(g.chains <= 0); sparks(g.x + 10, Y0 - 40, C.holy, 8); G.flash = 0.15; G.flashC = C.holy;
        if (g.chains <= 0) freeGuardian();
      }
      if (u >= 1) act("idle");
    } else if (A0.kind === "block") { const k = G.keys; if (!(G.touch && G.touch.block && !G.touch.spent) && !k.KeyQ && !k.KeyZ && !k.ShiftLeft && !k.ShiftRight) act("idle"); }
    H0.x = keepX(H0.x); H0.y = clamp(H0.y, Y0, Y1);
  }
  function hurtHero(dmg, grab) {
    const H0 = G.hero;
    dmg *= R().hurt;
    G.hurtWave = true;
    H0.resolve = Math.max(0, H0.resolve - dmg); H0.combo = 0; H0.comboT = 0; H0.queue = null; H0.spirit = Math.max(0, H0.spirit - 2);
    G.shake = 6; Sound.fx.hit(1.2); Sound.fx.effort(); hitStop(0.07);
    if (!grab) { act("hurt", { dur: 0.42 }); woe(); }
    if (H0.resolve <= 0 && !G.down) {
      G.down = 0.001; act("down", {}); say("I have you. I have you. Rest now."); for (const f of G.foes) f.sign = null; G.slowFor = null;
      G.angel.act = { kind: "above", t: 0 }; swoop("carry");
    }
  }
  function freeGuardian() {
    const g = G.guard; g.freed = true; g.fight = 6; g.nextHit = 0.6;
    G.flash = 0.9; G.flashC = "#e8f6ff"; Sound.fill("hit"); Sound.fx.glory();
    slowmo(0.2, 0.9, g.x, Y0 - 60, 1.2);
    say("Brothers!", "guardian");
    for (let i = 0; i < 14; i++) G.parts.push({ kind: "link", x: g.x + 10, y: Y0 - 30, vx: (Math.random() - 0.5) * 320, vy: -150 - Math.random() * 200, t: 0, r: Math.random() * TAU });
  }
  function stepGuard(dt) {
    const g = G.guard; g.t += dt; g.x = carX() - 40;
    if (!g.freed || G.world !== "street") return;
    if (g.fight > 0) {
      g.fight -= dt; g.nextHit -= dt;
      if (g.nextHit <= 0) {
        const t = alive()[0];
        if (t) { g.nextHit = 0.9; G.parts.push({ kind: "streak", x0: g.x, y0: Y0 - 60, x1: t.x, y1: t.y - 60 * depth(t.y), t: 0 }); landHit(t, 2, 1.5, { breaks: true, front: false, angel: true, fromX: g.x }); if (!t.gone) t.dizzy = Math.max(t.dizzy, 1.6); }
        else g.nextHit = 0.3;
      }
      if (g.fight <= 0 && G.wave === 2) { nextWave(); }
    }
  }
  // A demon draws back to strike (the gold sign) or to grab (the red).
  function windUp(f, grab, durMul) {
    f.act = { kind: "wind", t: 0, dur: (grab ? 0.95 : 0.85) * R().wind * (durMul || 1) }; f.sign = grab ? "red" : "gold"; f.dir = G.hero.x >= f.x ? 1 : -1;
    f.atk = grab ? "grab" : Math.random() < 0.35 ? "kick" : "punch";
    Sound.fx.growl(0.4);
    warn(f);
  }
  // Demons take turns to attack, a few at a time, as in Arkham: one or two winding up at once.
  function attackScheduler(dt) {
    if (G.over || G.down) return;
    G.nextAtk -= dt;
    const winding = G.foes.filter((f) => !f.gone && (f.act.kind === "wind" || f.act.kind === "lunge")).length;
    const maxW = G.wave >= 3 || G.world === "depths" ? 2 : 1;
    if (G.nextAtk > 0 || winding >= maxW) return;
    const H0 = G.hero, cands = G.foes.filter((f) => !f.gone && f.act.kind === "idle" && f.dizzy <= 0 && f.z === 0 && Math.abs(f.x - H0.x) < 300);
    if (!cands.length) return;
    const f = cands[Math.floor(Math.random() * cands.length)];
    const grab = f.kind === "grab";
    windUp(f, grab);
    const gap = (WAVES[G.wave] || WAVES[0]).gap; G.nextAtk = lerp(gap[0], gap[1], Math.random()) * (G.world === "depths" ? 0.75 : 1);
    // The first time each sign shows, time nearly stops and the angel explains.
    if (!grab && !G.taught.gold) { G.taught.gold = true; G.slowFor = f; say(tip("A gold sign: tap him now, to counter!", "A gold sign: press X now, to counter!")); f.act.dur = 1.0; }
    if (grab && !G.taught.red) { G.taught.red = true; G.slowFor = f; say(tip("A red sign cannot be countered. Hold on the open street, to block it!", "A red sign cannot be countered. Hold Q, to block it!")); f.act.dur = 1.1; }
  }
  function stepFoe(f, dt) {
    const H0 = G.hero, a = f.act; a.t += dt; f.ph += dt;
    if (f.gone) return;
    if (f.dizzy > 0) f.dizzy -= dt;
    if (f.stunT > 0) { f.stunT -= dt; if (f.stunT <= 0) f.stun = 0; }
    // Held, pulled or caught by him: if he is no longer doing it (something stopped him), let go.
    const by = G.hero.act;
    if (a.kind === "held") { if (by.kind !== "grab" || by.f !== f) { f.act = { kind: "hurt", t: 0, dur: 0.3 }; f.vz = 0; } return; }
    if (a.kind === "countered") { if (by.kind !== "counter" || by.f !== f) { f.z = 0; floor(f); } return; }
    // Thrown: flying, spinning, knocking down whoever it meets.
    if (a.kind === "thrown") {
      f.x += a.vx * dt; f.y = clamp(f.y + a.vy * dt, Y0, Y1); f.vz -= 700 * dt; f.z = Math.max(0, f.z + f.vz * dt);
      for (const o of G.foes) if (o !== f && !o.gone && !a.hits.includes(o) && Math.abs(o.x - f.x) < 44 && Math.abs(o.y - f.y) < 36) {
        a.hits.push(o); landHit(o, 2, 1.7, { front: false, breaks: true, fromX: f.x }); if (!o.gone && !lying(o)) o.dizzy = Math.max(o.dizzy, 1.6); ev("throwhit"); pop(o.x, o.y - 120, "BOWLED OVER", C.holy);
      }
      if (f.x < FX0 || f.x > FX1() || a.t > 0.6) { f.x = clamp(f.x, FX0, FX1()); f.act = { kind: "hurt", t: 0, dur: 0.4 }; f.z = 0; f.vz = 0; landHit(f, 2, 1.4, { angel: true, front: false, kx: 0.2, noFloor: true }); if (!f.gone) floor(f); G.shake = 6; }
      return;
    }
    if (a.kind === "pulled") { const u = clamp(a.t / 0.28, 0, 1), e = u * u; f.x = lerp(a.x0, a.x1, e); f.y = lerp(a.y0, a.y1, e); f.z = Math.sin(u * PI) * 20; if (u >= 1 && !(by.kind === "haul" && by.f === f)) { f.z = 0; f.act = { kind: "hurt", t: 0, dur: 0.4 }; } return; }
    // In the air: launched, or bounced by a counter, or slammed down.
    if (f.z > 0 || f.vz > 0 || a.kind === "spiked") {
      f.vz -= 900 * dt; f.z += f.vz * dt; f.x += f.vx * dt * 0.5;
      if (f.z <= 0) {
        f.z = 0;
        if (a.kind === "spiked") { f.act = { kind: "hurt", t: 0, dur: 0.3 }; landHit(f, 3, 2, { angel: true, front: false, kx: 0.1, noFloor: true }); G.shake = 10; hitStop(0.1); if (!f.gone) floor(f, { long: 1.15 }); return; }
        f.vz = 0; if (a.kind === "air") { f.act = { kind: "idle", t: 0 }; landHit(f, 1, 0.8, { front: false, kx: 0.2, angel: true }); if (!f.gone) f.dizzy = Math.max(f.dizzy, 1.5); G.shake = 4; }
      }
    }
    f.x += f.vx * dt; f.vx *= 1 - 6 * dt;
    if (f.holeT > 0) f.holeT -= dt;
    if (a.kind === "castout") return;
    if (f.x < FX0) { f.x = FX0; f.vx = Math.abs(f.vx) * 0.3; } if (f.x > FX1()) { f.x = FX1(); f.vx = -Math.abs(f.vx) * 0.3; }
    if (a.kind === "emerge") { f.dir = H0.x >= f.x ? 1 : -1; if (a.t > a.dur) { f.act = { kind: "idle", t: 0 }; f.holeT = 0.5; } return; }
    if (a.kind === "hurt") { if (a.t > a.dur) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "face") { if (a.t > 1.4) f.act = { kind: "idle", t: 0 }; return; }
    // Down on the street, and up again.
    if (a.kind === "floored") { if (a.t > a.dur) { f.act = { kind: "rise", t: 0, face: a.face }; Sound.fx.growl(0.3); } return; }
    if (a.kind === "rise") { if (a.t > 0.4) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "wind") {
      f.dir = H0.x >= f.x ? 1 : -1;
      if (f.dizzy > 0) { f.sign = null; f.act = { kind: "idle", t: 0 }; if (G.slowFor === f) G.slowFor = null; return; }
      // The deepest slow lets go part way through, so it never drags.
      if (G.slowFor === f && a.t > a.dur * 0.55) G.slowFor = null;
      if (a.t > a.dur) {
        // The lunge is aimed where he is now, and reaches only so far: get away in time, and it falls short.
        const tx = H0.x - f.dir * 40, ty = H0.y;
        f.act = { kind: "lunge", t: 0, dur: 0.2, x0: f.x, y0: f.y, x1: f.x + clamp(tx - f.x, -150, 150), y1: f.y + clamp(ty - f.y, -50, 50) };
      }
      return;
    }
    if (a.kind === "lunge") {
      const u = clamp(a.t / a.dur, 0, 1);
      f.x = lerp(a.x0, a.x1, ease(u)); f.y = lerp(a.y0, a.y1, ease(u));
      if (u >= 1) resolveAttack(f);
      return;
    }
    if (a.kind === "recover") { if (a.t > 0.6) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "grabbing") { f.x = H0.x - f.dir * 34; if (H0.act.kind !== "grabbed") f.act = { kind: "recover", t: 0 }; return; }
    // Idle: drift toward a place round him, keeping their distance from each other. In the
    // practice the shades stand still and wait to be shown how.
    if (f.dizzy > 0) return;
    if (G.kata && f.shade) { f.dir = H0.x >= f.x ? 1 : -1; f.walk = false; return; }
    const others = G.foes.filter((o) => o !== f && !o.gone);
    // Their places stay on the screen: one that would stand past the edge goes round to his other side.
    const ring = 92 + (f.kind === "grab" ? 20 : 0);
    let side = f.x >= H0.x ? 1 : -1;
    if (H0.x + side * (ring + 30) < 40 || H0.x + side * (ring + 30) > G.ww - 40) side = -side;
    let tx = clamp(H0.x + side * ring + Math.sin(f.slot + G.t * 0.3) * 30, 40, G.ww - 40), ty = clamp(H0.y + Math.sin(f.slot * 2.1 + G.t * 0.25) * 34, Y0, Y1);
    for (const o of others) { const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); if (d < 60 && d > 0.1) { tx += dx / d * 50; ty += dy / d * 20; } }
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
    if (d > 6) { const sp = f.kind === "grab" ? 55 : 72; f.x += dx / d * sp * dt; f.y += dy / d * sp * 0.6 * dt; f.walk = true; } else f.walk = false;
    f.dir = H0.x >= f.x ? 1 : -1; f.y = clamp(f.y, Y0, Y1); f.x = clamp(f.x, FX0, FX1());
  }
  // A block is good for one blow: after it, he has to block again.
  function spendBlock() { act("idle"); if (G.touch) G.touch.spent = true; G.qSpent = true; }
  function resolveAttack(f) {
    const H0 = G.hero, grab = f.sign === "red", close = Math.abs(f.x - H0.x) < 90 && Math.abs(f.y - H0.y) < 40;
    f.sign = null;
    if (!close || H0.inv > 0 || H0.act.kind === "dodge" || H0.act.kind === "dash" || G.down || G.over) {
      // Missed. A grabber that misses goes flat on its face.
      if (grab) { floor(f, { face: true, long: 1.2 }); pop(f.x, f.y - 60, "DODGED", "#9fe4ff"); Sound.fx.hit(0.6); f.vx = f.dir * 220; ev("dodged"); }
      else { f.act = { kind: "recover", t: 0 }; if (H0.act.kind === "dodge" || H0.act.kind === "dash") pop(H0.x, H0.y - 130, "DODGED", "#9fe4ff"); }
      return;
    }
    if (grab && H0.act.kind === "block") {
      // The red sign, blocked: the light he prays in throws the grabber off, flat on its back.
      f.act = { kind: "hurt", t: 0, dur: 0.3 };
      landHit(f, 1.5, 1.6, { front: false, noFloor: true, fromX: H0.x });
      if (!f.gone) { floor(f, { long: 1.1 }); f.vx = Math.sign(f.x - H0.x || 1) * 300; }
      G.flash = 0.45; G.flashC = C.holy; Sound.fx.clang(pan(f.x)); Sound.fx.chord(5, 0.6);
      slowmo(0.25, 0.35, (f.x + H0.x) / 2, f.y - 60, 1.18);
      pop(H0.x, H0.y - 130, "BLOCKED: THROWN OFF", C.holy, true);
      spendBlock(); ev("blockred");
      return;
    }
    if (grab) {
      act("grabbed", { by: f }); f.act = { kind: "grabbing", t: 0 };
      Sound.fx.growl(1);
      // On the street, a grab that catches him drags the whole fight down into the Depths.
      if (G.world === "street" && !G.kata) { pop(H0.x, H0.y - 140, "DRAGGED DOWN", "#ff5a3a"); G.dragT = 0.45; }
      if (G.kata) G.releaseT = 0.7;
      return;
    }
    if (H0.act.kind === "block") { f.act = { kind: "hurt", t: 0, dur: 0.4 }; f.vx = f.dir * -200; Sound.fx.clang(); pop(H0.x, H0.y - 130, "BLOCKED", C.holy); f.dizzy = 1; hitStop(0.06); spendBlock(); ev("blocked"); return; }
    f.act = { kind: "recover", t: 0 };
    if (G.kata) { pop(H0.x, H0.y - 130, "STRUCK", "#ff8a70"); act("hurt", { dur: 0.3 }); H0.combo = 0; H0.comboT = 0; H0.queue = null; G.kata.countered = false; return; }
    hurtHero(10);
  }
  function castOut(f) {
    f.gone = true; f.sign = null; f.act = { kind: "castout", t: 0 }; f.vx = Math.sign(f.x - G.hero.x || 1) * 260; f.vz = 260; f.z = Math.max(f.z, 1);
    Sound.fx.yelp(pan(f.x));
    setTimeout(() => { Sound.fx.puff(); }, 380);
    pop(f.x, f.y - 140 * depth(f.y), f.shade ? "GONE" : "CAST OUT", "#ffffff");
    if (G.slowFor === f) G.slowFor = null;
    // The last of a wave goes out in deep slow motion.
    if (!G.kata && !alive().length && G.spawnQ.length === 0) slowmo(0.12, 1.1, f.x, f.y - 60, 1.3);
  }
  function fumble(f) {
    const H0 = G.hero;
    G.parts.push({ kind: "flask", x: H0.x, y: H0.y - 80, x1: f.x, y1: f.y - 60 * depth(f.y), t: 0, f });
  }
  function splashAt(x, y) { Sound.fx.splash(); for (let i = 0; i < 12; i++) G.parts.push({ kind: "drop", x, y, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 160, t: 0 }); }
  function dustAt(x, y) { for (let i = 0; i < 10; i++) G.parts.push({ kind: "smoke", x: x + (Math.random() - 0.5) * 40, y: y - 4, vx: (Math.random() - 0.5) * 160, vy: -30 - Math.random() * 40, t: 0 }); }

  // ---- The keyboard: arrows move, Space strikes toward the arrow you hold ------------------------
  const arrows = () => { const k = G.keys; return [(k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0), (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0)]; };
  function stepKeys(dt) {
    const H0 = G.hero, [kx, ky] = arrows(), moving = kx || ky;
    // Timers for the grabs: dragged into the Depths on the street; let go at once in the practice.
    if (G.dragT) { G.dragT -= dt; if (G.dragT <= 0) { G.dragT = 0; if (G.world === "street" && !G.over && H0.act.kind === "grabbed") shiftTo("depths"); } }
    if (G.woeDrag) { G.woeDrag -= dt; if (G.woeDrag <= 0) { G.woeDrag = 0; if (G.world === "street" && !G.over && !G.down) { if (H0.act.kind === "grabbed" || H0.act.kind === "trip") act("idle"); shiftTo("depths"); } } }
    if (G.woeT) G.woeT = Math.max(0, G.woeT - dt);
    if (G.releaseT) { G.releaseT -= dt; if (G.releaseT <= 0) { G.releaseT = 0; if (H0.act.kind === "grabbed") act("idle"); } }
    if (moving && (H0.act.kind === "idle" || H0.act.kind === "run")) {
      if (H0.act.kind !== "run") act("run", { ph: 0 });
      const m = Math.hypot(kx, ky);
      H0.x += kx / m * 190 * dt; H0.y += ky / m * 120 * dt;
      if (kx) H0.dir = kx > 0 ? 1 : -1;
      if (H0.act.t > 0.5) ev("run");
    } else if (!moving && H0.act.kind === "run") act("idle");
  }
  // The best target in the direction held (or, with no arrow, the nearest, the one he faces first).
  function pick(o) {
    o = o || {};
    const H0 = G.hero, [kx, ky] = arrows(), m = Math.hypot(kx, ky);
    const gadget = o.air || o.far || o.near;
    const cands = alive().filter((f) => (!o.air || f.z > 20) && (!o.far || !near(f)) && (!o.near || near(f)) && !(gadget && lying(f))).map((f) => ({ f, x: f.x, y: f.y }));
    if (o.chains && chainsOpen()) cands.push({ chains: true, x: G.guard.x + 46, y: Y0 + 4 });
    let best = null, bs = -1e9;
    for (const c of cands) {
      const dx = c.x - H0.x, dy = (c.y - H0.y) * 1.8, d = Math.hypot(dx, dy) || 1;
      if (d > 620) continue;
      let s;
      if (m) { const dot = (dx * kx + dy * ky) / (d * m); if (dot < 0.25) continue; s = dot * 260 - d; }
      else s = -d + (Math.sign(dx) === H0.dir ? 60 : 0);
      if (c.f && c.f.sign === "gold") s += 40;
      if (c.f && lying(c.f) && d < 320) s += 90;      // one that is down is the chance to take
      if (o.far) s += d * 1.4;
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  }

  // ---- Particles and pop-up words --------------------------------------------------------------------
  function sparks(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 120 + Math.random() * 240; G.parts.push({ kind: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c, t: 0 }); } }
  function shards(x, y) { for (let i = 0; i < 10; i++) G.parts.push({ kind: "shard", x, y, vx: (Math.random() - 0.5) * 300, vy: -100 - Math.random() * 200, r: Math.random() * TAU, t: 0 }); }
  function puff(x, y, c, n, dark) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 30 + Math.random() * 60; G.parts.push({ kind: dark ? "smoke" : "puff", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, t: 0, c }); } }
  function pop(x, y, text, c, big) { const cx = G.view.cx; G.pops.push({ x: clamp(x, cx - W / 2 + 60, cx + W / 2 - 60), y: Math.max(70, y), text, c, t: 0, big }); }
  const LIFE = { hat: 2.5, ring: 0.8, smoke: 0.9, puff: 0.9, flask: 0.5, link: 1.4, streak: 0.3, mark: 0.4, throwflask: 0.3, beam: 1.2, warn: 0.5 };
  function stepParts(dt) {
    for (const p of G.parts) {
      p.t += dt;
      if (p.kind === "spark" || p.kind === "drop" || p.kind === "shard" || p.kind === "link") { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.kind === "spark" ? 300 : 700) * dt; p.vx *= 1 - 2 * dt; if (p.r !== undefined) p.r += dt * 8; }
      else if (p.kind === "puff" || p.kind === "smoke") { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; }
      else if (p.kind === "hat") { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.r += p.vr * dt; if (p.y > p.floor - 4) { p.y = p.floor - 4; p.vy = -p.vy * 0.3; p.vx *= 0.6; p.vr *= 0.5; } }
      else if (p.kind === "ring") p.r += dt * 900;
      else if (p.kind === "flask" && p.t > 0.45 && !p.done) { p.done = true; splashAt(p.x1, p.y1); if (!p.f.gone) { landHit(p.f, 2, 1.2, { front: false, breaks: true }); if (!p.f.gone) p.f.dizzy = Math.max(p.f.dizzy, 1.8); pop(p.x1, p.y1 - 50, "SPLASH!", "#9fe4ff"); } }
      else if (p.kind === "throwflask" && p.t >= p.dur && !p.done) {
        // The holy water lands: the one it was meant for is stunned, and those beside it splashed.
        p.done = true; splashAt(p.x1, p.y1);
        let hit = false;
        for (const f of G.foes) {
          if (f.gone) continue;
          const d = Math.hypot(f.x - p.x1, (f.y - 60 * depth(f.y)) - p.y1);
          if (f === p.f || d < 40) { if (!hit) { landHit(f, 1, 1, { front: false, kx: 0.3 }); hit = true; } else landHit(f, 0.5, 0.6, { front: false, angel: true, kx: 0.2 }); if (!f.gone) f.dizzy = Math.max(f.dizzy, f === p.f ? 1.4 : 0.8); }
          else if (d < 70) f.dizzy = Math.max(f.dizzy, 0.6);
        }
        if (hit) { pop(p.x1, p.y1 - 40, "HOLY WATER", "#9fe4ff"); ev("water"); }
      }
    }
    G.parts = G.parts.filter((p) => p.t < (LIFE[p.kind] || 0.6));
    for (const p of G.pops) p.t += dt;
    G.pops = G.pops.filter((p) => p.t < 1.1);
  }

  // ---- Drawing: the four worlds -----------------------------------------------------------------------
  // The sky and the far city: one long picture, wider than the screen, that slides past at half
  // the speed of the street, so the city seems far off behind it.
  const BGW = () => Math.round(W + (G.ww - W) * 0.5 + 40);
  function background() {
    const bw = BGW(), key = W + ":" + bw + ":" + DPR + ":" + scale;
    if (bg && bgKey === key) return bg;
    bgKey = key; bg = document.createElement("canvas"); bg.width = Math.round(bw * scale * DPR); bg.height = Math.round(H * scale * DPR);
    const c2 = bg.getContext("2d"); c2.setTransform(scale * DPR, 0, 0, scale * DPR, 0, 0);
    // Draw with the shared helpers, pointed at the off-screen canvas for a moment.
    const back = useCtx(c2);
    const g = ctx.createLinearGradient(0, 0, 0, Y0); g.addColorStop(0, "#03040a"); g.addColorStop(1, "#101a34"); ctx.fillStyle = g; ctx.fillRect(0, 0, bw, Y0);
    skyline(101, -10, bw + 10, Y0 - 50, 60, 200, "#0a1124", { t: 0, winA: 0.35, lit: 0.35 });
    skyline(102, -10, bw + 10, Y0 - 10, 30, 110, "#070b18", { t: 0, winA: 0.45, lit: 0.4, signs: false });
    useCtx(back);
    return bg;
  }
  // The part of the street on the screen, in the street's own measure (with a margin).
  function viewSpan() { const v = G.view; return [v.cx - W / (2 * v.k) - 60, v.cx + W / (2 * v.k) + 60]; }
  const drawFar = () => ctx.drawImage(background(), (G.view.cx - W / 2) * 0.5 - 20, 0, BGW(), H);
  // Each stretch of a wide world drawn from its own seed, so it is the same each time it comes round.
  function tiles(tw, x0, x1, fn) { for (let k = Math.floor(x0 / tw); k <= Math.floor(x1 / tw); k++) fn(k * tw, seeded(1000 + k * 7919)); }
  // Shop fronts along the street, either side of the corner store: dark doors, a lit window or two,
  // a fire escape.
  function shopfronts(x0, x1, t) {
    const sxL = carX() + W * 0.22 - 30, sxR = carX() + W * 0.22 + Math.min(200, W * 0.27) + 30;
    tiles(170, x0, x1, (x, r) => {
      if (x + 170 > sxL && x < sxR) return;
      const w = 120 + r() * 40, h = 70 + r() * 60, y = Y0 - 12 - h, c = r() < 0.5 ? "#0b0f1e" : "#0e1222";
      rect(x + 8, y, w, h, c); rect(x + 8, y, w, 2, "#1c2236");
      const door = x + 8 + w * (0.15 + r() * 0.5);
      rect(door, Y0 - 12 - 34, 16, 34, "#04050a");
      for (let i = 0; i < 3; i++) if (r() < 0.55) { const wx = x + 14 + i * (w / 3), lit = r() < 0.5; rect(wx, y + 12, w / 3 - 14, 16, lit ? "rgba(255,217,160,0.32)" : "#070912"); }
      if (r() < 0.35) { ctx.strokeStyle = "#151a2c"; ctx.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const fy = y + 20 + k * 22; ctx.strokeRect(x + 20, fy, 44, 2); } }
    });
    rect(x0, Y0 - 14, x1 - x0, 14, "#10131e"); rect(x0, Y0 - 14, x1 - x0, 2, "#1c2134");     // the far kerb
  }
  // The lamps along the street; the one by the car flickers until the guardian is free.
  function lampsAt() { const base = carX() - W * 0.38, out = []; for (let k = -3; k <= 3; k++) { const x = base + k * 480; if (x > 60 && x < G.ww - 60 && Math.abs(x - (carX() + W * 0.22 + 80)) > 150) out.push(x); } return out; }
  function drawWorld(world, t) {
    const [vx0, vx1] = viewSpan();
    if (world === "street") {
      drawFar();
      shopfronts(vx0, vx1, t);
      const sx = carX() + W * 0.22, sw = Math.min(200, W * 0.27), base = carX() - W * 0.38, refl = [];
      cornerStore(sx, Y0 - 12, sw, 118, t);
      for (const x of lampsAt()) { if (x < vx0 - 40 || x > vx1 + 40) continue; lamp(x, Y0 - 12, 128, C.ice, x === base && Math.sin(t * 7) > 0.8 && !G.guard.freed ? 0.4 : 1, 1); refl.push([x + 11, C.ice, 1, 12]); }
      refl.push([sx + sw * 0.36, C.red, 1, 44], [sx + sw * 0.79, C.cyan, 1, 14], [carX(), C.cyan, 0.4, 30]);
      wetStreet(Y0 - 2, H, refl, t, vx0, vx1);
      // The car, and the father frozen in it; his guardian in chains against it.
      car(carX(), CARY, 1.6, { t, dash: 1, bow: 2, rim: C.cyan });
      drawGuardian(t);
    } else if (world === "kata") {
      // A rooftop above the city, as he sees it in his mind: the angel's gold in the air.
      drawFar();
      ctx.fillStyle = "rgba(242,212,122,0.07)"; ctx.fillRect(vx0, 0, vx1 - vx0, Y0);
      const g = ctx.createLinearGradient(0, Y0 - 16, 0, H); g.addColorStop(0, "#1a1d2c"); g.addColorStop(1, "#0b0c14"); ctx.fillStyle = g; ctx.fillRect(vx0, Y0 - 16, vx1 - vx0, H);
      rect(vx0, Y0 - 18, vx1 - vx0, 4, "#2a2e44");
      for (let x = Math.floor(vx0 / 90) * 90 + 30; x < vx1; x += 90) rect(x, Y0 + 30, 1, H, "rgba(255,255,255,0.03)");
      tiles(700, vx0, vx1, (x0, r) => {
        if (r() < 0.6) { const tx = x0 + 100 + r() * 400; rect(tx - 2, Y0 - 90, 4, 74, "#05060c"); rect(tx + 34, Y0 - 90, 4, 74, "#05060c"); ctx.fillStyle = "#07080f"; ctx.beginPath(); ctx.ellipse(tx + 18, Y0 - 112, 30, 26, 0, 0, TAU); ctx.fill(); poly([tx - 14, Y0 - 128, tx + 18, Y0 - 150, tx + 50, Y0 - 128], "#07080f"); }
        else { const tx = x0 + 150 + r() * 300; rect(tx, Y0 - 44, 60, 30, "#080a12"); rect(tx + 22, Y0 - 38, 14, 24, "#04050a"); }
      });
      glowOval(G.view.cx, Y0 + 40, W * 0.45, 40, C.holy, 0.08);
    } else if (world === "heights") {
      // The Heights: above the clouds, gold light, the city far below.
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1c1f4a"); g.addColorStop(0.45, "#6a5a8a"); g.addColorStop(0.75, "#e8b878"); g.addColorStop(1, "#fff0c8");
      ctx.fillStyle = g; ctx.fillRect(vx0, 0, vx1 - vx0, H);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12;
      for (let x0 = Math.floor(vx0 / 170) * 170 - 170; x0 < vx1 + 170; x0 += 170) { const x = x0 + Math.sin(t * 0.3 + x0) * 20; poly([x - 20, 0, x + 20, 0, x + 120, H, x - 60, H], "#fff3cf"); }
      ctx.restore();
      tiles(600, vx0 - 300, vx1 + 300, (x0, r) => { for (let i = 0; i < 6; i++) { const x = x0 + ((r() * 600 + t * (6 + r() * 10)) % 600), y = Y0 - 40 + r() * 60, rx = 80 + r() * 140; ctx.globalAlpha = 0.5; ctx.fillStyle = "#fff6e4"; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.28, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; } });
      const fg = ctx.createLinearGradient(0, Y0 - 10, 0, H); fg.addColorStop(0, "rgba(255,246,228,0.85)"); fg.addColorStop(1, "rgba(255,236,200,1)"); ctx.fillStyle = fg; ctx.fillRect(vx0, Y0 - 6, vx1 - vx0, H);
      tiles(500, vx0 - 200, vx1 + 200, (x0, r) => { for (let i = 0; i < 4; i++) { const x = x0 + ((r() * 500 + t * 12) % 500); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(x, Y0 + 4 + (i % 3) * 30, 90, 16, 0, 0, TAU); ctx.fill(); } });
      tiles(400, vx0, vx1, (x0, r) => { for (let i = 0; i < 8; i++) { const x = x0 + ((r() * 400 + t * 20) % 400), y = (r() * Y0 - t * 30 + Y0 * 4) % Y0; glow(x, y, 3 + r() * 3, "#ffffff", 0.5); } });
    } else if (world === "depths") {
      // The Depths: a red dark under everything, cracks of ember, chains hanging out of the black.
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#020103"); g.addColorStop(0.6, "#14040a"); g.addColorStop(1, "#2a0608"); ctx.fillStyle = g; ctx.fillRect(vx0, 0, vx1 - vx0, H);
      tiles(400, vx0, vx1, (x0, r) => {
        for (let i = 0; i < 3; i++) { const x = x0 + r() * 400, len = 60 + r() * 140, sw = Math.sin(t * 0.8 + i + x0) * 6; for (let k = 0; k < len; k += 9) { ctx.strokeStyle = "#1e080a"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(x + sw * k / len, k, 4, 2.2, k % 18 ? 0 : PI / 2, 0, TAU); ctx.stroke(); } }
        for (let i = 0; i < 4; i++) { const x = x0 + r() * 400, y = 40 + r() * (Y0 - 80), fl = 0.5 + 0.5 * Math.sin(t * (1 + r()) + i * 3 + x0); glow(x, y, 5, C.ember, 0.35 * fl); glow(x + 7, y, 5, C.ember, 0.35 * fl); }
      });
      rect(vx0, Y0 - 8, vx1 - vx0, H, "#0c0306");
      ctx.strokeStyle = hexA(C.ember, 0.5); ctx.lineWidth = 1.4;
      tiles(400, vx0, vx1, (x0, r) => { for (let i = 0; i < 4; i++) { let x = x0 + r() * 400, y = Y0 + r() * (H - Y0); ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 60; y += (r() - 0.3) * 14; ctx.lineTo(x, y); } ctx.stroke(); } });
      glowOval(G.view.cx, H, W * 0.6, 60, "#ff2a1a", 0.18 + 0.05 * Math.sin(t * 2));
    }
  }
  // From the screen to the street, through the camera's push-in.
  function toWorld(p) { const v = G.view; return { x: v.cx + (p.x - W / 2) / v.k, y: v.cy + (p.y - H / 2) / v.k }; }
  function draw() {
    const t = G.t, H0 = G.hero, k = G.cam.k;
    const cx = clamp(G.cam.x, W / (2 * k), G.ww - W / (2 * k)), cy = clamp(G.cam.y, H / (2 * k), H - H / (2 * k));
    G.view = { k, cx, cy };
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-cx, -cy);
    if (G.shake) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    // The world, or two of them passing while it changes: going up, the old world falls away below
    // and the new comes down from above; going down, the reverse. Everyone rises or sinks with it.
    let lift = 0;
    if (G.shift) {
      const S = G.shift, u = clamp(S.t / 1.1, 0, 1), e = smooth(u), sgn = S.down ? -1 : 1;
      ctx.save(); ctx.translate(0, sgn * H * e); drawWorld(S.from, t); ctx.restore();
      ctx.save(); ctx.translate(0, -sgn * H * (1 - e)); drawWorld(S.to, t); ctx.restore();
      lift = -sgn * Math.sin(u * PI) * 46;
    } else drawWorld(G.world, t);
    // Everyone, back to front, with their reflections in the wet street first.
    ctx.save(); ctx.translate(0, lift);
    const ents = [];
    ents.push({ y: H0.y, draw: (fl) => drawHero(fl) });
    if (G.angel.act.kind !== "above") ents.push({ y: G.angel.y - 0.5, draw: (fl) => drawAngelE(fl) });
    for (const f of G.foes) ents.push({ y: f.y, draw: (fl) => drawFoe(f, fl) });
    ents.sort((a, b) => a.y - b.y);
    if (G.world === "street" && !G.shift) for (const e of ents) e.draw(true);
    G.beads = rosaryBeads();
    for (const e of ents) e.draw(false);
    if (G.beads.length) drawRosary(G.beads, "free");
    drawParts();
    drawCharge();
    ctx.restore();
    ctx.restore();
    if ((G.world === "street" && !G.shift) || (G.shift && (G.shift.from === "street" || G.shift.to === "street"))) rain(t, 130, 0, 0, W, H, { seed: 41 });
    drawAbove();
    if (G.world === "depths" && !G.shift) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.9); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(20,0,4,0.75)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      for (const w of G.whispers) { const a = Math.min(1, w.t / 0.6) * Math.min(1, (3.4 - w.t) / 0.8); text(w.text, w.x, w.y, { align: "center", font: FONT.line, italic: true, size: 17, weight: 500, color: "#c87a7a", alpha: a * 0.55 }); }
    }
    // Slow motion: the colour drains toward night blue, and the edges darken.
    if (G.slowVis > 0.02) {
      const a = G.slowVis;
      ctx.fillStyle = "rgba(6,12,30," + (0.32 * a) + ")"; ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0," + (0.6 * a) + ")"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    if (G.shift) { const u = G.shift.t / 1.1; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hexA(G.shift.to === "depths" ? "#ff2a1a" : C.holy, 0.35 * Math.sin(u * PI)); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (G.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hexA(G.flashC, Math.min(0.5, G.flash * 0.6)); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    drawHUD();
    if (G.down) rect(0, 0, W, H, "rgba(0,0,0," + clamp((G.down - 1.2) / 0.8, 0, 1) * (G.down > 2.4 ? (2.8 - G.down) / 0.4 : 1) + ")");
    if (G.over > (G.leaving ? 0.6 : 1.9)) rect(0, 0, W, H, "rgba(0,0,0," + clamp((G.over - (G.leaving ? 0.6 : 1.9)) / 1.0, 0, 1) + ")");
    if (G.t < 0.6 && !G.shift) rect(0, 0, W, H, "rgba(0,0,0," + (1 - G.t / 0.6) + ")");
  }
  // The angel above, out of sight: only his light falling from the top of the screen, brighter
  // as the combo comes near the blow that brings him down. In the Depths, it is far away.
  function drawAbove() {
    const A = G.angel, H0 = G.hero;
    if (A.act.kind !== "above" && A.z < SKY * 0.6) return;
    const v = G.view, x = (A.lightX - v.cx) * v.k + W / 2, every = R().swoop, toward = every ? (H0.combo % every) / every : 0, pul = 0.5 + 0.5 * Math.sin(A.t * 2), dim = G.world === "depths" ? 0.25 : 1;
    glowOval(x, -10, 120 + 60 * toward, 60 + 30 * toward, C.holy, (0.16 + 0.22 * toward + 0.05 * pul) * dim);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (0.06 + 0.1 * toward) * dim;
    poly([x - 40, 0, x + 40, 0, x + 90, H * 0.55, x - 90, H * 0.55], C.holy); ctx.restore();
    const r = seeded(9);
    for (let i = 0; i < 8; i++) { const u = (r() + A.t * (0.08 + r() * 0.05)) % 1, mx = x + (r() - 0.5) * 160 + Math.sin(A.t + i) * 10; glow(mx, u * H * 0.5, 3 + r() * 3, "#fff6dc", 0.4 * (1 - u) * dim); }
    if (A.catchT > 0) { const hp = [(H0.x - v.cx) * v.k + W / 2, (H0.y - 90 - v.cy) * v.k + H / 2]; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = A.catchT; line(hp[0], 0, hp[0], hp[1], C.holy, 6); ctx.restore(); glow(hp[0], hp[1], 26, C.holy, A.catchT * 1.4); }
  }
  function heroPose() {
    const H0 = G.hero, a = H0.act, u = a.dur ? clamp(a.t / a.dur, 0, 1) : 0, t = G.t;
    switch (a.kind) {
      case "run": return walkP(a.ph, a.trip > 0 && a.t > a.trip && a.t < a.trip + 0.25);
      case "zip": case "dash":
        if (a.style === "jumpkick") return blendPose(blendPose(idleP(t), FLYKICK, smooth(u / 0.25)), idleP(t), Math.max(0, (u - 0.85) / 0.15));
        if (a.style === "superman") return blendPose(blendPose(idleP(t), PROSTRATE, smooth(u / 0.2)), idleP(t), Math.max(0, (u - 0.82) / 0.18));
        if (a.style === "cartwheel") return Object.assign(blendPose(CARTWHEEL, idleP(t), Math.max(0, u * 4 - 3)), { spin: u * TAU });
        if (a.style === "flip") return Object.assign(blendPose(TUCK, idleP(t), Math.max(0, u * 2 - 1) ** 2), { spin: u * TAU }); if (a.style === "roll") return Object.assign(blendPose(TUCK, idleP(t), Math.max(0, u * 3 - 2)), { spin: u * TAU }); return walkP(a.t * 22, u > 0.3 && u < 0.6);
      case "dodge": if (a.vault) return Object.assign(blendPose(TUCK, idleP(t), Math.max(0, u * 2.4 - 1.4)), { spin: u * TAU });
        return Object.assign(blendPose(TUCK, idleP(t), Math.max(0, u * 3 - 2)), { spin: Math.sign(a.to[0] - a.from[0] || 1) * H0.dir * u * TAU });
      case "jumpkick": return pose({ lean: -0.3, hF: 1.9, kF: 0.1, hB: -0.2, kB: 1.4, sF: 2.4, eF: 0.4, sB: -1.4 });
      case "spike": return u < 0.5 ? pose(SLAM[0]) : pose(Object.assign({}, SLAM[1], { lift: 10 }));
      case "land": return blendPose(pose({ lean: 0.3, kF: 1.4, hF: 0.8, kB: 1.2, hB: -0.2 }), idleP(t), u);
      case "finish": return keyPose([[0, idleP(t)], [0.2, FIN_AIR], [0.38, FIN_AIR], [0.5, FIN_DROP], [0.8, FIN_DROP], [1, idleP(t)]], u);
      case "counter": { const c = a.leg ? CATCH_LEG : CATCH_ARM; return keyPose([[0, idleP(t)], [0.1, c], [0.2, c], [0.42, TWIST], [0.55, PIN], [0.84, PIN], [1, idleP(t)]], u); }
      case "strike": case "toss": case "lash": { const [w, h] = a.which; return keyPose([[0, idleP(t)], [0.3, pose(w)], [0.48, pose(h)], [0.72, pose(h)], [1, a.kind === "lash" ? pose(h) : idleP(t)]], u); }
      case "haul": return blendPose(pose(LASH[1]), HAUL, u);
      case "grab": return u < 0.55 ? GRABP : blendPose(FLING, idleP(t), Math.max(0, (u - 0.75) * 4));
      case "hurt": return blendPose(HURT, idleP(t), u);
      case "finisher": return u < 0.4 ? blendPose(idleP(t), FIN_AIR, smooth(u / 0.25)) : u < 0.82 ? Object.assign({}, FIN_AIR, { spin: (u - 0.4) * TAU * 1.2 }) : FIN_DROP;
      case "trip": return keyPose([[0, walkP(0, true)], [0.22, DOWNP], [0.72, DOWNP], [1, idleP(t)]], u);
      case "grabbed": return GRABBED(t);
      case "block": return BLOCKP;
      case "bless": return blessP(u);
      case "chain": return keyPose([[0, idleP(t)], [0.3, CROSS[0]], [0.6, CROSS[1]], [1, idleP(t)]], u);
      case "down": return G.angel.act.phase === "lift" ? CARRIEDP : DOWNP;
      default: return idleP(t);
    }
  }
  function drawHero(fl) {
    const H0 = G.hero, s = depth(H0.y), p = heroPose(), sway = H0.act.kind === "idle" ? Math.sin(G.t * 1.7) * 3 : 0;
    const praying = H0.act.kind === "block";
    if (fl) { if (H0.z < 60) { if (praying) drawPriestFront(H0.x, H0.y + 2, s, { flipY: true, alpha: 0.16 }); else drawFigure("priest", H0.x + sway, H0.y + 2, s, H0.dir, p, { flipY: true, alpha: 0.16, t: G.t, pal: PRIEST_FIGHT }); } return; }
    // His ring of light on the ground, and his shadow.
    const ringA = 0.5 + 0.15 * Math.sin(G.t * 3);
    ctx.globalAlpha = 0.3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(H0.x, H0.y, 22 * s, 5 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    glowOval(H0.x, H0.y + 1, 38 * s, 9 * s, C.holy, 0.35);
    ctx.strokeStyle = hexA(C.holy, ringA); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(H0.x, H0.y + 1, 26 * s, 6.5 * s, 0, 0, TAU); ctx.stroke();
    const hide = H0.inv > 0 && !["dodge", "dash"].includes(H0.act.kind) && Math.sin(G.t * 40) > 0;
    if (praying) {
      // The block: turned to us, in prayer, the light of his angel behind him like a halo.
      const k = Math.min(1, H0.act.t / 0.12), pul = 0.85 + 0.15 * Math.sin(G.t * 9), hx = H0.x, hy = H0.y - H0.z - 74 * s;
      glow(hx, hy - 6 * s, 70 * s * pul, C.holy, 0.35 * k);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.6 * k;
      ctx.strokeStyle = C.holy; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx, hy - 6 * s, 40 * s * pul, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + G.t * 0.6; ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * 44 * s, hy - 6 * s + Math.sin(a) * 44 * s); ctx.lineTo(hx + Math.cos(a) * 58 * s, hy - 6 * s + Math.sin(a) * 58 * s); ctx.stroke(); }
      ctx.restore();
      drawPriestFront(H0.x, H0.y - H0.z, s, {});
      glow(hx, hy, 14 * s, "#fff6dc", 0.7 * k);
    } else drawFigure("priest", H0.x + sway, H0.y - H0.z, s, H0.dir, p, { t: G.t, pal: PRIEST_FIGHT, rim: C.holy, rimX: -1.8 * H0.dir, rimY: -1, flow: ["zip", "dash", "run", "finish"].includes(H0.act.kind) ? 0.8 : 0.2, flask: H0.act.kind === "toss" || (H0.act.kind === "strike" && H0.act.which === HEAVY), alpha: hide ? 0.6 : 1 });
    if (H0.act.kind === "bless" || H0.act.kind === "chain") { const hp = jointAt("priest", H0.x, H0.y - H0.z, s, H0.dir, p, "hF"); glow(hp[0], hp[1], 30, C.holy, 0.8); }
  }
  // Fr. Lawrence facing us, in prayer: feet together, the long coat, the hands pressed together
  // before his chest, his eyes closed behind his glasses, the hat with its gold band.
  function drawPriestFront(x, y, s, o) {
    const P = PRIEST_FIGHT;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, o.flipY ? -s * 0.62 : s);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = P.shoe; ctx.beginPath(); ctx.ellipse(-5.2, -1.6, 4.8, 2.4, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(5.2, -1.6, 4.8, 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = P.trouser; ctx.fillRect(-8.2, -40, 7.2, 38.5); ctx.fillStyle = P.trouser2; ctx.fillRect(1, -40, 7.2, 38.5);
    poly([-12.5, -84, 12.5, -84, 15.5, -24, 0, -22, -15.5, -24], P.coat);
    poly([0, -84, 12.5, -84, 15.5, -24, 0, -22], P.coat2);
    poly([-6.2, -84, 0, -64, 6.2, -84], "#0d0f18");
    poly([-6.2, -84, -2.4, -84, 0, -68, -4, -76], P.lapel); poly([6.2, -84, 2.4, -84, 0, -68, 4, -76], P.lapel);
    ctx.fillStyle = P.collar; ctx.fillRect(-2.5, -85, 5, 2.4);
    // His arms come in to the hands at his chest.
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 5.8;
    ctx.strokeStyle = P.coat; ctx.beginPath(); ctx.moveTo(-11.5, -80); ctx.lineTo(-14, -66); ctx.lineTo(-3, -69); ctx.stroke();
    ctx.strokeStyle = P.coat2; ctx.beginPath(); ctx.moveTo(11.5, -80); ctx.lineTo(14, -66); ctx.lineTo(3, -69); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(-3.4, -69.6, 6.8, 1.7);
    ctx.fillStyle = P.skin; ctx.beginPath(); ctx.ellipse(-1.15, -74.5, 2.1, 5.4, 0.1, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(1.15, -74.5, 2.1, 5.4, -0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = P.skinSh; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -79.5); ctx.lineTo(0, -70); ctx.stroke();
    // The head: neck, face shaded on one side, closed eyes, glasses, mouth.
    ctx.fillStyle = P.skinSh; ctx.fillRect(-2.1, -88, 4.2, 4);
    ctx.fillStyle = P.skin; ctx.beginPath(); ctx.ellipse(0, -94, 6, 7.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = P.skinSh; ctx.beginPath(); ctx.ellipse(1.2, -94, 4.8, 7.2, 0, -PI / 2, PI / 2); ctx.fill();
    ctx.strokeStyle = "#2a1a14"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-4, -94.5); ctx.quadraticCurveTo(-2.6, -93.4, -1.2, -94.5); ctx.moveTo(1.2, -94.5); ctx.quadraticCurveTo(2.6, -93.4, 4, -94.5); ctx.stroke();
    ctx.strokeStyle = hexA(P.glass, 0.6); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(-2.6, -94.6, 2.1, 0, TAU); ctx.moveTo(4.7, -94.6); ctx.arc(2.6, -94.6, 2.1, 0, TAU); ctx.moveTo(-0.5, -94.8); ctx.lineTo(0.5, -94.8); ctx.stroke();
    ctx.strokeStyle = "#5a3a2a"; ctx.beginPath(); ctx.moveTo(-1.3, -90); ctx.lineTo(1.3, -90); ctx.stroke();
    // The hat.
    ctx.fillStyle = P.hat; ctx.beginPath(); ctx.ellipse(0, -100.5, 11.5, 2.7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7.2, -100.5); ctx.lineTo(-6.2, -110.5); ctx.quadraticCurveTo(0, -113.5, 6.2, -110.5); ctx.lineTo(7.2, -100.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.band; ctx.fillRect(-7.1, -104, 14.2, 2);
    ctx.restore();
  }
  function drawAngelE(fl) {
    const A = G.angel, a = A.act, s = depth(A.y);
    let p = angelRise;
    if (a.phase === "dive") p = angelDive; else if (a.phase === "hit") p = angelStrikeP(clamp(a.t / 0.24, 0, 1)); else if (a.phase === "lift") p = angelCarry;
    if (fl) { if (A.z < 40) drawFigure("angel", A.x, A.y + 2, s, A.dir, p, { flipY: true, alpha: 0.08, t: G.t, dim: true }); return; }
    if (A.z < 120) glowOval(A.x, A.y + 2, 50 * s, 10 * s, C.holy, 0.35 * (1 - A.z / 120));
    // The streak of his dive.
    if (a.phase === "dive") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; line(A.x - A.dir * 60, A.y - A.z - 260, A.x, A.y - A.z - 60, C.holy, 10); ctx.restore(); }
    drawFigure("angel", A.x, A.y - A.z, s * 1.05, A.dir, p, { t: G.t, handGlow: a.phase === "hit" ? 1 : 0, shine: 1.2 });
  }
  function foePose(f) {
    const a = f.act, t = G.t + f.seed, grab = f.kind === "grab";
    if (a.kind === "floored" || (a.kind === "castout" && f.takenDown)) return a.face ? demonFace() : demonFloored(t, grab);
    if (a.kind === "rise") return demonRise(t, grab, a.t / 0.4, a.face);
    if (a.kind === "emerge") return pose({ lean: 0.15, head: -0.35 + 0.1 * Math.sin(t * 9), sF: 2.9 + 0.2 * Math.sin(t * 7), eF: 0.3, sB: 2.6 + 0.2 * Math.cos(t * 7), eB: 0.4, hF: 0.1, kF: 0.25, hB: -0.1, kB: 0.2 });
    if (a.kind === "countered") {
      // Caught by the wrist or the ankle, then thrown down on its back.
      const caught = demonLunge(f.atk === "kick" ? "kick" : false), k = clamp((a.u - 0.2) / 0.3, 0, 1);
      return k <= 0 ? caught : blendPose(caught, demonFloored(t, grab), smooth(k));
    }
    if (a.kind === "castout" || a.kind === "thrown" || a.kind === "spiked") return demonFlail(a.t);
    if (a.kind === "held") return demonFlail(a.t * 0.5);
    if (a.kind === "pulled") return demonPulled(a.t);
    if (a.kind === "hurt") return demonHurt(a.t);
    if (a.kind === "face") return demonFace();
    if (f.z > 0) return demonFlail(t * 0.5);
    if (f.dizzy > 0) return demonDizzy(t);
    if (a.kind === "wind") return blendPose(demonIdle(t, f.seed), demonWind(grab ? true : f.atk === "kick" ? "kick" : false), smooth(a.t / 0.3));
    if (a.kind === "lunge" || a.kind === "grabbing") return demonLunge(grab ? true : f.atk === "kick" ? "kick" : false);
    if (f.walk) return demonWalk(f.ph * 7);
    return demonIdle(t, f.seed);
  }
  function drawFoe(f, fl) {
    const s = depth(f.y) * (f.kind === "grab" ? 1.08 : 1), p = foePose(f), o = { t: G.t + f.seed, hat: f.hat, hatKind: f.hatKind, body: f.kind === "grab" ? "big" : undefined, shield: f.shield, dizzy: f.dizzy > 0, ink: f.shade ? "#2a2c3c" : undefined };
    if (fl) { if (f.act.kind !== "castout" && f.act.kind !== "emerge") drawFigure("demon", f.x, f.y + 2, s, f.dir, p, Object.assign({ flipY: true, alpha: 0.2 }, o)); return; }
    // The hole it climbs out of: burning open, and closing again after it.
    const em = f.act.kind === "emerge";
    if (em || f.holeT > 0) {
      const open = em ? smooth(f.act.t / 0.3) : clamp(f.holeT / 0.5, 0, 1), rx = 32 * s * open, ry = 8 * s * open;
      if (rx > 0.5) {
        glowOval(f.x, f.y, rx * 1.6, ry * 2.2, "#ff3a1a", 0.5 * open);
        ctx.fillStyle = "#010002"; ctx.beginPath(); ctx.ellipse(f.x, f.y, rx, ry, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA(C.ember, 0.85 * open); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, rx, ry, 0, 0, TAU); ctx.stroke();
      }
    }
    if (em) {
      // Up out of it: drawn only above the street, so the rest is still down in the hole.
      const up = smooth((f.act.t - 0.22) / 0.62), sink = (1 - up) * 140 * s;
      if (up <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(f.x - 90, f.y - 400, 180, 401); ctx.clip();
      drawFigure("demon", f.x, f.y + sink, s, f.dir, p, Object.assign({ rim: f.rim, rimX: f.x < G.hero.x ? -2 : 2, alpha: f.shade ? 0.85 : 1 }, o));
      ctx.restore();
      return;
    }
    if (f.act.kind === "castout") {
      const k = f.act.t;
      if (k > 0.42) { if (!f.puffed) { f.puffed = true; puff(f.x, f.y - 60 * s - f.z, C.holy, 16, false); G.parts.push({ kind: "ring", x: f.x, y: f.y - 60 * s - f.z, r: 4, t: 0.4 }); } return; }
      ctx.globalAlpha = 1 - k * 1.2;
    }
    const baseA = f.shade ? 0.85 : 1;
    const flat = f.act.kind === "floored" || f.takenDown;
    ctx.globalAlpha *= 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(f.x + (flat ? -f.dir * 4 : 0), f.y, (flat ? 46 : 20) * s * Math.max(0.4, 1 - f.z / 200), 5 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = (f.act.kind === "castout" ? 1 - f.act.t * 1.2 : 1) * baseA;
    // A dark red pool under each of them, where his is gold.
    if (f.act.kind !== "castout" && !f.shade) glowOval(f.x, f.y + 1, 30 * s, 7 * s, "#ff1a1a", 0.18);
    const bounce = f.act.kind === "floored" && f.act.t < 0.3 ? Math.sin(f.act.t / 0.3 * PI) * 10 : 0;
    const bound = G.rosary && G.rosary.f === f && G.beads && G.beads.length;
    if (bound) drawRosary(G.beads, "back");
    drawFigure("demon", f.x, f.y - f.z - bounce, s, f.dir, p, Object.assign({ rim: f.rim, rimX: f.x < G.hero.x ? -2 : 2 }, o));
    if (bound) drawRosary(G.beads, "front");
    ctx.globalAlpha = 1;
    // One that is down: a gold mark over it, and a ring that runs out as it gets ready to rise.
    if (f.act.kind === "floored" && !f.gone && !f.act.pinned) {
      const u = clamp(f.act.t / f.act.dur, 0, 1), mx = f.x - f.dir * 6, my = f.y - 58 * s - Math.abs(Math.sin(G.t * 6)) * 4, pul = 0.75 + 0.25 * Math.sin(G.t * 9), hot = u > 0.7;
      glow(mx, my, 20, C.holy, 0.4 * pul);
      ctx.strokeStyle = hexA(hot ? "#ff8a70" : C.holy, 0.85); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, 12, -PI / 2, -PI / 2 + TAU * (1 - u)); ctx.stroke();
      poly([mx - 6, my - 4, mx + 6, my - 4, mx, my + 5], "#fff3cf");
      const H0 = G.hero, close = Math.abs(H0.x - f.x) < 220 && Math.abs(H0.y - f.y) < 70;
      if (close || G.takedowns < 3) text(tip("TAP · FINISH", "SPACE · FINISH"), mx, my - 18, { align: "center", size: 7.5, weight: 800, spacing: 2, color: C.holy, alpha: pul });
    }
    // The signs: gold, counter it; red, get out of the way.
    if (f.sign) {
      const hx = f.x, hy = f.y - f.z - 138 * s, pul = 1 + 0.15 * Math.sin(G.t * 18), col = f.sign === "gold" ? C.holy : "#ff3040";
      glow(hx, hy, 26 * pul, col, 0.7);
      ctx.save(); ctx.translate(hx, hy); ctx.scale(pul, pul);
      if (f.sign === "gold") { rect(-2, -10, 4, 20, "#fff3cf"); rect(-8, -4, 16, 4, "#fff3cf"); }
      else { poly([0, -11, 10, 7, -10, 7], "#ff6070"); rect(-1.2, -4, 2.4, 6, "#200"); rect(-1.2, 3, 2.4, 2, "#200"); }
      ctx.restore();
      const k = clamp(f.act.t / f.act.dur, 0, 1); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 17, -PI / 2, -PI / 2 + TAU * (1 - k)); ctx.stroke();
    }
    if (f.dizzy > 0 && f.act.kind !== "castout") for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * TAU / 3, hx = f.x + Math.cos(a) * 16, hy = f.y - f.z - 128 * s + Math.sin(a) * 4; star(hx, hy, 4, "#ffe08a"); }
    // How much fight is left in it.
    if (f.hp < f.max && f.act.kind !== "castout") { const bw = 30 * s; rect(f.x - bw / 2, f.y + 6, bw, 2.5, "rgba(255,255,255,0.12)"); rect(f.x - bw / 2, f.y + 6, bw * Math.max(0, f.hp) / f.max, 2.5, f.rim); }
  }
  // Holding on a demon: a ring fills round it, and when it is full the holy water is ready.
  function drawCharge() {
    const T = G.touch; if (!T || T.moved || !T.target || T.target === "chains" || T.target.gone || T.done) return;
    const f = T.target, held = performance.now() - T.r0; if (held < 90) return;
    const k = clamp((held - 90) / (WATER_MS - 90), 0, 1), s = depth(f.y), x = f.x, y = f.y - f.z - 66 * s;
    ctx.strokeStyle = hexA(C.ice, 0.35 + 0.5 * k); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 30 * s, -PI / 2, -PI / 2 + TAU * k); ctx.stroke();
    if (k >= 1) { glow(x, y, 44 * s, C.ice, 0.5 + 0.2 * Math.sin(G.t * 20)); text("HOLY WATER", x, y - 38 * s, { align: "center", size: 8, weight: 800, spacing: 2, color: C.ice }); }
  }
  function star(x, y, r, c) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * PI / 5 - PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
  // The father's guardian: held against the car in chains of shadow, calling for help.
  function drawGuardian(t) {
    const g = G.guard, x = g.x, y = Y0 - 6;
    if (!g.freed) {
      const strain = Math.sin(t * 3) * 0.08;
      drawFigure("angel", x, y, 0.9, 1, pose({ lean: -0.25 + strain, head: -0.5, wa: 1.6, wl: 0.25, sF: 2.6, eF: 0.4, sB: 2.8, eB: 0.3, hF: 0.02, kF: 1.55, hB: -0.02, kB: 1.6 }), { t, pal: GUARD, dim: true, shine: 0.25 });
      glow(x, y - 70, 50, "#9fd0ff", 0.25 + 0.1 * Math.sin(t * 2));
      // The chains: dark links from the ground and the car to him.
      const anchors = [[x - 46, y + 4], [x + 50, y + 2], [x - 20, y - 110], [x + 34, y - 96], [x - 50, y - 60], [x + 56, y - 50]];
      const holds = [[x - 6, y - 30], [x + 6, y - 28], [x - 4, y - 92], [x + 6, y - 88], [x - 8, y - 60], [x + 8, y - 58]];
      for (let i = 0; i < g.chains; i++) {
        const [ax, ay] = anchors[i], [hx, hy] = holds[i], n = 7;
        for (let k = 0; k <= n; k++) {
          const u = k / n, cx = lerp(ax, hx, u), cy = lerp(ay, hy, u) + Math.sin(u * PI) * 6 + Math.sin(t * 4 + i) * 1.2;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(hy - ay, hx - ax) + (k % 2 ? PI / 2 : 0) * 0.6);
          ctx.strokeStyle = "#020104"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, TAU); ctx.stroke();
          ctx.strokeStyle = hexA("#7a2a6a", 0.55); ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
        }
      }
      // In the chains phase, the chains can be struck: a ring shows it.
      if (chainsOpen()) { ctx.strokeStyle = hexA(C.holy, 0.4 + 0.3 * Math.sin(t * 5)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 60, 58, 0, TAU); ctx.stroke(); text(tip("TAP", "SPACE"), x, y - 125, { align: "center", size: 9, weight: 800, spacing: 3, color: C.holy, alpha: 0.6 + 0.3 * Math.sin(t * 5) }); }
    } else {
      // Free: risen, bright, beside the car.
      const fight = g.fight > 0;
      drawFigure("angel", x, y + 4, 0.95, 1, pose({ wa: fight ? -2.4 : -2.1, wl: fight ? 1.1 : 0.7, lift: 6 + Math.sin(t * 1.5) * 2, sF: fight ? 2.2 : 0.4, eF: 0.3 }), { t, pal: GUARD, shine: 0.8 });
    }
  }
  function drawParts() {
    for (const p of G.parts) {
      const a = 1 - p.t / (LIFE[p.kind] || 0.6);
      if (p.kind === "spark") { line(p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.c, 2); glow(p.x, p.y, 6, p.c, a * 0.6); }
      else if (p.kind === "drop") circle(p.x, p.y, 2.2, "rgba(196,240,255," + a + ")");
      else if (p.kind === "shard") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); poly([-5, -3, 6, 0, -3, 4], "#050308"); ctx.restore(); glow(p.x, p.y, 6, C.ember, a * 0.5); }
      else if (p.kind === "link") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = "#1a0a14"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, TAU); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; }
      else if (p.kind === "puff") { const k = p.t / 0.9; glow(p.x, p.y, 10 + k * 20, C.holy, (1 - k) * 0.8); circle(p.x, p.y, (1 - k) * 4, "#fff6dc"); }
      else if (p.kind === "smoke") { const k = p.t / 0.9; ctx.globalAlpha = (1 - k) * 0.7; circle(p.x, p.y, 8 + k * 16, G.world === "heights" ? "#e8dcc0" : "#030205"); ctx.globalAlpha = 1; }
      else if (p.kind === "ring") { ctx.strokeStyle = hexA(C.holy, Math.max(0, a)); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.45, 0, 0, TAU); ctx.stroke(); }
      else if (p.kind === "hat") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(p.s, p.s); ctx.fillStyle = "#050308"; ctx.beginPath(); ctx.ellipse(0, 0, 12, 2.2, 0, 0, TAU); ctx.fill(); if (p.hk === 1) { ctx.beginPath(); ctx.arc(0, -1, 6, PI, TAU); ctx.fill(); } else poly([-6, 0, -4, -8, 3, -7, 7, -1], "#050308"); ctx.restore(); }
      else if (p.kind === "flask" || p.kind === "throwflask") { const dur = p.kind === "flask" ? 0.45 : p.dur, k = clamp(p.t / dur, 0, 1), x = lerp(p.x, p.x1, k), y = lerp(p.y, p.y1, k) - Math.sin(k * PI) * (p.kind === "flask" ? 60 : 40); ctx.save(); ctx.translate(x, y); ctx.rotate(k * 12); rect(-2, -5, 4, 8, "#bfe8ff"); rect(-1, -7, 2, 2, "#e9e6df"); ctx.restore(); glow(x, y, 10, C.ice, 0.6); }
      else if (p.kind === "streak") { ctx.save(); ctx.globalCompositeOperation = "lighter"; line(p.x0, p.y0, p.x1, p.y1, hexA("#c4f0ff", Math.max(0, a)), 6); line(p.x0, p.y0, p.x1, p.y1, "#ffffff", 2); ctx.restore(); }
      else if (p.kind === "mark") { ctx.strokeStyle = hexA(C.holy, Math.max(0, a) * 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 + p.t * 40, 3 + p.t * 10, 0, 0, TAU); ctx.stroke(); }
      else if (p.kind === "warn") { const f = p.f; if (!f.gone) { const hx = f.x, hy = f.y - f.z - 138 * depth(f.y); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = hexA(p.c, Math.max(0, a)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, 14 + p.t * 130, 0, TAU); ctx.stroke(); ctx.restore(); } }
      else if (p.kind === "beam") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.max(0, a); poly([p.x - 30, 0, p.x + 30, 0, p.x + 70, H, p.x - 70, H], C.holy); ctx.restore(); }
    }
    for (const p of G.pops) {
      const a = clamp(1 - (p.t - 0.6) / 0.5, 0, 1), y = p.y - p.t * 26;
      text(p.text, p.x, y, { align: "center", size: p.big ? 16 : 11, weight: 800, spacing: p.big ? 3 : 2, color: p.c, glow: p.big ? C.holy : p.c, blur: p.big ? 16 : 10, alpha: a });
    }
  }
  function drawHUD() {
    const H0 = G.hero;
    text("FR. LAWRENCE", 16, 20, { size: 8, weight: 700, spacing: 2, color: C.holy });
    rect(16, 26, 140, 6, "rgba(255,255,255,0.1)"); rect(16, 26, 140 * H0.resolve / 100, 6, H0.resolve < 30 && Math.sin(G.t * 10) > 0 ? "#ff6a50" : "#e9eef8");
    // Falls in a row: three, and down to the Depths.
    if (!G.kata) {
      for (let i = 0; i < 3; i++) { const on = i < (G.woe || 0), x = 168 + i * 11; circle(x, 29, 3.6, on ? "#ff5a3a" : "rgba(255,255,255,0.12)"); if (on) glow(x, 29, 9, "#ff3a2a", 0.4 + (G.woeT || 0) * 0.5); }
      text("FALLS", 168 + 3 * 11, 32, { size: 7, weight: 700, spacing: 2, color: G.woe ? "#ff8a70" : "rgba(233,230,223,0.35)" });
    }
    for (let i = 0; i < SPIRIT; i++) { const x = 20 + i * 11, y = 44, on = i < H0.spirit; ctx.save(); ctx.translate(x, y); ctx.rotate(PI / 4); rect(-3, -3, 6, 6, on ? C.holy : "rgba(255,255,255,0.12)"); ctx.restore(); if (on) glow(x, y, 9, C.holy, 0.4); }
    text("SPIRIT", 22 + SPIRIT * 11, 47, { size: 7, weight: 700, spacing: 2, color: "rgba(242,212,122,0.6)" });
    // Feathers: the blows still to land before his angel comes down (three in the Heights; none
    // can reach him in the Depths).
    const every = R().swoop, n = every ? H0.combo % every : 0, ready = G.angel.act.kind === "above";
    for (let i = 0; i < (every || 5); i++) { const x = 20 + i * 14, y = 60, on = i < n; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6); ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 2, 0, 0, TAU); ctx.fillStyle = on ? "#fff6dc" : every ? "rgba(255,255,255,0.14)" : "rgba(255,90,58,0.2)"; ctx.fill(); ctx.restore(); if (on) glow(x, y, 8, C.holy, 0.35); }
    text(!every ? "HIS ANGEL IS FAR" : ready ? "HIS ANGEL" : "HIS ANGEL IS HERE", 22 + (every || 5) * 14, 63, { size: 7, weight: 700, spacing: 2, color: !every ? "#ff8a70" : ready ? "rgba(242,212,122,0.6)" : C.holy });
    // The combo, and what it opens.
    if (H0.combo >= 2) {
      const k = clamp(H0.comboT / R().comboT, 0, 1);
      text(H0.combo + "", W - 66, 60, { align: "right", size: 34, weight: 800, italic: true, color: "#ffffff", glow: C.holy, blur: 16, alpha: 0.4 + 0.6 * k });
      text("HITS", W - 62, 60, { size: 9, weight: 800, spacing: 2, color: C.holy, alpha: 0.4 + 0.6 * k });
      if (H0.combo >= 5) text(H0.combo >= 10 ? "sobria ebrietas" : "sobria", W - 18, 78, { align: "right", size: 15, italic: true, font: FONT.line, weight: 500, color: C.holy, alpha: 0.5 + 0.5 * k });
    }
    // How far to the Heights.
    if (G.world === G.base && !G.shift && H0.combo >= 4 && (!G.kata || G.kata.i >= HEIGHTS_LESSON)) {
      const left = HEIGHTS_AT - H0.combo;
      text(left + " MORE: THE HEIGHTS", W - 18, 96, { align: "right", size: 8, weight: 800, spacing: 2, color: C.holy, alpha: 0.55 + 0.45 * (H0.combo / HEIGHTS_AT) });
      rect(W - 118, 101, 100, 2, "rgba(255,255,255,0.15)"); rect(W - 118, 101, 100 * H0.combo / HEIGHTS_AT, 2, C.holy);
    }
    // The other worlds: how long the Heights last, and how far to climb out of the Depths.
    if (G.world === "heights" && !G.shift) { const k = 1 - G.worldT / (G.kata ? 7 : 12); rect(W / 2 - 80, H - 18, 160, 4, "rgba(255,255,255,0.25)"); rect(W / 2 - 80, H - 18, 160 * clamp(k, 0, 1), 4, C.holy); text("THE HEIGHTS", W / 2, H - 24, { align: "center", size: 8, weight: 800, spacing: 3, color: "#5a4020" }); }
    if (G.world === "depths" && !G.shift) {
      for (let i = 0; i < DEPTHS_OUT; i++) { const x = W / 2 - (DEPTHS_OUT - 1) * 8 + i * 16, on = i < H0.combo; circle(x, H - 18, 4, on ? C.holy : "rgba(255,90,58,0.3)"); if (on) glow(x, H - 18, 10, C.holy, 0.5); }
      text(DEPTHS_OUT + " IN A ROW TO RISE", W / 2, H - 30, { align: "center", size: 8, weight: 800, spacing: 3, color: "#ff8a70" });
    }
    if (G.banner) {
      const b = G.banner, a = clamp(b.t / 0.4, 0, 1) * clamp((3 - b.t) / 0.8, 0, 1), y = b.small ? 104 : H * 0.42;
      text(b.text, W / 2, y, { align: "center", font: FONT.title, size: b.small ? 20 : 34, weight: 700, spacing: b.small ? 5 : 8, color: b.c, glow: b.c, blur: 20, alpha: a });
      if (b.sub) text(b.sub, W / 2, y + (b.small ? 18 : 24), { align: "center", font: FONT.line, italic: true, size: b.small ? 13 : 16, weight: 500, color: b.c, alpha: a * 0.85 });
    }
    // The blessing, when the Spirit is full.
    if (G.world === "heights" && !G.shift && !G.finishing) {
      const bx = W - 52, by = H - 52, pul = 1 + 0.1 * Math.sin(G.t * 8);
      glow(bx, by, 60 * pul, C.holy, 0.7); circle(bx, by, 28 * pul, "rgba(255,240,200,0.9)"); ctx.strokeStyle = "#8a6020"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 28 * pul, 0, TAU); ctx.stroke();
      poly([bx, by + 14, bx - 11, by - 4, bx - 4, by - 4, bx - 4, by - 14, bx + 4, by - 14, bx + 4, by - 4, bx + 11, by - 4], "#8a6020");
      text(tip("FROM ON HIGH", "B · FROM ON HIGH"), W - 12, by + 42, { align: "right", size: 8, weight: 800, spacing: 1.5, color: "#5a4020", max: 110 });
      buttons.push({ x: bx - 36, y: by - 36, w: 72, h: 72, act: () => finisher() });
    } else if (H0.spirit >= SPIRIT) {
      const bx = W - 52, by = H - 52, pul = 1 + 0.08 * Math.sin(G.t * 6);
      glow(bx, by, 50 * pul, C.holy, 0.5); circle(bx, by, 26 * pul, "rgba(20,14,8,0.85)"); ctx.strokeStyle = C.holy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 26 * pul, 0, TAU); ctx.stroke();
      rect(bx - 2.5, by - 13, 5, 26, "#fff3cf"); rect(bx - 10, by - 6, 20, 5, "#fff3cf");
      text(tip("BLESS", "B · BLESS"), bx, by + 40, { align: "center", size: 8, weight: 800, spacing: 2, color: C.holy });
      buttons.push({ x: bx - 34, y: by - 34, w: 68, h: 68, act: () => bless() });
    }
    // Any of them off the screen: a red mark at the edge, the way to them. The chains, in gold.
    const v = G.view, edge = (wx, wy, col, label) => {
      const x = (wx - v.cx) * v.k + W / 2; if (x > 6 && x < W - 6) return;
      const right = x >= W, ex = right ? W - 12 : 12, ey = clamp((wy - 70 - v.cy) * v.k + H / 2, 70, H - 40);
      poly(right ? [ex + 6, ey, ex - 4, ey - 8, ex - 4, ey + 8] : [ex - 6, ey, ex + 4, ey - 8, ex + 4, ey + 8], col); glow(ex, ey, 12, col, 0.4);
      if (label) text(label, right ? ex - 10 : ex + 10, ey + 3, { align: right ? "right" : "left", size: 7, weight: 800, spacing: 1.5, color: col });
    };
    if (!G.shift) { for (const f of alive()) edge(f.x, f.y, f.sign === "red" ? "#ff3040" : f.sign === "gold" ? C.holy : "#ff6a5a"); if (chainsOpen()) edge(G.guard.x, Y0, C.holy, "CHAINS"); }
    // The angel's words. In the practice they stay until the next lesson.
    const until = G.kata ? 60 : 7;
    if (G.msg && G.msg.t < until) {
      const a = clamp(G.msg.t / 0.3, 0, 1) * clamp((until - G.msg.t) / 0.8, 0, 1), who = G.msg.who === "guardian";
      const ls = wrap(G.msg.text, Math.min(W - 240, 480), "italic 500 17px " + FONT.line), bw = Math.min(W - 220, 500);
      ctx.globalAlpha = 0.55 * a; rect(W / 2 - bw / 2, 8, bw, 14 + ls.length * 20, "#050407"); ctx.globalAlpha = 1;
      ls.forEach((l, i) => text(l, W / 2, 26 + i * 20, { align: "center", size: 17, weight: 500, italic: true, font: FONT.line, color: who ? "#c4f0ff" : "#f6eccb", alpha: a }));
    }
    // The practice: which lesson, the hint for it, and a way past it.
    if (G.kata) {
      const L = KATA[G.kata.i];
      text("PRACTICE · " + Math.min(KATA.length, G.kata.i + 1) + " / " + KATA.length, 16, 80, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)" });
      if (L && L.hint() && G.world === "kata") { const pul = 0.75 + 0.25 * Math.sin(G.t * 5); text(L.hint(), W / 2, H - 16, { align: "center", size: 12, weight: 800, spacing: 3, color: C.holy, glow: C.holy, blur: 10, alpha: pul, max: W - 60 }); }
      buttons.push({ x: 8, y: 88, w: 150, h: 26, act: () => { if (G.kata) kataEnd(); } });
      text(G.opts.only ? "END PRACTICE ›" : "SKIP PRACTICE ›", 16, 104, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.55)" });
    } else if (G.wave <= 0 && !G.practised && G.world === "street") {
      text(tip("TAP: STRIKE · HOLD ON ONE: HOLY WATER · NEVER THE SAME BLOW TWICE ON ONE · PAUSE FOR ALL THE MOVES", "ARROWS: MOVE · SPACE: STRIKE · X: COUNTER · Q: BLOCK · NEVER THE SAME BLOW TWICE ON ONE · PAUSE FOR ALL THE MOVES"),
        W / 2, H - 12, { align: "center", size: 7.5, weight: 700, spacing: 1.5, color: "rgba(233,230,223,0.5)", max: W - 40 });
    }
    pauseButton();
  }

  // ---- Touch ---------------------------------------------------------------------------------------
  function foeAt(p) {
    let best = null, bd = 1e9;
    for (const f of G.foes) {
      if (f.gone) continue;
      if (lying(f)) {
        // One lying down: the whole length of it, generously.
        const s = depth(f.y);
        if (Math.abs(p.x - f.x) > 64 * s || p.y < f.y - 70 * s || p.y > f.y + 20) continue;
        const d = Math.abs(p.x - f.x) * 0.6 + Math.abs(p.y - (f.y - 16)) * 0.4 - 8;
        if (d < bd) { bd = d; best = f; }
        continue;
      }
      const s = depth(f.y), top = f.y - f.z - 128 * s, bot = f.y - f.z + 10;
      if (p.y < top - (f.sign ? 34 : 14) || p.y > bot + 14 || Math.abs(p.x - f.x) > 34 * s + 10) continue;
      const d = Math.abs(p.x - f.x) + Math.abs(p.y - (top + bot) / 2) * 0.4;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  function onChains(p) { const g = G.guard; return chainsOpen() && Math.abs(p.x - g.x) < 64 && p.y > Y0 - 140 && p.y < Y0 + 14; }
  // A drag, read by where it began and which way it went.
  function gesture(T, dx, dy) {
    const tg = T.target;
    if (tg && tg !== "chains" && !tg.gone) {
      if (dy < -30 && Math.abs(dy) > Math.abs(dx) * 1.1) launch(tg);
      else if (dy > 30 && Math.abs(dy) > Math.abs(dx) * 1.1) slam(tg);
      else if (near(tg)) throwFoe(tg, dx, dy * 0.5);
      else stole(tg);
    }
  }
  function down(s, e) {
    if (G.over || G.down) return;
    const p = toWorld(s), f = foeAt(p);
    G.touch = { id: e.pointerId, x0: s.x, y0: s.y, t0: G.t, r0: performance.now(), target: f || (onChains(p) ? "chains" : null), moved: false, block: false, water: false };
  }
  function move(s, e) {
    const T = G.touch; if (!T || T.id !== e.pointerId) return;
    if (dist(s.x, s.y, T.x0, T.y0) > 14) T.moved = true;
    // A drag is read as soon as it is plainly a drag, so a dodge or a gadget comes in time.
    if (T.moved && !T.done && !T.block) { const dx = s.x - T.x0, dy = s.y - T.y0; if (Math.hypot(dx, dy) > 40) { T.done = true; gesture(T, dx, dy); } }
  }
  function up(s, e) {
    const T = G.touch; if (!T || T.id !== e.pointerId) return;
    G.touch = null;
    if (T.block) { if (G.hero.act.kind === "block") act("idle"); return; }
    if (T.done || G.over || G.down) return;
    if (!T.moved) {
      const p = toWorld(s);
      if (T.target === "chains") { tapChains(); return; }
      // Held a moment: holy water, near or far. A quick tap: a blow.
      if (T.target && !T.target.gone) { if (T.water && !lying(T.target)) water(T.target); else tapDemon(T.target); return; }
      const f = foeAt(p); if (f) { tapDemon(f); return; }
      if (onChains(p) && tapChains()) return;
      tapGround(p);
    } else { const dx = s.x - T.x0, dy = s.y - T.y0; if (Math.hypot(dx, dy) > 20) gesture(T, dx, dy); }
  }
  function key(code, isDown, e) {
    G.keys[code] = isDown;
    if (!isDown) { if (["KeyQ", "KeyZ", "ShiftLeft", "ShiftRight"].includes(code) && G.hero.act.kind === "block") act("idle"); return; }
    if (e && e.repeat) return;
    if (code === "Escape" || code === "KeyP") { Game.pause(); return; }
    if (G.over || G.down) return;
    const H0 = G.hero, [kx, ky] = arrows();
    const any = () => { const c = pick(); return c && c.f; };
    if (code === "Space" || code === "KeyJ") {
      const c = pick({ chains: true });
      if (c && c.chains) tapChains(); else if (c) tapDemon(c.f, true);
    } else if (code === "KeyX") {
      const gold = alive().filter((f) => f.sign === "gold" && f.act.kind === "wind").sort((a, b) => Math.abs(a.x - H0.x) - Math.abs(b.x - H0.x))[0];
      if (gold) counter(gold); else pop(H0.x, H0.y - 130, "NOTHING TO COUNTER", "rgba(233,230,223,0.6)");
    } else if (code === "KeyZ" || code === "ShiftLeft" || code === "ShiftRight") { if (!busy()) act("block", {});
    } else if (code === "KeyC") heavy(any());
    else if (code === "KeyE") launch(any());
    else if (code === "KeyV") { const c = pick({ air: true }) || pick(); if (c) slam(c.f); }
    else if (code === "KeyF") { const c = pick(); water(c && c.f, kx || H0.dir, ky); }
    else if (code === "KeyR") { const c = pick({ far: true }); if (c) stole(c.f); else pop(H0.x, H0.y - 130, "NONE FAR ENOUGH", "rgba(233,230,223,0.6)"); }
    else if (code === "KeyT") {
      const c = pick({ near: true }); if (!c) { pop(H0.x, H0.y - 130, "NONE CLOSE ENOUGH", "rgba(233,230,223,0.6)"); return; }
      let dx = kx, dy = ky;
      if (!dx && !dy) { const o = alive().filter((g) => g !== c.f).sort((a, b) => dist(a.x, a.y, c.f.x, c.f.y) - dist(b.x, b.y, c.f.x, c.f.y))[0]; if (o) { dx = o.x - c.f.x; dy = (o.y - c.f.y) * 2; } else dx = c.f.x >= H0.x ? 1 : -1; }
      throwFoe(c.f, dx, dy);
    }
    else if (code === "KeyQ") { if (!busy()) act("block", {}); }
    else if (code === "KeyB") { if (G.world === "heights") finisher(); else bless(); }
  }
  // The moves, for the pause screen.
  function moves() {
    return usingKeys() ? [
      ["Arrows", "move"], ["Space", "strike, toward the arrow held"], ["The one rule", "never the same blow twice on the same demon"], ["X", "counter a gold sign: catch, throw, pin"],
      ["Space, at one down", "finish it: a takedown"], ["Q, held", "block one blow (the red sign too); then again"], ["C", "heavy blow: breaks a shield"],
      ["E", "launch"], ["Space, in the air", "keep it up"], ["V", "slam (in the air: spike)"], ["F", "holy water, near or far"], ["R", "the rosary: wrap a far one, haul it in"],
      ["T + arrow", "throw a near one into another"], ["B", "bless; in the Heights, come down from on high"], ["12 in a row", "up to the Heights"],
    ] : [
      ["Tap a demon", "strike, then on to the next"], ["The one rule", "never the same blow twice on the same demon"], ["Tap open street", "zip there"], ["Tap a gold sign", "counter: catch, throw, pin"],
      ["Tap one that is down", "finish it: a takedown"], ["Hold open street", "block one blow (the red sign too); then again"], ["Tap twice", "heavy blow: breaks a shield"],
      ["Swipe up on one", "launch"], ["Tap it in the air", "keep it up"], ["Swipe down on one", "slam (in the air: spike)"], ["Hold on one, let go", "holy water, near or far"],
      ["Drag a far one", "the rosary: wrap it, haul it in"], ["Drag a near one", "throw it into another"], ["Gold button", "bless; in the Heights, come down from on high"], ["12 in a row", "up to the Heights"],
    ];
  }
  return { start, step, draw, down, move, up, key, moves, get G() { return G; } };
})();
