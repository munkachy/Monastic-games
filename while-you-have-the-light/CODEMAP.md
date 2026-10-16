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

### art.js (1067 lines)

- **The figures** (8): POSE0 17, pose 18, blendPose 20, EASE 24, keyPose 25, loop 31, solve 40, figToWorld 57, reach 63
- **Flat shapes** (70): P2 73, PA 74, addPts 75, seg 83, gem 88, HL 90, HLs 91, clothWind 94
- **The monk** (102): MONK_BODY 107, torchTip 110, sleeve 113, footShape 125, monkGeo 131, drawMonk 177, monkJoint 217
- **The monk's moves** (222): STAND_O 224, S_ 225, WALK_H 238, RUN_H 239, climbRootUp 243, climbRootDown 250, gripEdge 257, groundRoll 263, MONK_ANIM 270, MONK_HIT 414, MONK_CYCLIC 415, monkClimb 422
- **The torch flame** (440): FLAME_LAYERS 444, drawFlame 445, drawEmber 463
- **The seven sins** (471): SIN_ORDER 474, SINS 475, DEMON_SIZE 488, DEMON_BODY 489, DP 501, dp 502, dl 503, claws 505, ribbon 514, spike 524, prideWing 527, paintPride 541, paintAvarice 569, paintLust 596, paintEnvy 619, paintGluttony 639, paintWrath 672, paintSloth 697, DEMON_PAINT 716, fillDemon 720, demonFlash 734, brokenCracks 736, drawDemon 747, EYES 769, demonEyes 770, demonJoint 787
- **The demons' moves** (794): DS 797, DD 806, GAIT_H 807, WING_A 808, gait 809, DSTRIKE 815, DEMON_ANIM 824, DEMON_HIT 897, DEMON_CYCLIC 898
- **Things lying about, and thrown** (900): OBJECTS 901, OBJ_PAINT 902, drawObject 938, drawShard 947
- **The backdrop** (960): BACK_LAYERS 966, BACK 973, buildBackdrop 974, drawBackdrop 1028, paintBackdrop 1046

### shapes.js (43 lines)

- (top): TRACED 5

### rooms.js (346 lines)

- (top): ROOMS 15, makeRoom 186, seal 201
- **A whole mountain** (211): makeMountain 218, largest 304, WAYS 319, fits 321, linkRooms 322

### climb-world.js (678 lines)

- (top): CLIMB_VERSES 8, blowCost 46, hangReach 52
- **The domains** (62): DOMAINS 68, BUILT 69, WIDE 71, SLOPE 74, MINE 78, summitAbove 86, summitK 87, domIdx 88, domOf 89, isGate 90, demonsFor 92
- **The mountain, made by rules** (94): secs 105, ensureSecs 106, sectionAt 134, shaftRow 143, edges 159, island 168, trav 188, travSolid 230
- **Lust's briars** (241): slope 248, slopeSolid 276, thornAt 286
- **Gluttony's caverns** (292): cave 305
- **Avarice's needle's eye** (369): eyeOf 373, eyeShut 382, almsOf 384, solid 392, solidAt 409, summitG 415, summitInfo 416, summitSolid 421, summitSec 431
- **Rooms (rooms.js)** (432): roomSec 435, roomSolid 442, roomEdges 444, roomMarks 453
- **The low ways** (463): crawlOf 469, NO_RELICS 492, relicsOf 493, wallAt 495, wallPos 509
- **The monk's body against the rock** (515): bodyH 517, boxHit 518, moveX 524, moveY 532, freeSpot 540, near 549, wallBeside 557, faceLine 564, plant 575, unclip 581, grip 585, middle 586
- **Ledges: stepping up, climbing up** (588): ledge 591, lipInReach 605, openBelow 614, ledgeAround 623, startAct 641, actRoot 648, actPoseU 666, stepAct 667

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

### climb-foes.js (1196 lines)

- **The demons, and what they throw** (5): DEM 13, boxAt 15, moveBox 21, dFree 27, los 33, dMid 34, alive 35, panX 36, gain 37, setSt 38, spawnDemon 39, spotsFor 48, placeFor 90, placeRocks 121
- **The shrines** (136): placeShrine 145
- **The blocks** (169): SHAPES 186, newBlock 189, makeBlock 193, reveal 198, tie 207, takeUp 215, throwBlock 224, loosen 233, carryOff 241, shrineFor 247, dropBlock 254, seekBlock 260, floatTo 275, alight 295, floatDemon 296, rebuild 312, raiseIdol 318, yank 332, stepYank 337, brotherOf 350, binSlot 359, deliver 362, cartAt 371, unbin 378, stepBlocks 387, stepLoose 409, stepTied 435, flail 481, drawBlock 498, GLOWS 510, drawBlocks 511, drawTied 532, drawHeld 543, drawYank 552, drawBrother 559, rimNow 586, blockGlows 595
- **The great demons** (610): GREAT 622, GREAT_V 623, planGreat 627, placeGreat 644, placeSummit 655, bigAt 665, stepGreat 666, updGreat 670, greatReach 726, latch 755, holdHim 768, punchOut 775, spitOut 781, strikeGreat 795, greatThrows 822, breakGreat 834, hurl 851, freedSay 860
- **A great demon's dread** (861): DREAD_T 869
- **The angel** (870): ANG 875, startAngel 876, stepAngel 885, angelAt 895, drawBeam 899, drawAngel 907, drawAngelOver 932, finishWon 943, hauntWait 955, canDread 956, onView 958, greatSays 962, startDread 965, stepDread 970, burstSpot 981, burstAfter 996, drawDread 1004, MAW_STONE 1030, MAW_FLESH 1031, MAW_EYES 1032, MAW_CRACKS 1033, mawParts 1034, greatT 1115, laughK 1122, headTilt 1123, latchFrame 1128, paintMaw 1129, drawGreat 1144, drawLatch 1162, greatGlows 1169

### climb-fight.js (1061 lines)

- **The weight of a blow** (5): impact 9, impactAt 12, hitIdol 20, scatter 41, updIdol 48, populate 70, hurtDemon 79, castOut 103, flyDemon 111, updDemon 137, wander 157, stepWrath 164
- **Avarice's gold** (178): heavy 184, blowTo 186, comboOn 197, comboHit 198, CROWNED 214, wouldCrown 215, crownFX 216, drawCrown 221, breakCombo 228, drawCombo 230, throwCoins 246, coinSticks 254, giveAlms 260, stepAvarice 270, snatchLight 305, stepLust 319, ribbonHand 343, castRibbon 344, holdRibbon 355, pullOf 366, throwThorn 374, briars 382, briarHit 392, mouth 397, stepGluttony 403, inhale 443
- **Gluttony's swallow** (458): swallowLegs 465, stepLegs 477, offHim 486, freeLegs 491, kickLegs 499, GS_AT 506, drawLegsSac 507, eat 524, lob 534, lobFat 544, throwFire 552, thornStuck 559, sendAt 566, rockAt 574, burst 580, splat 585
- **Slime, grease, and rock that lies askew** (590): grease 595, slabAt 603, slickAt 610, tiltDy 616, slickWall 621, tryCatch 626, kickBack 636, strikeMonk 646, strikeDemon 663, updThing 677
- **The rock that gives way (Wrath's)** (742): crumblerAt 747, cellsOf 754, weigh 755, strikeRock 756, crack 757, stepCrumbling 772, hitMonk 780, demonAt 797, thingAt 798
- **His blows, and the boulders in his hands** (800): inLight 807, reachable 808, jumpTo 809, startMove 816, strikeSpot 827, attack 835, heave 843, catchThing 850, throwHeld 860, besides 869, closeBy 871, swingBlock 873, bash 879, release 885, ATK_ANIM 894, stepAtk 895, gesture 956, stroke 976, blessDemon 991, ward 1007, spendWard 1024, wardFade 1028, stomp 1032, swingKick 1050

### climb-frame.js (423 lines)

- **Each frame** (4): pads 6, lowWay 19, startCrawl 20, upFromCrawl 26, hangAt 27, physics 33, unlose 235, step 243

### climb-draw.js (1353 lines)

- **Drawing** (4): lightR 5, visPoly 19, drawSky 43, darkness 66, slab 90, rockPath 100, drawTablet 185, torchBack 210, wallWalk 211, wallClimb 219, crawlPose 227, monkPose 231, demonPose 282, lightCross 313, drawSign 321, drawBoulder 351, drawRope 352, drawHook 358, goOnLine 368, drawHerb 372, pouchBtn 385, drawSoups 386, drawHeart 421, draw 425
- **The domains, drawn** (433): rgb 436, rgbs 437, tintStep 438, put 446, drawGlutton 448, shadeGlut 461, eyeGlut 472, GLUT_EYE 477, glutEye 478, addShape 489, addPoly 492, addOval 493, BEL 498, idolPath 508, drawShrine 545, drawWorshipper 571, W_KNEEL 581, worshipPose 582, worshipPath 594, drawShardOf 602, carved 609, drawGate 610, briarStrip 662, drawBriars 675, drawChain 699, drawCoin 710, drawAlms 718, drawThorn 728, drawRibbon 734, drawLamp 744, drawRelic 758, crackLines 768, drawFat 786, sheen 797, drawPrints 817, drawSlime 827, drawFire 845, drawWorld 851, lostMarker 1177, dpad 1195, dpadDir 1196, actBtn 1201, flareBtn 1202, climbWay 1205, sideArrow 1206, hud 1212
- **The map** (1316): markSeen 1320, buildMap 1327, drawMap 1340

### climb.js (266 lines)

- **The record, for notes to Claude** (28): ev 35, r2 36, doing 37, snapNow 40, record 48, grabScreen 56
- **Touch, mouse and keys** (59): goOn 61, inDpad 62, pid 63, M 64, ClimbPause 214

### notes.js (106 lines)

- (top): N 10, build 20, close 69, send 72

### room.js (129 lines)

- (top): R 11
- **The places** (16): base 17, PLACES 18, go 23
- **What can be put in (built from the game's own lists, so what is added to it shows here)** (29): here 30, floorAt 32, mark 37, KINDS 38
- **The menu, held open over the play (the play stands still under it)** (76): Menu 83
- **The list of places** (112)

### psalm.js (184 lines)

- (top): PS118 6

### verses.js (238 lines)

- (top): STANZAS 12, which 20, V 21
- **The whole psalm, and what of it has been read** (27): split 41, keep 137
- **The box for it, over the pause screen** (158): build 160, take 226, show 232, close 234

### house.js (941 lines)

- (top): SHAPES 18, SITES 21, placed 28, H_ 30
- **What is kept** (32): data 33, siteData 55, takeBanked 57
- **The stones, as bodies** (62): P 63, makeWorld 64, addStone 70, squares 77, siteOf 78, load 80, keep 86
- **Laying a stone** (95): nearSite 96, holdSquares 98, sqHit 100, floorAt 109, blocked 110, landing 117, hangY 125, lay 130, takeUp 136, moveTo 143, nudge 152, turn 153, place 160, otherStone 170, putBack 180, inSquare 184, stoneAt 185, lift 186, loosen 195, ready 203, finish 204, addTo 210, recheck 216
- **Each step** (228): step 229
- **The people** (269): folkData 275, takePilgrims 277, makeFolk 284, loadFolk 290, receive 292, stepFolk 298, drawPerson 313, drawCamp 334, folkSigns 343
- **Days and nights** (355): stepClock 359, nightK 365
- **Drawn** (367): stoneFill 368, drawSquares 369, drawStone 377, outline 378, drawBuilt 383, draw 422
- **Inside** (545): goIn 546, goOut 547, HOURS 553, hourOf 559, hasVerses 560, shelves 561, drawRoom 570, drawSpine 579, drawBook 593
- **The choir** (626): freed 632, GLORIA 633, VOW 634, sylls 636, tone 645, hourVerses 664, sing 673, chorister 688, stallSeats 701, drawChoir 710, INSIDE 777
- **Choosing where to build** (836): span 841, fits 842, emptyAt 849, openMenu 850, setPlace 856, unplace 861, drawMenu 862, drawNecrology 874
- **Hands on it** (883): down 884, move 896, up 903, key 904, leave 925, open 927, M 938

### brothers.js (63 lines)

- (top): NAMES 9, brotherData 19, newName 38, gameNo 43, climberName 44, brotherFell 47, gameOver 57

### game.js (267 lines)

- (top): Game 6, vignetteMonk 32
- **The title** (42): Title 43
- **The seven mountains: one domain to a mountain** (81): NOV_SUB 85, novSettings 91, Novitiate 96
- **Home: carried there from a summit won** (136): Home 140
- **The end: the light goes out** (202): Over 203
- **The loop** (237): onResize 238, frame 242

<!-- end of index -->
