# Code map

How the game's code is laid out: what each file is for, then an index of every file's sections
and main functions with line numbers. **The index is generated**: after changing code, run
`node tools/codemap.js` to bring it up to date (the text above the index is kept as it is).

## How it fits together

- Plain scripts, no build step. `index.html` loads them in order; they all share one global scope,
  so a top-level name in one file can be used in any file loaded after it (and in any function,
  whenever it runs, once everything has loaded).
- `mode` (core.js) is the screen now showing: an object with `step(dt)`, `draw()`, `key()` and
  sometimes `down/move/up` for touch. The loop in game.js calls them each frame. The screens are
  `Title`, `Novitiate`, `Home`, `Over` (game.js), `Climb` and `ClimbPause` (climb.js), `House`
  (house.js).
- **The climb is seven files** sharing one set of names (`S`, the climb's state; `secs`, the
  mountain's sections; `NOV`, the mountain being climbed, or null on the endless climb; `seed`).
  They load in order: climb-world, climb-run, climb-foes, climb-fight, climb-frame, climb-draw,
  climb. Only `climb.js` ends by making `Climb` (`const Climb = M`); the rest only define things.
  Because they load one after another, code that runs *while loading* (a `const` set from a
  function call) can only use what earlier files define; code inside functions can use anything.
- Run `node tools/lint.js` after changes: it finds names used but defined nowhere, and names
  defined but never used. `node tools/smoke2.js` visits every screen and reports errors;
  `node tools/replay.js URL` plays a fixed run and prints fingerprints of the climb's state, to
  prove a change left play exactly as it was (compare two versions' output).

## The files

| File | What it is |
|---|---|
| audio.js | `Sound`: the synth engine (organ, voices, harpsichord), the mixing desk, and every sound effect (`Sound.fx`). |
| music.js | `SONGS`: the scores, built on the Compline hymn *Christe, qui lux es et dies*. |
| core.js | The canvas and its size, drawing helpers (`text`, `rect`, `button`, `glow`...), maths helpers, the save (`save`, `store`), `Kept` (saving on claude.ai), sound settings, touch and keys passed to `mode`. |
| art.js | Everything drawn in code: the jointed monk (`pose`, `MONK_ANIM`, `drawMonk`), the sins and their demons (`SINS`, `drawDemon`), the flame, the backdrop. Also used by art.html (the pose viewer). |
| shapes.js | `TRACED`: outlines traced from the drawings in art-src/ (worshippers, lay brother and cart, ...). |
| rooms.js | The rooms a mountain is made of (chunk 4): hand-drawn text grids (`ROOMS`), `makeRoom` (the maybe-rock decided), and `Pieces`, the piece picker (?pieces). |
| climb-world.js | The climb's constants, the domains, the mountain made by rules (shafts, crossings, Lust's briars, Gluttony's caverns, Avarice's needle's eye, the low ways), his body against the rock, ledges. |
| climb-run.js | Starting and the end, his place on a mountain kept, white-room scenes, the relics' boons, the hook, Avarice's chains, the rope round the rock, the flare. |
| climb-foes.js | The demons and what they throw, the shrines, the blocks and the lay brothers' carts, the great demons, a great demon's dread, the angel. |
| climb-fight.js | The weight of a blow, Avarice's gold, Gluttony's swallow, slime and grease, Wrath's rock that gives way, his blows and the boulders in his hands. |
| climb-frame.js | Each frame: his moves, the physics, the rope, the world going on (`step`). |
| climb-draw.js | Drawing the climb (`draw`) and each domain's look. |
| climb.js | The record for notes to Claude, touch/mouse/keys, the `Climb` object, `ClimbPause`. |
| notes.js | Notes for Claude from the pause screen (on claude.ai only); the version number. |
| room.js | The white room: describe a scene, Claude builds it (claude.ai only). |
| psalm.js | Psalm 118 (Douay-Rheims), all 176 verses. |
| verses.js | The verses on the rock: the default ones, or the player's own translation. |
| lib/planck.min.js | The planck.js physics library (the monastery's stones). |
| brothers.js | The brothers as lives: their names, the necrology (`brotherFell`), and the game over (`gameOver`), which resets everything but the necrology. |
| house.js | `House`: the monastery at the foot of the mountains (building with the stones brought down). |
| game.js | `Game` (starting each kind of play), the title, the seven mountains' menu, the end screen, the frame loop. |

Pages besides the game: `art.html` (the pose viewer), `design.html` (design notes). `tools/` has
the build and test scripts (see tools/README.md).

<!-- index: made by tools/codemap.js -->

### audio.js (1341 lines)

- (top): A 17, mtof 18, dv 19
- **The desk** (24): softClip 25, impulse 30, watch 63, build 81, pump 162
- **Building blocks** (168): osc 172, gainAt 173, noise 174, filt 175, route 178, env 190, STOPS 197, wave 208
- **The instruments** (217): I 218, PARTIALS 346, VOWELS 360
- **The conductor** (434): M 442, barLen 443, tick 459, schedule 469
- **The muffle, and the flare** (503): FL 506, openTo 508, setFilter 511, flareStart 531, flareEnd 536, held 546, heart 562
- **The wind** (571)
- **The sounds of the fight: short, restrained, made for a phone's small speaker** (597): fx 600, T0 601, ok 602, rnd 603, tone 605, hiss 618, breath 628, pebbles 635, crackle 639, SINV 740, sinv 749, cry 751, MARKS 916, LOUD 1320

### music.js (177 lines)

- (top): S 40, on 41, HYMN 44, DIA 52, pitch 53, CH 65, HARM 76, lower 79, FIG 82, OST 84
- **The fight: "Christe, qui lux es"** (86)
- **The title: the hymn alone** (154)

### core.js (324 lines)

- **The screen** (7)
- **Little helpers** (35)
- **The palette** (67)
- **Type** (78)
- **Light** (120)
- **Buttons** (163)
- **What is kept, kept twice** (186): K 192, T 194, push 195, pull 200
- **The save** (222)
- **Input** (236)

### art.js (1065 lines)

- **The figures** (8): POSE0 17, pose 18, blendPose 20, EASE 24, keyPose 25, loop 31, solve 40, figToWorld 57, reach 63
- **Flat shapes** (70): P2 73, PA 74, addPts 75, seg 83, gem 88, HL 90, HLs 91, clothWind 94
- **The monk** (102): MONK_BODY 107, torchTip 110, sleeve 113, footShape 125, monkGeo 131, drawMonk 175, monkJoint 215
- **The monk's moves** (220): STAND_O 222, S_ 223, WALK_H 236, RUN_H 237, climbRootUp 241, climbRootDown 248, gripEdge 255, groundRoll 261, MONK_ANIM 268, MONK_HIT 412, MONK_CYCLIC 413, monkClimb 420
- **The torch flame** (438): FLAME_LAYERS 442, drawFlame 443, drawEmber 461
- **The seven sins** (469): SIN_ORDER 472, SINS 473, DEMON_SIZE 486, DEMON_BODY 487, DP 499, dp 500, dl 501, claws 503, ribbon 512, spike 522, prideWing 525, paintPride 539, paintAvarice 567, paintLust 594, paintEnvy 617, paintGluttony 637, paintWrath 670, paintSloth 695, DEMON_PAINT 714, fillDemon 718, demonFlash 732, brokenCracks 734, drawDemon 745, EYES 767, demonEyes 768, demonJoint 785
- **The demons' moves** (792): DS 795, DD 804, GAIT_H 805, WING_A 806, gait 807, DSTRIKE 813, DEMON_ANIM 822, DEMON_HIT 895, DEMON_CYCLIC 896
- **Things lying about, and thrown** (898): OBJECTS 899, OBJ_PAINT 900, drawObject 936, drawShard 945
- **The backdrop** (958): BACK_LAYERS 964, BACK 971, buildBackdrop 972, drawBackdrop 1026, paintBackdrop 1044

### shapes.js (43 lines)

- (top): TRACED 5

### rooms.js (171 lines)

- (top): ROOMS 14, makeRoom 137
- **The piece picker** (151): Pieces 154

### climb-world.js (669 lines)

- (top): CLIMB_VERSES 8, blowCost 45, hangReach 51
- **The domains** (61): DOMAINS 67, BUILT 68, WIDE 70, SLOPE 73, MINE 77, summitAbove 85, summitK 86, domIdx 87, domOf 88, isGate 89, demonsFor 91
- **The mountain, made by rules** (93): secs 104, ensureSecs 105, sectionAt 133, shaftRow 142, edges 158, island 167, trav 187, travSolid 229
- **Lust's briars** (240): slope 247, slopeSolid 275, thornAt 285
- **Gluttony's caverns** (291): cave 304
- **Avarice's needle's eye** (368): eyeOf 372, eyeShut 381, almsOf 383, solid 391, solidAt 408, summitG 414, summitInfo 415, summitSolid 420, summitSec 430
- **Rooms (rooms.js)** (431): roomSec 434, roomSolid 439, roomEdges 441, roomMarks 450
- **The low ways** (460): crawlOf 466, NO_RELICS 489, relicsOf 490, wallAt 492, wallPos 500
- **The monk's body against the rock** (506): bodyH 508, boxHit 509, moveX 515, moveY 523, freeSpot 531, near 540, wallBeside 548, faceLine 555, plant 566, unclip 572, grip 576, middle 577
- **Ledges: stepping up, climbing up** (579): ledge 582, lipInReach 596, openBelow 605, ledgeAround 614, startAct 632, actRoot 639, actPoseU 657, stepAct 658

### climb-run.js (785 lines)

- **Starting, and the end** (6): start 8, metres 46, sectionsIn 48, lampsOf 53, lightOut 56, drained 63, die 66, heal 74, bankFreed 82, finish 87
- **His place on a mountain, kept** (100): keptAll 109, forget 110, keepPlace 112, keepHere 132, restore 134, settle 162
- **A scene from the white room** (174): SCENE_PLACE 178, scene 179
- **The relics' boons** (242): BOONS 250, BOON_ORDER 256, boonOf 257, boonOn 258, showBoon 259, stepBoonShow 264, boonShare 270, grantBoon 274, stepBoon 283, vadeRetro 306, vadeGreat 324, drawToken 333, drawMonkFront 361, drawBoonShow 387, boonGlows 404
- **The hook** (412): rayRock 414, nearLine 420
- **Avarice's chains** (427): chainsNear 430, chainTip 435, onSeg 436, chainHit 439, swingChains 451, throwHook 462, flyShot 477, flipDur 511, dropRope 512, sideOf 535, tapSide 539, swapHook 540, nextHook 545, hookAngle 556
- **The herbs, and the soups** (567): HERBS 574, SOUPS 576, soupOn 584, pairKey 585, recipes 587, placeHerbs 596, stepHerbs 608, canMix 619, openPouch 620, pickHerb 621, stepMix 628, drink 637
- **The tips** (645): tipsOn 649, tipSeen 650, tip 651, tipGone 656, lessonDone 664, setTips 665, action 666, hangRope 682
- **The rope round the rock** (702): bendsOf 707, pivotOf 708, freeOf 709, setFixed 710, sweepCorner 713, wrapRope 735
- **The flare** (753): startFlare 754, endFlare 760, puff 764, blink 771

### climb-foes.js (1195 lines)

- **The demons, and what they throw** (5): DEM 13, boxAt 15, moveBox 21, dFree 27, los 33, dMid 34, alive 35, panX 36, gain 37, setSt 38, spawnDemon 39, spotsFor 48, placeFor 90, placeRocks 120
- **The shrines** (135): placeShrine 144
- **The blocks** (168): SHAPES 185, newBlock 188, makeBlock 192, reveal 197, tie 206, takeUp 214, throwBlock 223, loosen 232, carryOff 240, shrineFor 246, dropBlock 253, seekBlock 259, floatTo 274, alight 294, floatDemon 295, rebuild 311, raiseIdol 317, yank 331, stepYank 336, brotherOf 349, binSlot 358, deliver 361, cartAt 370, unbin 377, stepBlocks 386, stepLoose 408, stepTied 434, flail 480, drawBlock 497, GLOWS 509, drawBlocks 510, drawTied 531, drawHeld 542, drawYank 551, drawBrother 558, rimNow 585, blockGlows 594
- **The great demons** (609): GREAT 621, GREAT_V 622, planGreat 626, placeGreat 643, placeSummit 654, bigAt 664, stepGreat 665, updGreat 669, greatReach 725, latch 754, holdHim 767, punchOut 774, spitOut 780, strikeGreat 794, greatThrows 821, breakGreat 833, hurl 850, freedSay 859
- **A great demon's dread** (860): DREAD_T 868
- **The angel** (869): ANG 874, startAngel 875, stepAngel 884, angelAt 894, drawBeam 898, drawAngel 906, drawAngelOver 931, finishWon 942, hauntWait 954, canDread 955, onView 957, greatSays 961, startDread 964, stepDread 969, burstSpot 980, burstAfter 995, drawDread 1003, MAW_STONE 1029, MAW_FLESH 1030, MAW_EYES 1031, MAW_CRACKS 1032, mawParts 1033, greatT 1114, laughK 1121, headTilt 1122, latchFrame 1127, paintMaw 1128, drawGreat 1143, drawLatch 1161, greatGlows 1168

### climb-fight.js (1061 lines)

- **The weight of a blow** (5): impact 9, impactAt 12, hitIdol 20, scatter 41, updIdol 48, populate 70, hurtDemon 79, castOut 103, flyDemon 111, updDemon 137, wander 157, stepWrath 164
- **Avarice's gold** (178): heavy 184, blowTo 186, comboOn 197, comboHit 198, CROWNED 214, wouldCrown 215, crownFX 216, drawCrown 221, breakCombo 228, drawCombo 230, throwCoins 246, coinSticks 254, giveAlms 260, stepAvarice 270, snatchLight 305, stepLust 319, ribbonHand 343, castRibbon 344, holdRibbon 355, pullOf 366, throwThorn 374, briars 382, briarHit 392, mouth 397, stepGluttony 403, inhale 443
- **Gluttony's swallow** (458): swallowLegs 465, stepLegs 477, offHim 486, freeLegs 491, kickLegs 499, GS_AT 506, drawLegsSac 507, eat 524, lob 534, lobFat 544, throwFire 552, thornStuck 559, sendAt 566, rockAt 574, burst 580, splat 585
- **Slime, grease, and rock that lies askew** (590): grease 595, slabAt 603, slickAt 610, tiltDy 616, slickWall 621, tryCatch 626, kickBack 636, strikeMonk 646, strikeDemon 663, updThing 677
- **The rock that gives way (Wrath's)** (742): crumblerAt 747, cellsOf 754, weigh 755, strikeRock 756, crack 757, stepCrumbling 772, hitMonk 780, demonAt 797, thingAt 798
- **His blows, and the boulders in his hands** (800): inLight 807, reachable 808, jumpTo 809, startMove 816, strikeSpot 827, attack 835, heave 843, catchThing 850, throwHeld 860, besides 869, closeBy 871, swingBlock 873, bash 879, release 885, ATK_ANIM 894, stepAtk 895, gesture 956, stroke 976, blessDemon 991, ward 1007, spendWard 1024, wardFade 1028, stomp 1032, swingKick 1050

### climb-frame.js (418 lines)

- **Each frame** (4): pads 6, lowWay 19, startCrawl 20, upFromCrawl 26, hangAt 27, physics 33, unlose 235, step 243

### climb-draw.js (1304 lines)

- **Drawing** (4): lightR 5, visPoly 19, drawSky 43, darkness 66, slab 90, rockPath 100, drawTablet 185, torchBack 210, wallWalk 211, wallClimb 219, crawlPose 227, monkPose 231, demonPose 282, lightCross 313, drawSign 321, drawBoulder 351, drawRope 352, drawHook 358, goOnLine 368, drawHerb 372, pouchBtn 385, drawSoups 386, drawHeart 421, draw 425
- **The domains, drawn** (433): rgb 436, rgbs 437, tintStep 438, put 446, drawGlutton 448, shadeGlut 461, eyeGlut 472, GLUT_EYE 477, glutEye 478, addShape 489, addPoly 492, addOval 493, WORSHIP_ART 495, BEL 500, idolPath 510, drawShrine 547, drawWorshipper 573, drawShardOf 591, carved 598, drawGate 599, briarStrip 651, drawBriars 664, drawChain 688, drawCoin 699, drawAlms 707, drawThorn 717, drawRibbon 723, drawLamp 733, drawRelic 747, crackLines 757, drawFat 775, sheen 786, drawPrints 806, drawSlime 816, drawFire 834, drawWorld 840, lostMarker 1166, dpad 1184, dpadDir 1185, actBtn 1190, flareBtn 1191, climbWay 1194, sideArrow 1195, hud 1201

### climb.js (252 lines)

- **The record, for notes to Claude** (28): ev 35, r2 36, doing 37, snapNow 40, record 48, grabScreen 55
- **Touch, mouse and keys** (58): goOn 60, inDpad 61, pid 62, M 63, ClimbPause 211

### notes.js (106 lines)

- (top): N 10, build 20, close 69, send 72

### room.js (209 lines)

- (top): R 9
- **What Claude is told: the game as it is, and the shape of the answer** (15): prompt 34, MOUNTAINS 43, num 44, clean 45
- **Asking** (63): ask 64, enter 89, Fade 95
- **The room, drawn** (102): back 137
- **The box to write in, beside him** (139): panelW 142, build 143, say 191, setBusy 196, hide 197

### psalm.js (184 lines)

- (top): PS118 6

### verses.js (238 lines)

- (top): STANZAS 12, which 20, V 21
- **The whole psalm, and what of it has been read** (27): split 41, keep 137
- **The box for it, over the pause screen** (158): build 160, take 226, show 232, close 234

### house.js (939 lines)

- (top): SHAPES 18, SITES 21, placed 28, H_ 30
- **What is kept** (32): data 33, siteData 55, takeBanked 57
- **The stones, as bodies** (62): P 63, makeWorld 64, addStone 70, squares 77, siteOf 78, load 80, keep 86
- **Laying a stone** (95): nearSite 96, holdSquares 98, sqHit 100, floorAt 109, blocked 110, landing 117, hangY 125, lay 130, takeUp 136, moveTo 143, nudge 152, turn 153, place 160, otherStone 170, putBack 180, inSquare 184, stoneAt 185, lift 186, loosen 195, ready 203, finish 204, addTo 210, recheck 216
- **Each step** (228): step 229
- **The people** (269): folkData 275, takePilgrims 277, makeFolk 284, loadFolk 290, receive 292, stepFolk 298, drawPerson 313, drawCamp 334, folkSigns 343
- **Days and nights** (355): stepClock 359, nightK 365
- **Drawn** (367): stoneFill 368, drawSquares 369, drawStone 377, outline 378, drawBuilt 383, draw 420
- **Inside** (543): goIn 544, goOut 545, HOURS 551, hourOf 557, hasVerses 558, shelves 559, drawRoom 568, drawSpine 577, drawBook 591
- **The choir** (624): freed 630, GLORIA 631, VOW 632, sylls 634, tone 643, hourVerses 662, sing 671, chorister 686, stallSeats 699, drawChoir 708, INSIDE 775
- **Choosing where to build** (834): span 839, fits 840, emptyAt 847, openMenu 848, setPlace 854, unplace 859, drawMenu 860, drawNecrology 872
- **Hands on it** (881): down 882, move 894, up 901, key 902, leave 923, open 925, M 936

### brothers.js (63 lines)

- (top): NAMES 9, brotherData 19, newName 38, gameNo 43, climberName 44, brotherFell 47, gameOver 57

### game.js (265 lines)

- (top): Game 6, vignetteMonk 32
- **The title** (42): Title 43
- **The seven mountains: one domain to a mountain** (82): NOV_SUB 86, novSettings 92, Novitiate 97
- **Home: carried there from a summit won** (137): Home 141
- **The end: the light goes out** (203): Over 204
- **The loop** (235): onResize 236, frame 240

<!-- end of index -->
