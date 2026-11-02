// Pocket Sampler as an iPad app, made in Swift Playgrounds (free; no Xcode, no developer account).
// It shows the web app (the same one as in Safari, always the newest), and lays the iPad's own touch
// reading over its pads only, the way GarageBand reads them: Safari drops some quick taps (a finger
// landing just as another lifts) before a web page ever sees them. Every other touch (the loops, the
// menus, the buttons) goes to the web app as usual. The web app tells this one where the pads are
// (window.pocketNative in app.js); this one plays them there.
//
// To use: in Swift Playgrounds, make a new App, open its ContentView, replace everything in it with
// this file, and tap Run. (See pocket-sampler/ipad-app/index.html.)
import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        PocketView()
            .ignoresSafeArea()
            .defersSystemGestures(on: .all)        // the edges: Pocket Sampler's taps first, the iPad's swipes second
            .persistentSystemOverlays(.hidden)
            .statusBarHidden(true)
    }
}

struct PocketView: UIViewRepresentable {
    func makeUIView(context: Context) -> PocketHost { PocketHost() }
    func updateUIView(_ view: PocketHost, context: Context) {}
}

// A pad, where it is on the screen: area "keys" (the Pads) or "lp" (Loops + Pads), its number from 0
struct Pad {
    let area: String
    let k: Int
    let rect: CGRect
}

// (the web view keeps its message handler strongly: this passes the messages on without a loop)
final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: PocketHost?
    init(_ target: PocketHost) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        target?.received(m)
    }
}

final class PocketHost: UIView {
    let web: WKWebView
    let pads = PadLayer()

    init() {
        let conf = WKWebViewConfiguration()
        conf.allowsInlineMediaPlayback = true
        conf.mediaTypesRequiringUserActionForPlayback = []
        web = WKWebView(frame: .zero, configuration: conf)
        super.init(frame: .zero)
        conf.userContentController.add(WeakHandler(self), name: "pads")
        backgroundColor = .black
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.pinchGestureRecognizer?.isEnabled = false
        addSubview(web)
        addSubview(pads)
        pads.web = web
        let url = URL(string: "https://munkachy.github.io/Monastic-games/pocket-sampler/")!
        web.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override func layoutSubviews() {
        super.layoutSubviews()
        web.frame = bounds
        pads.frame = bounds
    }

    // where the pads are, from the web app: [[area, k, x, y, width, height], ...]
    func received(_ m: WKScriptMessage) {
        guard let text = m.body as? String, let data = text.data(using: .utf8),
              let list = try? JSONSerialization.jsonObject(with: data) as? [[Any]] else { return }
        pads.rects = list.compactMap { a in
            guard a.count >= 6, let area = a[0] as? String, let k = (a[1] as? NSNumber)?.intValue else { return nil }
            func n(_ i: Int) -> CGFloat { CGFloat((a[i] as? NSNumber)?.doubleValue ?? 0) }
            return Pad(area: area, k: k, rect: CGRect(x: n(2), y: n(3), width: n(4), height: n(5)))
        }
    }
}

// Over the web app, the size of the screen, but it takes a touch only on a pad (or in the gap beside
// one); any other touch passes through to the web app. Each finger is its own pad; a finger that
// slides onto another pad plays that one.
final class PadLayer: UIView {
    weak var web: WKWebView?
    var rects: [Pad] = []
    private var held: [ObjectIdentifier: Pad] = [:]

    override init(frame: CGRect) {
        super.init(frame: frame)
        isMultipleTouchEnabled = true
        backgroundColor = .clear
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    // the pad under a point; in a gap, the nearest within 24 points
    private func pad(at p: CGPoint) -> Pad? {
        if let hit = rects.first(where: { $0.rect.contains(p) }) { return hit }
        var best: Pad? = nil
        var bestD: CGFloat = 25
        for r in rects {
            let dx = max(r.rect.minX - p.x, 0, p.x - r.rect.maxX)
            let dy = max(r.rect.minY - p.y, 0, p.y - r.rect.maxY)
            let d = (dx * dx + dy * dy).squareRoot()
            if d < bestD { bestD = d; best = r }
        }
        return best
    }

    override func point(inside p: CGPoint, with event: UIEvent?) -> Bool { pad(at: p) != nil }

    private func send(_ js: String) { web?.evaluateJavaScript(js, completionHandler: nil) }
    private func down(_ p: Pad) { send("pocketNative.down('\(p.area)',\(p.k))") }
    private func up(_ p: Pad) { send("pocketNative.up('\(p.area)',\(p.k))") }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches {
            guard let p = pad(at: t.location(in: self)) else { continue }
            held[ObjectIdentifier(t)] = p
            down(p)
        }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches {
            let at = t.location(in: self)
            guard let was = held[ObjectIdentifier(t)], let p = pad(at: at), p.rect.contains(at),
                  p.area != was.area || p.k != was.k else { continue }
            up(was)
            held[ObjectIdentifier(t)] = p
            down(p)
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches { if let p = held.removeValue(forKey: ObjectIdentifier(t)) { up(p) } }
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchesEnded(touches, with: event)
    }
}
