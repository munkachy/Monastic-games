"use strict";
// While You Have the Light: the brothers. Each life is one of the monastery's brothers: the one who
// climbs is the first of them, and when he dies on a mountain his name is told and written in the
// necrology (the book of the dead, kept in the library: "Brother Maurus, struck down by a demon of
// Wrath, 340 m up its mountain. Pray for him."). Three are there from the start; more are received
// at the gate, a stone each, from among those freed from the idols who come down. When none are
// left, the game is over, and all of it begins again: all but the necrology.

const NAMES = ["Anselm", "Bede", "Maurus", "Placid", "Odo", "Wulfstan", "Dunstan", "Aelred", "Benet", "Columba", "Aidan", "Cuthbert", "Boniface",
  "Willibrord", "Gall", "Columban", "Wilfrid", "Chad", "Cedd", "Oswald", "Bruno", "Romuald", "Odilo", "Hugh", "Majolus", "Berno", "Peter", "Bernard",
  "Stephen", "Robert", "Alberic", "Guerric", "Isaac", "William", "Gilbert", "Adam", "Walter", "Ralph", "Lanfranc", "Ivo", "Herluin", "Gregory",
  "Leo", "Paulinus", "Laurence", "Mellitus", "Justus", "Augustine", "Theodore", "Hadrian", "Benedict", "Ceolfrith", "Eosterwine", "Sigfrid",
  "Alcuin", "Rabanus", "Walafrid", "Notker", "Ekkehard", "Tutilo", "Ratpert", "Hermann", "Wolfgang", "Ulrich", "Meinrad", "Fintan", "Pirmin",
  "Sturm", "Lull", "Wigbert", "Burchard", "Willibald", "Wynnebald", "Ansgar", "Rimbert", "Adalbert", "Maurice", "Martin", "Germanus", "Honoratus",
  "Caesarius", "Cassian", "Fructuosus", "Leander", "Isidore", "Ildephonsus", "Eugene", "Eligius", "Philibert", "Wandrille", "Ouen", "Bavo",
  "Amand", "Remaclus", "Trudo", "Lambert", "Hubert", "Gerard", "Poppo", "Richard", "Thierry"];

// The monastery's people (kept with it): the three there from the start made brothers, with names.
function brotherData() {
  const D = House.data(); D.people = D.people || []; D.nextId = D.nextId || 1;
  if (!D.folk0) {
    D.folk0 = true;
    for (let i = 0; i < 3; i++) D.people.push({ id: D.nextId++, dom: ["gluttony", "lust", "avarice"][i], kind: i, role: "brother", name: newName(D) });
    store();
  }
  // (A monastery from before brothers were lives: three brothers at least, the first of those
  // waiting by the fire received for nothing.)
  if (!D.brothers3) {
    D.brothers3 = true;
    for (const p of D.people) if (D.people.filter((q) => q.role === "brother").length < 3 && p.role === "camp") p.role = "brother";
    while (D.people.filter((q) => q.role === "brother").length < 3) D.people.push({ id: D.nextId++, dom: "gluttony", kind: D.people.length % 4, role: "brother" });
    store();
  }
  for (const p of D.people) if (p.role === "brother" && !p.name) { p.name = newName(D); store(); }
  return D;
}
// A name not borne by anyone at the monastery now, nor by anyone in this game's necrology.
function newName(D) {
  const used = new Set((D.people || []).map((p) => p.name).concat((save.necrology || []).filter((e) => e.game === gameNo()).map((e) => e.name)));
  const free = NAMES.filter((n) => !used.has(n)), pool = free.length ? free : NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}
const gameNo = () => save.game || 1;
const climberName = () => { const b = brotherData().people.find((p) => p.role === "brother"); return b ? b.name : "Benedict"; };
// He has died: the climber written in the necrology (newest first) and taken from the brothers.
// The last of them: the game is over, and everything begins again but the necrology.
function brotherFell(cause, where) {
  const D = brotherData(), i = D.people.findIndex((p) => p.role === "brother"), name = i >= 0 ? D.people[i].name : climberName();
  if (i >= 0) D.people.splice(i, 1);
  const line = "Brother " + name + ", " + cause + ", " + where + ". Pray for him.";
  save.necrology = [{ name, line, game: gameNo(), at: new Date().toISOString().slice(0, 10) }].concat(save.necrology || []).slice(0, 500);
  const left = D.people.filter((p) => p.role === "brother").length;
  if (!left) gameOver();
  store();
  return { name, line, left };
}
function gameOver() {
  for (const k of ["house", "bricks", "climbs", "lib", "recipes", "herbal", "mortar", "pilgrims", "novitiate"]) delete save[k];
  save.game = gameNo() + 1;
  try { localStorage.removeItem("wyhtl-mountains"); } catch (e) { }
  if (typeof Kept !== "undefined") Kept.wrote("wyhtl-mountains");
}
