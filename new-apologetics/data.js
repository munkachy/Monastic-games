// New Apologetics — the numbers behind the game.
//
// Every hero's moves are listed in the same order as their animations in
// moves.js (Theater.MOVES), so move i here plays animation i there.
//
// Targets: "foe" one opponent you choose, "foes" every opponent, "two" two
// opponents at random, "ally" one friend you choose, "allies" every friend,
// "self". Effects run in order on each target:
//   dmg: a hit on Composure, as a share of the fighter's Attack; hits: how many
//   vs: [status, multiplier] hits harder against a status (or "guarded")
//   zeal: change in Zeal (−1 knocks it down a step), chance: how likely
//   status: dumbfounded, doubting, muted, examined, called; turns
//   buff: atk, def, crit; amt (+0.5 is 50% up); turns
//   heal: share of full Composure (revives the Discouraged)
//   cleanse, purge (remove boosts: a number or "all"), shield, citation
//   taunt: the targets must answer the one who used it
//   counter: answer back when addressed; immune: "steadfast" (no Zeal
//   loss) or "testimony" (hits land at half strength)
//   selfZeal / allyZeal: Zeal for the user or its friends
//   onBreak: extra Zeal for the user if the move puts someone out
// An opponent with secretConvert converts when his Zeal bottoms out,
// instead of leaving; the player is never told which ones do.
// stats: [Composure, Attack, Defense, Speed].
// A move's pierce list names defenses it passes through.

const GameData = (() => {
  const H = (name, target, cd, start, effects, extra) => Object.assign({ name, target, cd, start: start || 0, effects }, extra || {});

  const HEROES = {
    akin: { name: "Jimmy Akin", stats: [225, 78, 25, 58], skills: [
      H("Precise Distinction", "foe", 0, 0, [{ dmg: 1.0 }]),
      H("Senior Apologist", "foe", 3, 0, [{ dmg: 1.5, vs: ["guarded", 1.5] }, { status: "dumbfounded", turns: 2, chance: 0.25 }]),
      H("Logical Paradox", "foes", 3, 0, [{ buff: "atk", amt: -0.2, turns: 3 }, { zeal: -1, chance: 0.5 }]),
      H("Mysterious World", "two", 4, 2, [{ status: "examined", turns: 3 }, { purge: 1, chance: 0.5 }, { zeal: -1 }]),
    ] },
    muse: { name: "Ethan Muse", stats: [288, 76, 18, 88], skills: [
      H("Pointed Question", "foe", 0, 0, [{ dmg: 1.25 }, { status: "doubting", turns: 3, chance: 0.5 }]),
      H("Open Challenge", "foes", 3, 0, [{ taunt: 3 }, { zeal: -1 }]),
      H("Steelman Stance", "self", 3, 1, [{ counter: 3 }, { buff: "atk", amt: 0.5, turns: 3 }]),
      H("Camera Mog", "foe", 4, 2, [{ dmg: 4.0, vs: ["doubting", 1.5] }, { zeal: -1 }, { onBreak: 1 }]),
      H("Vindicatory Miracles", "foes", 5, 3, [{ purge: 1 }, { zeal: -1 }, { status: "dumbfounded", turns: 2, chance: 0.5 }], { duo: "spitzer" }),
    ] },
    schmitz: { name: "Fr. Mike Schmitz", stats: [250, 58, 12, 125], skills: [
      H("Two-Minute Homily", "foe", 0, 0, [{ dmg: 1.5 }]),
      H("I'm Praying for You", "ally", 3, 0, [{ buff: "atk", amt: 0.5, turns: 3 }, { buff: "crit", amt: 0.25, turns: 3 }]),
      H("The Bible in a Year", "allies", 3, 1, [{ zeal: 1 }, { buff: "def", amt: 0.5, turns: 3 }]),
      H("The Catechism in a Year", "allies", 4, 2, [{ cleanse: true }, { shield: 0.25, turns: 3 }, { buff: "atk", amt: 0.3, turns: 3 }]),
    ] },
    bertuzzi: { name: "Cameron Bertuzzi", stats: [238, 79, 14, 118], passive: { allies: { def: 0.05 } }, skills: [
      H("Clarifying Questions", "foe", 0, 0, [{ dmg: 0.45, hits: 3 }]),
      H("Time's Up", "foe", 3, 0, [{ dmg: 2.5 }, { buff: "atk", amt: -0.5, turns: 3 }]),
      H("Point of Order", "foes", 3, 1, [{ zeal: -1 }, { purge: 1 }]),
      H("Bayesian Update", "allies", 4, 2, [{ heal: 0.3 }, { cleanse: true }, { buff: "def", amt: 0.5, turns: 3 }]),
    ] },
    horn: { name: "Trent Horn", stats: [250, 82, 15, 140], passive: { group: ["akin", "horn", "heschmeyer"], atk: 0.05 }, skills: [
      H("Deadpan", "foe", 0, 0, [{ dmg: 1.5 }, { buff: "atk", amt: -0.2, turns: 1, chance: 0.5 }]),
      H("Free-for-All Friday", "allies", 3, 0, [{ zeal: 1 }, { randomLift: true }]),
      H("Is That in the Bible?", "foes", 3, 1, [{ purge: 1 }, { zeal: -1 }], { pierce: ["security", "faith"] }),
      H("The Case for Catholicism", "foes", 4, 2, [{ dmg: 3.0, vs: ["guarded", 1.5] }]),
    ] },
    fradd: { name: "Matt Fradd", stats: [225, 61, 14, 125], skills: [
      H("Cheeky Question", "foe", 0, 0, [{ dmg: 1.5 }]),
      H("Pints with Aquinas", "ally", 3, 0, [{ heal: 0.5 }, { zeal: 2, chance: 0.5 }]),
      H("Australian Charm", "ally", 3, 0, [{ buff: "atk", amt: 0.5, turns: 3 }, { zeal: 2 }]),
      H("Summa Session", "allies", 4, 2, [{ cleanse: true }, { buff: "def", amt: 0.5, turns: 3 }]),
    ] },
    godlogic: { name: "GodLogic", guest: true, stats: [163, 135, 15, 125], skills: [
      H("Smooth Question", "foe", 0, 0, [{ dmg: 1.0 }, { buff: "atk", amt: -0.2, turns: 1, chance: 0.1 }]),
      H("Smooth Pivot", "ally", 3, 0, [{ citation: true }, { buff: "atk", amt: 0.3, turns: 3 }]),
      H("Stay Smooth", "allies", 3, 0, [{ shield: 0.3, turns: 3 }, { zeal: 1 }]),
      H("Common Ground", "foes", 4, 0, [{ purge: "all" }, { buff: "atk", amt: -0.5, turns: 3 }, { zeal: -1, faction: "islam" }]),
    ] },
    barron: { name: "Bishop Barron", stats: [262, 82, 11, 110], skills: [
      H("Sunday Sermon", "foe", 0, 0, [{ dmg: 1.25 }, { buff: "atk", amt: -0.2, turns: 1, chance: 0.5 }]),
      H("Word on Fire", "foes", 3, 0, [{ dmg: 2.5 }]),
      H("The Way of Beauty", "self", 3, 1, [{ tauntAll: 3 }, { citation: true }, { buff: "atk", amt: 0.3, turns: 3 }]),
      H("No Beige Catholicism", "foe", 4, 2, [{ status: "muted", turns: 3 }, { buff: "atk", amt: -0.3, turns: 3 }, { zeal: -1 }]),
    ] },
    hicks: { name: "Fr. Boniface Hicks", stats: [200, 128, 14, 110], skills: [
      H("Gentle Correction", "foe", 0, 0, [{ dmg: 1.25 }, { buff: "atk", amt: -0.2, turns: 1, chance: 0.25 }]),
      H("Discernment of Spirits", "foes", 3, 0, [{ status: "examined", turns: 3 }]),
      H("Obsculta", "foe", 3, 1, [{ status: "dumbfounded", turns: 2 }, { zeal: -2 }]),
      H("Spiritual Direction", "foe", 4, 2, [{ zeal: -2 }, { selfZeal: 2 }]),
    ] },
    pine: { name: "Fr. Gregory Pine", stats: [213, 88, 14, 118], skills: [
      H("Distinguo", "two", 0, 0, [{ dmg: 0.75 }, { friendsCleanse: "dumbfounded" }]),
      H("Sed Contra", "allies", 3, 0, [{ buff: "crit", amt: 0.5, turns: 3 }, { immune: "steadfast", turns: 3 }]),
      H("The Five Ways", "foes", 3, 1, [{ dmg: 2.5 }, { buff: "def", amt: -0.3, turns: 3 }]),
      H("Respondeo", "foe", 4, 2, [{ dmg: 1.5, hits: 3 }, { allyZeal: 2 }]),
    ] },
    marygrace: { name: "Sr. Mary Grace", stats: [213, 75, 10, 170], skills: [
      H("A Word of Truth", "foe", 0, 0, [{ dmg: 1.5 }]),
      H("Let Love", "allies", 3, 0, [{ buff: "def", amt: 0.5, turns: 3 }, { zeal: 1 }]),
      H("Every Life Is Good", "foes", 3, 1, [{ buff: "atk", amt: -0.3, turns: 3 }, { buff: "atk", amt: -0.3, turns: 3 }, { zeal: -1, chance: 0.5 }]),
    ] },
    rose: { name: "Lila Rose", stats: [200, 100, 15, 120], passive: { allies: { def: 0.05 } }, skills: [
      H("Every Life", "foe", 0, 0, [{ dmg: 1.25 }]),
      H("Sense Deception", "foe", 3, 0, [{ status: "examined", turns: 3 }, { purge: 1, chance: 0.5 }]),
      H("Counsel", "ally", 3, 0, [{ cleanse: true }, { zeal: 2 }]),
      H("Live Action", "foes", 4, 2, [{ buff: "atk", amt: -0.3, turns: 3 }, { zeal: -1 }, { allyZeal: 1 }]),
    ] },
    holdsworth: { name: "Brian Holdsworth", stats: [200, 135, 12, 125], skills: [
      H("Ten-Minute Essay", "foe", 0, 0, [{ dmg: 1.5 }]),
      H("Beauty Will Save the World", "allies", 3, 0, [{ heal: 0.25 }]),
      H("Cultural Diagnosis", "foe", 3, 1, [{ status: "examined", turns: 3 }, { buff: "def", amt: -0.5, turns: 3 }]),
      H("Authentic Catholic Culture", "allies", 4, 2, [{ cleanse: true }, { shield: 0.35, turns: 3 }, { zeal: 1 }, { immune: "steadfast", turns: 3 }]),
    ] },
    jurado: { name: "Alex Jurado", stats: [288, 100, 15, 88], skills: [
      H("One-Two", "foe", 0, 0, [{ dmg: 0.5, hits: 2 }]),
      H("Deep Cut", "foe", 3, 0, [{ status: "doubting", turns: 3 }, { buff: "def", amt: -0.5, turns: 3 }, { zeal: -1 }]),
      H("Stallone Voice", "foe", 3, 1, [{ dmg: 2.5 }, { status: "dumbfounded", turns: 2, chance: 0.5 }]),
      H("Voice of Reason", "foes", 4, 2, [{ purge: "all" }, { zeal: -2 }]),
    ] },
    spitzer: { name: "Fr. Robert Spitzer", stats: [188, 135, 18, 73], skills: [
      H("Fine-Tuning", "foe", 0, 0, [{ dmg: 0.6, hits: 2 }, { purge: 1, chance: 0.25 }]),
      H("The Four Levels of Happiness", "allies", 3, 0, [{ cleanse: true }, { shield: 0.25, turns: 3 }]),
      H("Borde–Guth–Vilenkin", "foe", 4, 2, [{ dmg: 2.5, splash: 1.0 }, { status: "muted", turns: 3 }, { zeal: -1 }]),
      H("Vindicatory Miracles", "foes", 5, 3, [{ purge: 1 }, { zeal: -1 }, { status: "dumbfounded", turns: 2, chance: 0.5 }], { duo: "muse" }),
    ] },
    hahn: { name: "Scott Hahn", stats: [275, 110, 22, 95], passive: { converts: ["hahn", "akin", "bertuzzi", "holdsworth"] }, skills: [
      H("Covenant Is Family", "foe", 0, 0, [{ dmg: 1.25 }], { pierce: ["faith"] }),
      H("Wide-Eyed Wonder", "foe", 3, 0, [{ status: "dumbfounded", turns: 2 }, { buff: "atk", amt: -0.3, turns: 3 }]),
      H("The Lamb's Supper", "allies", 3, 1, [{ heal: 0.25 }, { cleanse: true }, { zeal: 1 }]),
      H("Rome Sweet Home", "foes", 4, 2, [{ zeal: -2 }, { purge: "all", faction: "protestant" }], { pierce: ["faith"] }),
    ] },
    heschmeyer: { name: "Joe Heschmeyer", stats: [188, 88, 10, 170], passive: { group: ["akin", "horn", "heschmeyer"], atk: 0.05 }, skills: [
      H("Ignatius of Antioch", "foe", 0, 0, [{ dmg: 0.65, hits: 2 }, { status: "doubting", turns: 3, chance: 0.5 }]),
      H("Former Litigator", "allies", 3, 0, [{ buff: "crit", amt: 0.5, turns: 3 }, { selfCounter: 3 }]),
      H("Shameless Popery", "foe", 3, 1, [{ dmg: 1.2, hits: 3 }, { zeal: -1 }]),
    ] },
  };

  // ---- Opponents ---------------------------------------------------------------------
  // `anim` says how each move looks on stage, using the shared animations.

  const V = (glyphs, color) => ({ kind: "volley", glyphs, color: color || "#de5e55" });
  const X = (say, mark) => ({ kind: "hex", say, mark: mark || [] });
  const A = (say, mark, item) => ({ kind: "approach", say, mark, item });
  const U = (say, mark) => ({ kind: "aura", say, mark: mark || [] });

  const FOES = {
    skeptic: { name: "Skeptic Streamer", grunt: true, faction: "atheist", stats: [110, 62, 10, 95], skills: [
      H("Hot Take", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["?!"]) }),
      H("Where's the Evidence?", "foes", 3, 1, [{ buff: "atk", amt: -0.2, turns: 2 }], { anim: X("Where's the evidence?", "down") }),
    ] },
    preacher: { name: "Street Preacher", grunt: true, faction: "protestant", stats: [115, 64, 10, 90], skills: [
      H("Turn or Burn", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["Repent!"]) }),
      H("Street Sermon", "foe", 3, 1, [{ status: "doubting", turns: 2 }], { anim: A("Have you read your Bible?", "doubting", "book") }),
    ] },
    elder: { name: "Elder Missionary", grunt: true, faction: "lds", stats: [115, 58, 16, 88], skills: [
      H("Testimony", "foe", 0, 0, [{ dmg: 1.0 }], { anim: V(["I know it's true."], "#7ea4e6") }),
      H("Pamphlet", "foe", 3, 1, [{ buff: "def", amt: -0.3, turns: 2 }], { anim: A("Would you like a pamphlet?", "down", "scroll") }),
    ] },
    dai: { name: "Street Debater", grunt: true, faction: "islam", stats: [115, 64, 12, 92], skills: [
      H("Show Me the Verse", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["Show me!"]) }),
      H("Tahrif", "foes", 3, 1, [{ purge: 1 }], { anim: X("Your Bible was changed.", "factcheck") }),
    ] },
    seminarian: { name: "Seminarian", grunt: true, faction: "protestant", stats: [110, 66, 12, 86], skills: [
      H("In the Greek…", "foe", 0, 0, [{ dmg: 1.1 }], { anim: V(["In the Greek…"], "#7ea4e6") }),
      H("TULIP", "foe", 3, 1, [{ status: "muted", turns: 1 }], { anim: X("Total depravity.", "muted") }),
    ] },

    // Joe Schmid, philosopher of religion (Majesty of Reason). Evolutionary
    // animal suffering first led him away from the Church; in August 2026 he
    // announced his return. Wear down his Zeal and he comes home.
    schmid: { name: "Joe Schmid", faction: "atheist", secretConvert: true, sign: ["CONFESSION", "WELCOME HOME"], stats: [120, 82, 16, 104], skills: [
      H("Majesty of Reason", "foe", 0, 0, [{ dmg: 1.2 }], { anim: V(["Consider…", "…a dilemma."], "#9fd0ff") }),
      H("Evolutionary Suffering", "foes", 3, 0, [{ status: "doubting", turns: 2 }, { zeal: -1, chance: 0.5 }], { anim: X("Millions of years of it?", ["doubting", "pipDown"]) }),
      H("Modal Collapse", "foe", 3, 1, [{ status: "dumbfounded", turns: 2 }], { anim: X("Then everything is necessary.", "dumbfounded") }),
      H("Steelman", "self", 3, 1, [{ heal: 0.2 }, { selfZeal: 1 }], { anim: U("Let me steelman that.", ["heal", "pipUp"]) }),
      // His Slavoj Žižek impression, sniffs and all. Nobody can argue through it.
      H("Žižek Impression", "foes", 4, 1, [{ status: "dumbfounded", turns: 1, chance: 0.5 }, { buff: "atk", amt: -0.2, turns: 2 }], { anim: X("…and so on, and so on. *sniff*", "dumbfounded") }),
    ] },

    oconnor: { name: "Alex O'Connor", boss: true, faction: "atheist", stats: [340, 85, 20, 105], skills: [
      H("Within Reason", "foe", 0, 0, [{ dmg: 1.25 }], { anim: V(["Hm, but…"], "#9fd0ff") }),
      H("The Fawn in the Forest", "foes", 3, 0, [{ status: "doubting", turns: 3 }, { zeal: -1 }], { anim: X("What about the fawn?", ["doubting", "pipDown"]) }),
      H("Euthyphro", "foe", 3, 1, [{ status: "dumbfounded", turns: 2 }], { anim: X("Good because God wills it, or…?", "dumbfounded") }),
      H("Charitable Skeptic", "self", 4, 2, [{ heal: 0.3 }, { buff: "def", amt: 0.5, turns: 3 }], { anim: U("That's a fair point.", ["heal", "up"]) }),
    ] },
    ryan: { name: "Ryan Hemelaar", boss: true, faction: "protestant", stats: [330, 72, 18, 110], skills: [
      H("Gospel Tract", "foe", 0, 0, [{ dmg: 1.25 }], { anim: A("Here, take one!", "down", "scroll") }),
      H("Are You a Good Person?", "foes", 3, 0, [{ status: "examined", turns: 3 }], { anim: X("Are you a good person?", "examined") }),
      H("If You Died Tonight", "foes", 3, 1, [{ zeal: -1 }], { anim: X("If you died tonight…?", "pipDown") }),
      H("Faith Alone", "self", 4, 2, [{ immune: "faith", turns: 2 }], { anim: U("It's by faith alone!", ["shield"]) }),
    ] },
    hansen: { name: "Jacob Hansen", boss: true, faction: "lds", stats: [340, 80, 24, 100], skills: [
      H("Scholarly Citation", "foe", 0, 0, [{ dmg: 1.25 }], { anim: V(["Footnote 14."], "#7ea4e6") }),
      H("Great Apostasy", "foes", 3, 0, [{ zeal: -1 }, { buff: "atk", amt: -0.3, turns: 3 }], { anim: X("The authority was lost.", ["pipDown", "down"]) }),
      H("Burning in the Bosom", "self", 3, 1, [{ heal: 0.25 }, { immune: "testimony", turns: 2 }], { anim: U("I've felt it.", ["heal", "shield"]) }),
      H("Eternal Progression", "self", 4, 2, [{ buff: "atk", amt: 0.6, turns: 3 }], { anim: U("As man is, God once was.", ["up"]) }),
    ] },
    speaker: { name: "Speakers' Corner Champion", boss: true, faction: "islam", stats: [340, 74, 18, 102], skills: [
      H("Crowd Question", "foe", 0, 0, [{ dmg: 1.25 }], { anim: V(["Answer me!"]) }),
      H("Tahrif", "foes", 3, 0, [{ purge: "all" }], { anim: X("Your Bible was corrupted.", "factcheck") }),
      H("Tawhid", "self", 4, 1, [{ immune: "steadfast", turns: 2 }], { anim: U("God is one!", ["shield"]) }),
      H("The Crowd Gathers", "self", 4, 2, [{ summon: "dai" }], { anim: U("Brothers, come!", ["up"]) }),
    ] },
    white: { name: "James White", boss: true, faction: "protestant", stats: [320, 80, 22, 108], skills: [
      H("Greek Exegesis", "foe", 0, 0, [{ dmg: 1.5 }, { status: "doubting", turns: 2, chance: 0.25 }], { anim: V(["In the Greek…", "…aorist."], "#7ea4e6") }),
      H("Sola Scriptura", "foes", 3, 0, [{ purge: "all" }, { buff: "atk", amt: -0.3, turns: 2 }], { anim: X("Scripture alone!", ["factcheck", "down"]) }),
      H("Eternal Security", "self", 5, 2, [{ immune: "security", turns: 2 }, { heal: 0.15 }], { anim: U("Perseverance of the saints.", ["shield", "heal"]) }),
      H("Debate Challenge", "foes", 4, 2, [{ dmg: 1.4 }, { selfZeal: 1 }], { anim: X("Let's debate. Right now.", ["down"]) }),
    ] },
  };

  // ---- The campaign ------------------------------------------------------------------

  const CAMPAIGN = [
    { id: "prologue", title: "The Comment Section", group: "Tutorial", missions: [
      { name: "Tutorial", foes: ["skeptic", "preacher"], team: ["horn", "akin"], level: -3, movesAt: 2 },
    ], scenes: { before: 0 }, unlocks: ["muse", "bertuzzi", "fradd", "schmitz"] },
    { id: "atheists", title: "The Fawn in the Forest", group: "Atheists", missions: [
      { name: "Comment Section Skeptics", foes: ["skeptic", "skeptic2"] },
      { name: "The Livestream", foes: ["skeptic", "skeptic2", "skeptic"] },
      { name: "Majesty of Reason", foes: ["skeptic2", "schmid", "skeptic"] },
      { name: "The Dialogue", foes: ["skeptic", "oconnor", "skeptic2"], boss: "oconnor" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["pine", "spitzer", "hicks", "hahn"] },
    { id: "evangelicals", title: "Are You a Good Person?", group: "Evangelicals", missions: [
      { name: "The City Square", foes: ["preacher", "preacher2"] },
      { name: "Tracts at the Corner", foes: ["preacher2", "preacher", "preacher2"] },
      { name: "Faith Alone?", foes: ["preacher", "preacher2", "preacher"] },
      { name: "If You Died Tonight", foes: ["preacher", "ryan", "preacher2"], boss: "ryan" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["heschmeyer", "holdsworth", "barron"] },
    { id: "lds", title: "The Restoration", group: "Latter-day Saints", missions: [
      { name: "A Knock at the Door", foes: ["elder", "elder2"] },
      { name: "The Visitors' Center", foes: ["elder2", "elder", "elder2"] },
      { name: "Ignatius of Antioch", foes: ["elder", "elder2", "elder"] },
      { name: "The Great Apostasy", foes: ["elder", "hansen", "elder2"], boss: "hansen" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: ["marygrace", "rose", "jurado"] },
    { id: "islam", title: "People of the Book", group: "Islam", guest: "godlogic", missions: [
      { name: "Speakers' Corner", foes: ["dai", "dai2"] },
      { name: "The Crowd", foes: ["dai2", "dai", "dai2"] },
      { name: "The Islamic Dilemma", foes: ["dai", "dai2", "dai"] },
      { name: "God Is One", foes: ["dai", "speaker", "dai2"], boss: "speaker" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: [] },
    { id: "reformed", title: "Scripture Alone?", group: "Reformed", missions: [
      { name: "The Seminary Library", foes: ["seminarian", "seminarian2"] },
      { name: "Reformed Podcasters", foes: ["seminarian2", "seminarian", "seminarian2"] },
      { name: "The Upper Room", foes: ["seminarian", "seminarian2", "seminarian"] },
      { name: "The Dividing Line", foes: ["seminarian", "white", "seminarian2"], boss: "white" },
    ], scenes: { before: 0, after: [1, 2, 3, 4] }, unlocks: [] },
    { id: "epilogue", title: "One Fold", group: "Epilogue", missions: [], scenes: { before: 0 }, unlocks: [] },
  ];

  const START = ["horn", "akin"];

  // Variants share a kit with the original, with a different look.
  for (const [copy, of] of [["skeptic2", "skeptic"], ["preacher2", "preacher"], ["elder2", "elder"], ["dai2", "dai"], ["seminarian2", "seminarian"]]) FOES[copy] = FOES[of];

  return { HEROES, FOES, CAMPAIGN, START };
})();
