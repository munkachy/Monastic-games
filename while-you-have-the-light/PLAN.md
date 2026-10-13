# Master plan (in order; token estimates are rough)

1. Clear-out, movement, code split and map (~130,000)
   - remove unused code (script-found, small checked batches), incl. maps.js
   - step up low ledges; faster crawling
   - take a block back out of a cart; first great demon only after the first idol and gate
   - tips: pause to read, on/off switch, each shown once
   - look around: hold a direction to see about one screen that way (~5,000)
   - split climb.js (5,400 lines) into ~5 files along its seams; write CODEMAP.md (each file, its main functions, line numbers); smoke test and screenshots
2. Monastery, peaceful (~55,000): drop raids and towers; free building anywhere; relics halved, each monk adds back time, capped at today's length
3. Hearts, herbs and the necrology (~95,000): 3 hearts, torch dims per hit; shrine candle heals 1, lay brother heals all. Herbs replace merit: gathered in every mountain (one or two plant shapes, recoloured per kind); mortar and pestle grinds TWO herbs into a potion, every pair makes something; drink a potion or give it as alms (it is the currency); carried herbs and potions lost on death unless banked with the lay brother. Necrology on death: 'Brother N., swallowed by a toad on the third ledge of Gluttony. Pray for him.'
4. Piece system + Gluttony's first climb (~145,000): stacking by standard openings, rules for rhythm (shafts and pit gaps may stack 3), per-mountain settings, demon counting, check-and-repair, random chunks; the mouth; zigzag shaft, pit gap (2-3 versions), corridor, elbow, low crawl, shrine room; wall dressing; trace the Gluttony backdrop pieces (art already filed); white-room piece picker
5. Monk restyle (~50,000): before the new poses in later chunks (holding, throwing, held, carrying, swimming, cuculla) so each is made once; the skeleton is built from this frame
6. Carrying and the small creatures (~70,000; needs art): build the shared rules first (stun, pick up, throw; held in place); clay jars to break; cobwebs that slow, spiders; little frogs (hop, leap at you for damage, can be caught and thrown like fireballs); the small red horned demon that bursts from the ground and runs at you
7. Bones, traps and walls (~70,000; needs art): skeletons rising, throwable skull (skeleton built as a jointed figure in code like the monk, using skeleton-1 as the style guide; ragdoll: punched, its joints go loose and it flops against walls; on death each bone flies off and clatters into a pile, the skull rolls free to pick up); hidden spike and dart traps set off by thrown things (drawn in code); cracked walls dug with a pick to secret side rooms (pick and rubble traced; cracked bricks drawn in code); the evil bramble that shoots thorns
8. More Gluttony (~110,000): ledge stack, chimney, drop room, gauntlet, rest room; stomach; ice-cream cone demon (and others as art comes); rare giant frog (burps little frogs, max 3 out; tongue with a set reach and a warning; swallows you whole, costs a heart, punch out; hurt only by thrown little frogs)
9. Avarice (~200,000; two sessions): trace the Avarice mine props and coin imp (art already filed); shared layouts dressed as the mine; Coin Flood, Miser's Bed, Chain Bridge, Vault; treasure-chest boulder trap (move the chest, the screen shakes, a boulder breaks through walls, leap aside)
10. Great Scales and the stolen torch (~80,000)
11. The Maw (~70,000)
12. Relics and blows (~75,000): Easy Yoke, crowned blows, new relics; St Ulphia's relic (little frogs fall silent and stop leaping at you)
13. Companions and the hermit (~190,000; two sessions; needs art):
    - saint companions from relics (soft light, float after him; St Benedict only accompanies)
    - the Dominican dog: carries a second torch for more light; sent at a demon, comes back
    - rescue a lost pilgrim to the lay brother for an extra heart
    - possessed people (glowing eyes); a saint companion frees one and returns to heaven; some run up walls and leap about on the ceiling, gravity reversed; or knock one out and carry him home
    - carrying a person: picking one up drops the torch where it is (its light stays there); carry with one hand, hook with the other, in the blessing's faint light; a shrine candle gives the torch back
    - or bring a companion home for monastery perks
    - the hermit's hidden cell: alms (potions) for the poor, a blessing chosen from 2-3; he asks for things (two skulls and a pot, three herbs) or for a person (an arrow points to a possessed man to bring back)
14. Monastery alive (~110,000): freed folk with roles; farm; shortcuts from higher up each mountain back to the monastery, to bank what you carry
15. Monastery deeper (~210,000): library for other psalms; building for fun
Later: tower defense with the choir; side branches to hidden rooms (path-first method).
Rule: many creatures can be stunned, picked up and thrown (little frogs, the red demon, the skull, a knocked-out possessed person).
Rule for every grab (frog, demon, octopus): while held or swallowed he cannot move left or right, only punch free.
Later: water. Wading or swimming puts out the torch; he goes dark but the blessing still gives a faint light, and with hearts the dark no longer kills. Relight at shrine candles. Short underwater tunnel pieces; swimming poses for the jointed monk in code; sea creatures (an octopus that wraps around him, others) need art.
Later: the cuculla, the flowing choir garment worn over the habit (drawn in code), as an item: hold the button while falling to glide down slowly.
Later: Wrath. Magma held over doors that open a second after you take the treasure beneath, then pours out; fire spouting from a pot, knocked over to aim it sideways at demons; boss: a demon with huge fists that leaps, hovers over him and slams down, invincible, but each slam breaks the floor until he smashes through into the lava below.
Later: a demon that turns into a floating spirit to follow him through walls.
Dropped: piranha; keys and locked chests; the Rapture-cloud flight; feast table; counting house; winch lifts; treasure room; melting furnace. On hold: cellar, honey-well.
