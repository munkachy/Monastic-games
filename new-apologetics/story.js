// New Apologetics — the story, told in short cut scenes.
//
// Each chapter pits the team against one tradition and sets them a mystery:
// a question they cannot answer at first. Between battles, short scenes move
// the story along. Anyone on the roster can walk on and pitch in, whether or
// not they fought in the last battle.
//
// A line is [speaker, text, mark]. The speaker is a cast id, or "" for the
// narrator. The mark shows over the speaker's head: "?" puzzled, "!"
// surprised, "idea" a light bulb, "…" thinking. A cast entry that begins with
// "+" walks on during the scene, at the line where it first speaks.
//
// The words given to real people are drafts, still under review, written to
// reflect what each one has said in public.

const Story = (() => {
  const W = 640;
  const H = 360;
  const FONT = "'Pixelify Sans', 'Courier New', monospace";

  const NAMES = {
    akin: "Jimmy Akin", muse: "Ethan Muse", bertuzzi: "Cameron Bertuzzi", horn: "Trent Horn", fradd: "Matt Fradd",
    godlogic: "GodLogic", schmitz: "Fr. Mike Schmitz", barron: "Bishop Barron", hicks: "Fr. Boniface", pine: "Fr. Gregory Pine",
    marygrace: "Sr. Mary Grace", rose: "Lila Rose", holdsworth: "Brian Holdsworth", jurado: "Alex Jurado", spitzer: "Fr. Spitzer",
    heschmeyer: "Joe Heschmeyer", hahn: "Scott Hahn", oconnor: "Alex O'Connor", ryan: "Ryan (NeedGod.net)", white: "James White",
    hansen: "Jacob Hansen", speaker: "Speakers' Corner Champion", elder: "Elder Missionary", skeptic: "Skeptic Streamer",
    preacher: "Street Preacher", seminarian: "Seminarian", "": "",
  };

  // ---- The chapters ------------------------------------------------------------------

  const CHAPTERS = [
    {
      id: "prologue", title: "The Comment Section", group: "Tutorial", place: "studio",
      scenes: [
        { when: "Opening", place: "studio", left: ["horn","akin"], right: [], lines: [
          ["horn","Three hundred new comments on last night's clip."],
          ["akin","And the top one says: “Catholics can't answer a single one of these.”","…"],
          ["horn","Then let's answer them. One at a time."],
          ["akin","With gentleness and reverence. First Peter, chapter 3, verse 15."],
          ["","The two of them open the comments. It is going to be a long year."],
        ] },
      ],
    },
    {
      id: "atheists", title: "The Fawn in the Forest", group: "Atheists", boss: "oconnor", place: "forest", mystery: "Why would a good God let a fawn burn to death in a forest fire, alone, where no one will ever know?",
      scenes: [
        { when: "Before the first battle", place: "studio", left: ["horn","akin","bertuzzi","muse"], right: [], lines: [
          ["horn","Alex O'Connor has agreed to a public dialogue. The topic is animal suffering."],
          ["akin","Specifically, the fawn. It is trapped in a forest fire and burns for days. No one sees it. No one learns anything from it."],
          ["bertuzzi","It's William Rowe's example. And Alex says it's the version of the problem of evil he finds strongest."],
        ] },
        { when: "After the first battle", place: "studio", left: ["horn","akin","bertuzzi","muse"], right: [], lines: [
          ["muse","Free will won't help us. The fawn didn't choose anything.","?"],
          ["horn","Neither will soul-making. No one's soul was shaped by a death that no one saw."],
          ["akin","Then we have a mystery, and six missions to solve it before the dialogue.","…"],
        ] },
        { when: "After the second battle", place: "forest", left: ["muse","bertuzzi","akin"], right: ["+pine"], lines: [
          ["muse","Every answer we've tried, he's heard before.","?"],
          ["bertuzzi","Maybe we're looking in the wrong place. We keep staring at one animal."],
          ["pine","May I? St. Thomas asked almost exactly this. Not about fawns. About lions."],
          ["pine","“If all evil were prevented, much good would be absent from the universe. A lion would cease to live if there were no slaying of animals.” Summa, first part, question 22."],
          ["bertuzzi","Next on the livestream: Joe Schmid. Majesty of Reason. He knows every version of this argument, including the ones nobody's thought of yet."],
          ["akin","Funny thing, though. Word is he's been taking theism seriously lately. Contingency arguments, mostly. They keep him up at night.","idea"],
          ["pine","Then maybe don't try to beat him on points. When a man's old certainties are already slipping… sometimes the kindest thing is to let them go."],
          ["muse","Noted. Let's see where his heart is."],
        ] },
        { when: "After the third battle", place: "forest", left: ["muse","bertuzzi","akin"], right: ["pine","+spitzer"], lines: [
          ["akin","So a world with lions in it is a world where things die. The good of the whole can require a loss in a part.","idea"],
          ["spitzer","And the laws of nature that let a forest grow are the same laws that let it burn. A world steady enough to live in has to be a world where fire behaves like fire."],
          ["muse","That answers “why fire.” It doesn't yet answer “why that fawn.”","!"],
          ["pine","No. For that we need someone who thinks about all creation groaning."],
        ] },
        { when: "The dialogue", place: "studio", left: ["akin","muse","hicks"], right: ["oconnor","+hahn"], lines: [
          ["oconnor","I'll grant that a world with stable laws has costs. But God could surely have made a world without predators. Why this one?"],
          ["hahn","Because the story isn't over! Paul says creation itself will be set free from its bondage to decay. Romans 8, verse 21. The fawn is inside that promise, not outside it."],
          ["hicks","And we don't have to see the purpose ourselves to trust the One who does. That isn't a dodge. It's what it means to be a creature."],
          ["oconnor","That isn't a proof, though.","?"],
          ["akin","No. But it means the fawn counts against God far less than it seemed to. That's all we were ever claiming."],
          ["oconnor","Hm. I'll have to think about that. I genuinely will.","…"],
          ["","Nobody converts today. But a very polite Englishman leaves with a question he didn't come in with."],
        ] },
      ],
    },
    {
      id: "evangelicals", title: "Are You a Good Person?", group: "Evangelicals", boss: "ryan", place: "square", mystery: "If you died tonight, would you go to heaven? How do you answer without claiming to earn it, or pretending to a certainty no one has?",
      scenes: [
        { when: "Before the first battle", place: "square", left: ["holdsworth","horn","fradd"], right: ["ryan"], lines: [
          ["ryan","Quick question. Do you think you're a good person?"],
          ["horn","Compared with God? No."],
          ["ryan","Great answer! So if you died tonight, would you go to heaven?"],
        ] },
        { when: "After the first battle", place: "square", left: ["holdsworth","horn","fradd"], right: ["ryan"], lines: [
          ["holdsworth","I hope so.","…"],
          ["ryan","Hope so? I know so. It's by faith alone, not by works. You can know for certain."],
          ["fradd","How do we answer that without sounding like we're trying to earn our way in?","?"],
        ] },
        { when: "After the second battle", place: "pub", left: ["fradd","bertuzzi","heschmeyer"], right: ["+hahn"], lines: [
          ["bertuzzi","He quotes Ephesians 2:8. We quote James 2:24. We're just trading verses.","?"],
          ["hahn","Can I tell you what finally made it click for me? I was a Presbyterian minister, remember."],
          ["hahn","Stop picturing a courtroom. Picture a family. A covenant makes you a son. Sons don't earn their place at the table. But a son can walk out."],
        ] },
        { when: "After the third battle", place: "pub", left: ["fradd","bertuzzi","heschmeyer"], right: ["hahn"], lines: [
          ["heschmeyer","So grace is pure gift, and it can still be lost. Paul warns Christians about exactly that: “provided you continue in his kindness; otherwise you too will be cut off.” Romans 11:22.","idea"],
          ["fradd","Then what do we say when he asks, “If you died tonight”?"],
          ["hahn","“I trust my Father completely, and myself not at all.” That's not doubt. That's hope."],
        ] },
        { when: "The last conversation", place: "square", left: ["schmitz","heschmeyer","+horn"], right: ["ryan"], lines: [
          ["ryan","But if you can lose it, how can you ever have peace?"],
          ["schmitz","The way a child has peace in his father's arms. Not because he couldn't fall, but because he's being held."],
          ["heschmeyer","The Council of Trent said it plainly: without a special revelation, no one can know with absolute certainty that he'll persevere. But everyone can hope in God with complete confidence."],
          ["ryan","That's more biblical than I expected.","!"],
          ["horn","Can I ask you one more? Where does the Bible tell a married couple which acts are off-limits in their own marriage? Chapter and verse."],
          ["ryan","It doesn't spell that out, no.","…"],
          ["horn","So on some of the most personal moral questions there are, the Bible alone leaves a Christian guessing. Wonderful. It's almost as if Christ left us a Church to spell it out."],
          ["","Ryan offers the team a gospel tract. The team offers him a Catechism. Both are accepted."],
        ] },
      ],
    },
    {
      id: "lds", title: "The Restoration", group: "Latter-day Saints", boss: "hansen", place: "doorstep", mystery: "If the Church fell away after the apostles died, when did it happen, and why didn't anyone notice?",
      scenes: [
        { when: "Before the first battle", place: "doorstep", left: ["akin","heschmeyer","horn"], right: ["elder"], lines: [
          ["elder","We'd love to share a message with you. After a great apostasy, the fullness of the gospel was restored in 1830."],
          ["akin","When exactly did the apostasy happen?","?"],
          ["elder","After the apostles died."],
        ] },
        { when: "After the first battle", place: "doorstep", left: ["akin","heschmeyer","horn"], right: ["elder"], lines: [
          ["heschmeyer","That's a claim we can test. If the Church fell away after the apostles, the next generation should look very different.","idea"],
          ["horn","Then we need the earliest Christians we can find."],
        ] },
        { when: "After the second battle", place: "library", left: ["heschmeyer","muse","akin"], right: [], lines: [
          ["heschmeyer","Ignatius of Antioch, around the year 107, only a few years after the last apostle died. On his way to his martyrdom, he writes seven letters."],
          ["heschmeyer","He writes about bishops, priests and deacons. He calls the Eucharist “the flesh of our Savior Jesus Christ.” He's the first to write “the Catholic Church.”"],
        ] },
        { when: "After the third battle", place: "library", left: ["heschmeyer","muse","akin"], right: ["+hansen"], lines: [
          ["muse","So if there was an apostasy, it happened so quickly that no one noticed?","!"],
          ["hansen","Or the corruption crept in very early. Early doesn't mean true."],
          ["akin","That's fair. Then we need more than a date. We need a promise.","…"],
        ] },
        { when: "The last conversation", place: "doorstep", left: ["hicks","akin","heschmeyer"], right: ["hansen","+hahn"], lines: [
          ["hansen","Israel fell away again and again. Why couldn't Christ's Church?"],
          ["hahn","Israel fell, but God never revoked the covenant. And Jesus made his Church a promise he never made to any king of Israel: “the gates of Hades shall not prevail against it.” Matthew 16:18."],
          ["hicks","And he said, “I am with you always, to the close of the age.” Not until the apostles died. To the close of the age."],
          ["hansen","You've given me a lot to take home. And you've been kind about it.","…"],
          ["","Two young men in white shirts are seen at the parish that Sunday. This time, they're the ones being welcomed."],
        ] },
      ],
    },
    {
      id: "islam", title: "People of the Book", group: "Islam", boss: "speaker", place: "corner", mystery: "If the Bible was corrupted, when? And why does the Qur'an tell Christians to judge by the Gospel?",
      scenes: [
        { when: "Before the first battle", place: "corner", left: ["horn","bertuzzi"], right: ["speaker"], lines: [
          ["speaker","Your Bible was corrupted. The Qur'an came to correct it."],
          ["horn","Which parts, and when?","?"],
        ] },
        { when: "After the first battle", place: "corner", left: ["horn","bertuzzi"], right: ["speaker","+godlogic"], lines: [
          ["speaker","Before the Prophet, peace be upon him."],
          ["godlogic","Then there's a problem with that. Mind if I join you?"],
        ] },
        { when: "After the second battle", place: "corner", left: ["godlogic","bertuzzi","muse"], right: [], lines: [
          ["godlogic","Qur'an 5:47. “Let the people of the Gospel judge by what God has revealed in it.” In the seventh century, the Qur'an tells Christians to judge by the Gospel they had."],
          ["bertuzzi","And we have Gospel manuscripts from centuries before that. They say what we read today."],
        ] },
        { when: "After the third battle", place: "corner", left: ["godlogic","bertuzzi","muse"], right: [], lines: [
          ["muse","So either the Gospel was reliable in the seventh century, and it teaches the Cross and the Trinity, or the Qur'an sent Christians to a corrupted book.","idea"],
          ["godlogic","That's the Islamic dilemma. Keep it smooth, though. We're not here to win. We're here so he can see Jesus."],
        ] },
        { when: "The last conversation", place: "corner", left: ["pine","marygrace","godlogic"], right: ["speaker"], lines: [
          ["speaker","But God is one. How can he have a Son?"],
          ["pine","We also say God is one, utterly one, with no parts at all. The Son isn't a second god. He is the Word God speaks, and God has never been without his Word."],
          ["marygrace","And that Word became flesh, so you could see how much God loves you."],
          ["speaker","I will read the Gospel, then. As the Qur'an says.","…"],
          ["","It is the start of a long conversation. The team makes sure he has their numbers."],
        ] },
      ],
    },
    {
      id: "reformed", title: "Scripture Alone?", group: "Reformed", boss: "white", place: "library", mystery: "How do you answer sola scriptura in a way James White hasn't heard a thousand times?",
      scenes: [
        { when: "Before the first battle", place: "library", left: ["horn","bertuzzi","akin"], right: ["white"], lines: [
          ["white","Sola scriptura. Scripture is the only infallible rule of faith for the Church. Show me where Scripture teaches otherwise."],
          ["horn","Then who decided which books are Scripture?"],
          ["white","I've answered that a thousand times. The canon is an artifact of revelation. God determined it. The Church recognized it."],
        ] },
        { when: "After the first battle", place: "library", left: ["horn","bertuzzi","akin"], right: ["white"], lines: [
          ["bertuzzi","He's right, he has. He has an answer ready for every canon argument we know.","…"],
          ["akin","Then we need an argument he won't expect.","?"],
        ] },
        { when: "After the second battle", place: "studio", left: ["muse","heschmeyer","akin"], right: ["+hahn"], lines: [
          ["muse","Every angle we try, he's heard. The canon, Tradition, the Bereans.","?"],
          ["hahn","Don't start with the list of books. Start in the Upper Room. “Do this in memory of me.”"],
          ["hahn","For some twenty years the Church lived the New Covenant, celebrated it and preached it, before a word of the New Testament was written. What was their rule of faith then?"],
        ] },
        { when: "After the third battle", place: "studio", left: ["muse","heschmeyer","akin"], right: ["hahn"], lines: [
          ["heschmeyer","His answer will be that sola scriptura applies only once the apostles were gone. So ask him for the verse that says the rule changes when the last apostle dies.","idea"],
          ["akin","Because if that change isn't in Scripture, then sola scriptura rests on something outside Scripture."],
        ] },
        { when: "The last conversation", place: "library", left: ["heschmeyer","akin","schmitz"], right: ["white"], lines: [
          ["white","The apostles taught by word of mouth while they lived. Once their teaching was written down, Scripture alone became the infallible rule."],
          ["heschmeyer","Where does Scripture say that? Paul says to hold fast to the traditions you were taught, “either by word of mouth or by letter.” Second Thessalonians 2:15. Both. He never says the first one expires."],
          ["white","The oral teaching had the same content as the written."],
          ["akin","Maybe so. But that's a claim about history, not a claim Scripture makes. You'd need Tradition to show it."],
          ["white","I'll be taking this apart on The Dividing Line on Tuesday.","…"],
          ["schmitz","We'll be praying for you. And we'll be watching."],
          ["","It is the hardest conversation of the campaign. No one converts today. But something in him wavers, just once."],
        ] },
      ],
    },
    {
      id: "epilogue", title: "One Fold", group: "Epilogue", place: "church",
      scenes: [
        { when: "The Easter Vigil", place: "church", left: ["schmitz","horn","akin"], right: ["oconnor","ryan","+white"], lines: [
          ["schmitz","Friends, welcome home."],
          ["oconnor","I'm still thinking about the fawn. But I'm thinking about it here.","…"],
          ["ryan","I brought tracts. Force of habit."],
          ["white","Just visiting.","…"],
          ["","“There shall be one fold, and one shepherd.” John 10:16."],
        ] },
      ],
    },
  ];

  // ---- Places -----------------------------------------------------------------------

  const PLACES = {
    studio(ctx) {
      ctx.fillStyle = "#11142c"; ctx.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 40) { ctx.fillStyle = x % 80 ? "#151936" : "#12162f"; ctx.fillRect(x, 0, 40, 200); }
      ctx.fillStyle = "#3a1f2a"; ctx.fillRect(250, 40, 140, 80); ctx.fillStyle = "#de5e55"; ctx.fillRect(256, 46, 128, 68);
      ctx.fillStyle = "#fdfaf2"; ctx.font = "700 20px " + FONT; ctx.textAlign = "center"; ctx.fillText("ON AIR", 320, 88);
      floor(ctx, "#1a1f3c", "#171b36");
    },
    forest(ctx, t) {
      ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = "#cfd8ff"; ctx.fillRect((i * 97) % W, (i * 41) % 120, 2, 2); }
      ctx.fillStyle = "#fff6d8"; ctx.beginPath(); ctx.arc(520, 60, 22, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 14; i++) {
        const x = i * 50 - 10; const h = 150 + (i % 3) * 30;
        ctx.fillStyle = i % 2 ? "#12301f" : "#0f2819";
        ctx.beginPath(); ctx.moveTo(x, 240); ctx.lineTo(x + 30, 240 - h); ctx.lineTo(x + 60, 240); ctx.fill();
      }
      // A little fawn, asleep under the trees.
      ctx.fillStyle = "#a8683a"; ctx.fillRect(300, 226, 26, 12); ctx.fillRect(322, 218, 10, 10); ctx.fillStyle = "#fdfaf2"; ctx.fillRect(304, 228, 2, 2); ctx.fillRect(312, 230, 2, 2);
      floor(ctx, "#15261a", "#12211a");
    },
    square(ctx) {
      ctx.fillStyle = "#1a1830"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = "#2a2848"; ctx.fillRect(i * 96, 60 + (i % 2) * 30, 80, 180); for (let w = 0; w < 6; w++) { ctx.fillStyle = (i + w) % 3 ? "#ffd88a" : "#3a3860"; ctx.fillRect(i * 96 + 12 + (w % 2) * 30, 80 + (i % 2) * 30 + Math.floor(w / 2) * 40, 16, 20); } }
      ctx.fillStyle = "#e8d8a8"; ctx.fillRect(60, 120, 6, 120); ctx.fillStyle = "#ffe7a0"; ctx.fillRect(52, 110, 22, 12);
      floor(ctx, "#2a2a3a", "#25253a");
    },
    pub(ctx) {
      ctx.fillStyle = "#2a1810"; ctx.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 64) { ctx.fillStyle = "#3a2216"; ctx.fillRect(x, 0, 30, 220); }
      ctx.fillStyle = "#1f4a2e"; ctx.fillRect(230, 30, 180, 50); ctx.fillStyle = "#e8b94a"; ctx.font = "700 16px " + FONT; ctx.textAlign = "center"; ctx.fillText("PINTS WITH AQUINAS", 320, 62);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = ["#7a1f2b", "#1f3b6b", "#2f5a3a", "#8a5a1b"][i % 4]; ctx.fillRect(40 + i * 72, 110, 14, 40); }
      floor(ctx, "#3a2418", "#342014");
    },
    library(ctx) {
      ctx.fillStyle = "#1e1812"; ctx.fillRect(0, 0, W, H);
      for (let r = 0; r < 4; r++) { ctx.fillStyle = "#4a3222"; ctx.fillRect(0, 30 + r * 50, W, 6); for (let b = 0; b < 40; b++) { ctx.fillStyle = ["#7a1f2b", "#1f3b6b", "#2f5a3a", "#8a5a1b", "#5a3a6b", "#c9b27a"][(b * 7 + r) % 6]; ctx.fillRect(b * 16 + 2, r * 50 - 4, 12, 34); } }
      floor(ctx, "#2a2018", "#241c14");
    },
    doorstep(ctx) {
      ctx.fillStyle = "#8fb8d8"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e9e1cf"; ctx.fillRect(0, 40, W, 200);
      ctx.fillStyle = "#6a3a2a"; ctx.fillRect(280, 90, 80, 150); ctx.fillStyle = "#e8b94a"; ctx.fillRect(344, 164, 6, 6);
      for (const x of [100, 470]) { ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 2, 88, 74, 64); ctx.fillStyle = "#bfe0f0"; ctx.fillRect(x, 90, 70, 60); ctx.fillStyle = "#1a1326"; ctx.fillRect(x + 34, 90, 2, 60); }
      floor(ctx, "#8a8a7a", "#7a7a6a");
    },
    corner(ctx) {
      ctx.fillStyle = "#9cc0d8"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = "#3a6a3a"; ctx.beginPath(); ctx.arc(i * 90 + 30, 150, 50, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#5a3a22"; ctx.fillRect(i * 90 + 26, 170, 8, 70); }
      ctx.fillStyle = "#6a4a2a"; ctx.fillRect(300, 200, 40, 30); ctx.fillStyle = "#fdfaf2"; ctx.font = "700 12px " + FONT; ctx.textAlign = "center"; ctx.fillText("SPEAKERS' CORNER", 320, 190);
      floor(ctx, "#5a8a4a", "#4f7a42");
    },
    church(ctx, t) {
      ctx.fillStyle = "#0e0c16"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 3; i++) { const x = 140 + i * 180; ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 32, 30, 64, 150); const cs = ["#c33a3a", "#2f5ad8", "#e8b94a", "#2f8a4a"]; for (let j = 0; j < 12; j++) { ctx.fillStyle = cs[(i + j) % 4]; ctx.fillRect(x - 28 + (j % 3) * 19, 36 + Math.floor(j / 3) * 34, 17, 32); } }
      for (let i = 0; i < 16; i++) { const x = 20 + i * 40; ctx.fillStyle = "#f3ead2"; ctx.fillRect(x, 200, 6, 20); ctx.fillStyle = Math.sin(t * 8 + i) > 0 ? "#ffcf5a" : "#ffe07a"; ctx.fillRect(x + 1, 192, 4, 8); }
      floor(ctx, "#2a2230", "#241e2a");
    },
  };

  function floor(ctx, a, b) {
    ctx.fillStyle = a; ctx.fillRect(0, 240, W, H - 240);
    for (let y = 240; y < H; y += 16) for (let x = (y / 16) % 2 ? 0 : 20; x < W; x += 40) { ctx.fillStyle = b; ctx.fillRect(x, y, 20, 16); }
  }

  // ---- The player --------------------------------------------------------------------

  function wrap(ctx, text, width) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > width && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function create(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let chapter = CHAPTERS[1];
    let scene = 0;
    let line = 0;
    let lineStart = 0;
    let page = 0;             // a long line runs onto more than one page
    let pages = 1;
    let pageLength = 0;
    let now = 0;
    let listeners = [];

    function current() { return chapter.scenes[scene]; }

    // Who is on stage by the current line: walk-ons appear when they first speak.
    function onStage(sc) {
      const said = new Set(sc.lines.slice(0, line + 1).map((l) => l[0]));
      const place = (list, side) => list.map((raw, i) => {
        const id = raw.replace(/^\+/, "");
        const walkOn = raw.startsWith("+");
        return { id, side, i, n: list.length, walkOn, here: !walkOn || said.has(id) };
      });
      return place(sc.left, "left").concat(place(sc.right, "right"));
    }

    function frame(t) {
      now = t;
      const sc = current();
      const [speaker, text, mark] = sc.lines[line];
      PLACES[sc.place](ctx, t);
      // The cast: heroes on the left facing right, others on the right facing left.
      const cast = onStage(sc).filter((c) => c.here);
      for (const c of cast) {
        const slot = c.side === "left" ? 70 + c.i * 92 : W - 70 - c.i * 92;
        let x = slot;
        if (c.walkOn && !(c.id in entered)) entered[c.id] = t;
        const sinceIn = c.walkOn ? t - entered[c.id] : 99;
        if (c.walkOn) {
          const k = Math.min(1, (t - entered[c.id]) / 0.7);
          x = c.side === "left" ? -60 + (slot + 60) * k : W + 60 - (W + 60 - slot) * k;
        }
        const talking = c.id === speaker;
        const walking = c.walkOn && sinceIn < 0.7;
        const pose = walking ? (Math.floor(t * 8) % 2 ? "walkA" : "walkB") : talking && mark === "idea" ? "raise" : "stand";
        const bob = talking && !walking ? Math.round(Math.abs(Math.sin(t * 6)) * 2) : 0;
        const g = Art.figure(Art.CAST[c.id], pose);
        // Everyone is drawn solid; the one speaking bobs, and a small gold
        // arrow over the head marks them.
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x - 30, 246, 60, 6);
        Art.paint(ctx, g, Math.round(x - 40), 250 - 104 - bob, 2, c.side === "right");
        if (talking && !walking) {
          const ay = 250 - 104 - 14 - bob + Math.round(Math.sin(t * 5) * 2);
          ctx.fillStyle = "#1a1326"; ctx.beginPath(); ctx.moveTo(x - 8, ay - 2); ctx.lineTo(x + 8, ay - 2); ctx.lineTo(x, ay + 8); ctx.fill();
          ctx.fillStyle = "#e8b94a"; ctx.beginPath(); ctx.moveTo(x - 6, ay - 1); ctx.lineTo(x + 6, ay - 1); ctx.lineTo(x, ay + 6); ctx.fill();
        }
        if (talking && mark) drawMark(mark, x, 250 - 104 - 16, t);
      }
      drawBox(speaker, text, t);
      // The chapter and scene, top left.
      ctx.fillStyle = "rgba(20,23,42,0.85)"; ctx.fillRect(10, 10, 300, 26);
      ctx.font = "600 12px " + FONT; ctx.textAlign = "left"; ctx.fillStyle = "#e8b94a";
      ctx.fillText(chapter.title.toUpperCase() + " · " + sc.when.toUpperCase(), 18, 28);
    }
    const entered = {};

    function drawMark(mark, x, y, t) {
      const b = Math.sin(t * 6) * 2;
      ctx.font = "700 24px " + FONT; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#1a1326";
      if (mark === "idea") {
        ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 9, y - 26 + b, 18, 24);
        ctx.fillStyle = "#ffe07a"; ctx.fillRect(x - 7, y - 24 + b, 14, 14); ctx.fillStyle = "#cfd6dc"; ctx.fillRect(x - 5, y - 10 + b, 10, 6);
        for (const [dx, dy] of [[-16, -18], [16, -18], [0, -34]]) { ctx.fillStyle = "#ffe07a"; ctx.fillRect(x + dx - 2, y + dy + b, 4, 4); }
        return;
      }
      const glyph = mark === "…" ? "…" : mark;
      const color = mark === "!" ? "#de5e55" : mark === "?" ? "#c69ae8" : "#ece4d0";
      ctx.strokeText(glyph, x, y + b); ctx.fillStyle = color; ctx.fillText(glyph, x, y + b);
    }

    function drawBox(speaker, text, t) {
      const x = 10; const y = 262; const w = W - 20; const h = 90;
      ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = "#fdfaf2"; ctx.fillRect(x, y, w, h);
      let tx = x + 14;
      if (speaker) {
        ctx.fillStyle = "#e9e2d0"; ctx.fillRect(x + 8, y + 8, 72, 74);
        Art.paint(ctx, Art.bust(Art.CAST[speaker]), x + 12, y + 14, 2);
        tx = x + 94;
        ctx.font = "700 14px " + FONT; ctx.textAlign = "left"; ctx.fillStyle = "#7a1f2b";
        ctx.fillText(NAMES[speaker] || speaker, tx, y + 22);
      }
      ctx.font = (speaker ? "500 " : "italic 500 ") + "15px " + FONT;
      ctx.fillStyle = "#1a1326"; ctx.textAlign = "left";
      // Three rows to a page; the typewriter runs through the current page.
      const rows = wrap(ctx, text, w - (tx - x) - 20);
      pages = Math.ceil(rows.length / 3);
      const shownRows = rows.slice(page * 3, page * 3 + 3);
      pageLength = shownRows.join(" ").length;
      let left = Math.floor((t - lineStart) * 60);
      shownRows.forEach((r, i) => {
        ctx.fillText(r.slice(0, Math.max(0, left)), tx, y + (speaker ? 44 : 30) + i * 19);
        left -= r.length + 1;
      });
      if (left >= 0 && Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = "#7a1f2b";
        if (page < pages - 1) { ctx.fillRect(x + w - 24, y + h - 20, 12, 4); ctx.fillRect(x + w - 20, y + h - 16, 4, 4); }
        else ctx.fillRect(x + w - 22, y + h - 18, 10, 10);
      }
    }

    // Tap: finish the line, or go on to the next one (and the next scene).
    function next() {
      const sc = current();
      if ((now - lineStart) * 60 < pageLength) { lineStart = now - pageLength / 60 - 0.1; return; }
      if (page < pages - 1) { page++; lineStart = now; return; }
      page = 0;
      if (line < sc.lines.length - 1) { line++; lineStart = now; }
      else if (single) { listeners.forEach((fn) => fn("scene-end")); return; }
      else if (scene < chapter.scenes.length - 1) { scene++; line = 0; lineStart = now; for (const k in entered) delete entered[k]; }
      else { listeners.forEach((fn) => fn(chapter)); return; }
      listeners.forEach((fn) => fn(null));
    }

    // With `only`, play just this one scene, then report "scene-end".
    let single = false;
    function open(id, sceneIndex, only) {
      single = !!only;
      chapter = CHAPTERS.find((c) => c.id === id) || CHAPTERS[0];
      scene = sceneIndex || 0; line = 0; page = 0; lineStart = now;
      for (const k in entered) delete entered[k];
    }

    return {
      frame, next, open,
      get chapter() { return chapter; },
      get scene() { return scene; },
      get line() { return line; },
      // The line being spoken now, as [name, text], for showing outside the canvas.
      get spoken() { const [who, text] = chapter.scenes[scene].lines[line]; return [NAMES[who] || "", text]; },
      onChange(fn) { listeners.push(fn); },
    };
  }

  return { create, CHAPTERS, NAMES };
})();
