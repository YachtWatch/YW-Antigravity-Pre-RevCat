import Foundation
import Capacitor
import UIKit
import WebKit

// MARK: - Data models

private struct SlotData {
    let start: Date
    let end: Date
    let crew: [(firstName: String, lastName: String)]
}

private struct DayGroup {
    let date: Date
    let slots: [SlotData]
}

// MARK: - PDF renderer

private enum PDF {

    // ── Colours ───────────────────────────────────────────────────────────────
    static let navy       = UIColor(red: 27/255,  green: 42/255,  blue: 107/255, alpha: 1.00)
    static let navyFaint  = UIColor(red: 27/255,  green: 42/255,  blue: 107/255, alpha: 0.08)
    static let navyBorder = UIColor(red: 27/255,  green: 42/255,  blue: 107/255, alpha: 0.18)
    static let textPri    = UIColor(red: 0.10,    green: 0.10,    blue: 0.12,    alpha: 1.00)
    static let textSec    = UIColor(red: 0.48,    green: 0.48,    blue: 0.52,    alpha: 1.00)
    static let rowAlt     = UIColor(red: 0.965,   green: 0.965,   blue: 0.970,   alpha: 1.00)
    static let divider    = UIColor(red: 0.87,    green: 0.87,    blue: 0.89,    alpha: 1.00)

    // ── Page geometry (A4 portrait, 72 dpi points) ────────────────────────────
    static let W:    CGFloat = 595.2
    static let H:    CGFloat = 841.8
    static let lm:   CGFloat = 40        // left margin
    static let rm:   CGFloat = 40        // right margin
    static var cw:   CGFloat { W - lm - rm }   // content width = 515.2
    static let hdrH: CGFloat = 52        // header area (logo + divider)
    static let bm:   CGFloat = 36        // bottom margin
    static var cy0:  CGFloat { hdrH + 16 }     // first content Y
    static var yMax: CGFloat { H - bm }

    // ── Table columns ──────────────────────────────────────────────────────────
    static let tCW: CGFloat = 118          // time column width
    static var crX: CGFloat { lm + tCW }   // crew column X
    static var crW: CGFloat { cw - tCW }   // crew column width

    // ── Row heights ────────────────────────────────────────────────────────────
    static let navCardH: CGFloat = 96
    static let colHdrH:  CGFloat = 20
    static let dayHdrH:  CGFloat = 26
    static let slotH:    CGFloat = 22

    // MARK: Entry point

    static func generate(
        scheduleName: String,
        watchType:    String,
        crewPerWatch: Int,
        vesselName:   String,
        vesselType:   String,
        slots:        [SlotData]
    ) -> Data {
        let pageRect  = CGRect(x: 0, y: 0, width: W, height: H)
        let groups    = groupByDay(slots)
        let prefix    = vesselType == "motor" ? "M/Y" : "S/Y"
        let fullName  = "\(prefix) \(vesselName)"

        let typeLabel: String
        switch watchType {
        case "anchor": typeLabel = "Anchor Watch"
        case "dock":   typeLabel = "Dock Watch"
        default:       typeLabel = "Navigation"
        }

        var dateRange = ""; var durLabel = ""
        if let first = slots.min(by: { $0.start < $1.start }),
           let last  = slots.max(by: { $0.end   < $1.end   }) {
            let df = DateFormatter(); df.dateFormat = "d MMM yyyy"
            dateRange = "\(df.string(from: first.start)) – \(df.string(from: last.end))"
            let hrs = first.end.timeIntervalSince(first.start) / 3600
            durLabel  = hrs == hrs.rounded() ? "\(Int(hrs))h" : String(format: "%.1fh", hrs)
        }

        let pdfData = NSMutableData()
        UIGraphicsBeginPDFContextToData(pdfData, pageRect, nil)

        // ── Page 1 ────────────────────────────────────────────────────────────
        UIGraphicsBeginPDFPage()
        drawHeader()
        var y = cy0

        y = drawNavCard(y: y, vessel: fullName, schedule: scheduleName,
                        type: typeLabel, range: dateRange,
                        crew: crewPerWatch, dur: durLabel)
        y += 14
        y = drawColHeaders(y: y)
        y += 4

        // ── Day groups ────────────────────────────────────────────────────────
        for group in groups {
            // Need room for at least the day header + one slot before page-breaking
            if y + dayHdrH + slotH > yMax {
                UIGraphicsBeginPDFPage(); drawHeader()
                y = cy0
                y = drawColHeaders(y: y); y += 4
            }
            y = drawDayHdr(y: y, date: group.date)

            for (i, slot) in group.slots.enumerated() {
                if y + slotH > yMax {
                    UIGraphicsBeginPDFPage(); drawHeader()
                    y = cy0
                    y = drawColHeaders(y: y); y += 4
                }
                y = drawSlot(y: y, slot: slot, idx: i)
            }
        }

        UIGraphicsEndPDFContext()
        return pdfData as Data
    }

    // MARK: Header — YachtWatch logo + title + navy divider (every page)

    static func drawHeader() {
        let logoSz: CGFloat = 28
        let logoY:  CGFloat = 12
        let logoX = lm

        // Try to load the app icon from the Capacitor web-assets bundle
        if let path  = Bundle.main.path(forResource: "app-icon", ofType: "png", inDirectory: "public"),
           let image = UIImage(contentsOfFile: path),
           let ctx   = UIGraphicsGetCurrentContext() {
            ctx.saveGState()
            let r = CGRect(x: logoX, y: logoY, width: logoSz, height: logoSz)
            UIBezierPath(roundedRect: r, cornerRadius: 6).addClip()
            image.draw(in: r)
            ctx.restoreGState()
        } else {
            // Fallback: filled navy rounded rect with "YW"
            let r = CGRect(x: logoX, y: logoY, width: logoSz, height: logoSz)
            let p = UIBezierPath(roundedRect: r, cornerRadius: 6)
            navy.setFill(); p.fill()
            let fa: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10, weight: .bold),
                .foregroundColor: UIColor.white
            ]
            let sz = ("YW" as NSString).size(withAttributes: fa)
            ("YW" as NSString).draw(
                at: CGPoint(x: logoX + (logoSz - sz.width) / 2,
                            y: logoY + (logoSz - sz.height) / 2),
                withAttributes: fa)
        }

        // "YachtWatch" bold navy title
        let tFont = UIFont.systemFont(ofSize: 16, weight: .bold)
        let tAttr: [NSAttributedString.Key: Any] = [.font: tFont, .foregroundColor: navy]
        let tSz = ("YachtWatch" as NSString).size(withAttributes: tAttr)
        ("YachtWatch" as NSString).draw(
            at: CGPoint(x: logoX + logoSz + 9,
                        y: logoY + (logoSz - tSz.height) / 2),
            withAttributes: tAttr)

        // Navy divider below logo row
        let dy = logoY + logoSz + 8
        stroke(from: CGPoint(x: lm, y: dy), to: CGPoint(x: W - rm, y: dy), color: navy, width: 1.5)
    }

    // MARK: Navigation card (first page only)

    @discardableResult
    static func drawNavCard(y: CGFloat, vessel: String, schedule: String,
                            type: String, range: String,
                            crew: Int, dur: String) -> CGFloat {
        let r    = CGRect(x: lm, y: y, width: cw, height: navCardH)
        let path = UIBezierPath(roundedRect: r, cornerRadius: 8)
        UIColor(red: 0.97, green: 0.97, blue: 0.98, alpha: 1).setFill(); path.fill()
        navyBorder.setStroke(); path.lineWidth = 1; path.stroke()

        var iy = y + 15
        let ix = lm + 16

        // Vessel name
        let vFont = UIFont.systemFont(ofSize: 17, weight: .bold)
        let vAttr: [NSAttributedString.Key: Any] = [.font: vFont, .foregroundColor: navy]
        (vessel as NSString).draw(at: CGPoint(x: ix, y: iy), withAttributes: vAttr)

        // Watch-type badge (top-right)
        let bFont = UIFont.systemFont(ofSize: 9, weight: .semibold)
        let bAttr: [NSAttributedString.Key: Any] = [.font: bFont, .foregroundColor: navy]
        let bTxt  = type.uppercased() as NSString
        let bSz   = bTxt.size(withAttributes: bAttr)
        let bPad: CGFloat = 6
        let bW = bSz.width + bPad * 2; let bH = bSz.height + 5
        let bX = lm + cw - 16 - bW
        let bPath = UIBezierPath(roundedRect: CGRect(x: bX, y: iy + 2, width: bW, height: bH), cornerRadius: 4)
        navyFaint.setFill(); bPath.fill()
        bTxt.draw(at: CGPoint(x: bX + bPad, y: iy + 4), withAttributes: bAttr)

        iy += vFont.lineHeight + 5

        // Schedule name
        let sFont = UIFont.systemFont(ofSize: 11, weight: .medium)
        let sAttr: [NSAttributedString.Key: Any] = [.font: sFont, .foregroundColor: textSec]
        (schedule as NSString).draw(at: CGPoint(x: ix, y: iy), withAttributes: sAttr)
        iy += sFont.lineHeight + 5

        // Date range + stats row
        var parts: [String] = []
        if !range.isEmpty    { parts.append(range) }
        if crew > 0          { parts.append("\(crew) crew per watch") }
        if !dur.isEmpty      { parts.append("\(dur) watches") }
        let dFont = UIFont.systemFont(ofSize: 10, weight: .regular)
        let dAttr: [NSAttributedString.Key: Any] = [.font: dFont, .foregroundColor: textSec]
        (parts.joined(separator: "  ·  ") as NSString).draw(at: CGPoint(x: ix, y: iy), withAttributes: dAttr)

        return y + navCardH
    }

    // MARK: Column headers

    @discardableResult
    static func drawColHeaders(y: CGFloat) -> CGFloat {
        let f = UIFont.systemFont(ofSize: 9, weight: .semibold)
        let a: [NSAttributedString.Key: Any] = [.font: f, .foregroundColor: textSec]
        let ty = y + (colHdrH - f.lineHeight) / 2
        ("TIME" as NSString).draw(at: CGPoint(x: lm, y: ty), withAttributes: a)
        ("CREW ON WATCH" as NSString).draw(at: CGPoint(x: crX, y: ty), withAttributes: a)
        stroke(from: CGPoint(x: lm, y: y + colHdrH),
               to:   CGPoint(x: W - rm, y: y + colHdrH),
               color: navyBorder, width: 1)
        return y + colHdrH
    }

    // MARK: Day header row

    @discardableResult
    static func drawDayHdr(y: CGFloat, date: Date) -> CGFloat {
        navyFaint.setFill()
        UIRectFill(CGRect(x: lm, y: y, width: cw, height: dayHdrH))

        let df = DateFormatter(); df.dateFormat = "EEEE, d MMMM"
        let f  = UIFont.systemFont(ofSize: 9, weight: .bold)
        let a: [NSAttributedString.Key: Any] = [.font: f, .foregroundColor: navy]
        let ty = y + (dayHdrH - f.lineHeight) / 2
        (df.string(from: date).uppercased() as NSString)
            .draw(at: CGPoint(x: lm + 8, y: ty), withAttributes: a)

        stroke(from: CGPoint(x: lm, y: y + dayHdrH),
               to:   CGPoint(x: W - rm, y: y + dayHdrH),
               color: divider, width: 0.5)
        return y + dayHdrH
    }

    // MARK: Slot row

    @discardableResult
    static func drawSlot(y: CGFloat, slot: SlotData, idx: Int) -> CGFloat {
        if idx % 2 == 1 {
            rowAlt.setFill()
            UIRectFill(CGRect(x: lm, y: y, width: cw, height: slotH))
        }

        let tf = DateFormatter(); tf.dateFormat = "HH:mm"
        let timeTxt = "\(tf.string(from: slot.start)) – \(tf.string(from: slot.end))"
        let crewTxt = slot.crew.map { "\($0.firstName) \($0.lastName)" }.joined(separator: ", ")

        let mFont = UIFont.monospacedSystemFont(ofSize: 10.5, weight: .regular)
        let rFont = UIFont.systemFont(ofSize: 10.5, weight: .regular)
        let ty = y + (slotH - mFont.lineHeight) / 2

        let tAttr: [NSAttributedString.Key: Any] = [.font: mFont, .foregroundColor: textSec]
        let cStyle = NSMutableParagraphStyle(); cStyle.lineBreakMode = .byTruncatingTail
        let cAttr: [NSAttributedString.Key: Any] = [.font: rFont, .foregroundColor: textPri, .paragraphStyle: cStyle]

        (timeTxt as NSString).draw(at: CGPoint(x: lm, y: ty), withAttributes: tAttr)
        (crewTxt as NSString).draw(in: CGRect(x: crX, y: ty, width: crW - 8, height: slotH), withAttributes: cAttr)

        stroke(from: CGPoint(x: lm, y: y + slotH),
               to:   CGPoint(x: W - rm, y: y + slotH),
               color: divider, width: 0.5)
        return y + slotH
    }

    // MARK: Utilities

    static func stroke(from a: CGPoint, to b: CGPoint, color: UIColor, width: CGFloat) {
        let p = UIBezierPath(); p.move(to: a); p.addLine(to: b)
        color.setStroke(); p.lineWidth = width; p.stroke()
    }

    static func groupByDay(_ slots: [SlotData]) -> [DayGroup] {
        let cal = Calendar.current
        var result: [DayGroup] = []
        var current: (day: Date, slots: [SlotData])? = nil
        for slot in slots.sorted(by: { $0.start < $1.start }) {
            let day = cal.startOfDay(for: slot.start)
            if let c = current, cal.isDate(c.day, inSameDayAs: day) {
                current!.slots.append(slot)
            } else {
                if let c = current { result.append(DayGroup(date: c.day, slots: c.slots)) }
                current = (day, [slot])
            }
        }
        if let c = current { result.append(DayGroup(date: c.day, slots: c.slots)) }
        return result
    }

    static func parseDate(_ s: String) -> Date? {
        let f1 = ISO8601DateFormatter()
        f1.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f1.date(from: s) { return d }
        let f2 = ISO8601DateFormatter()
        f2.formatOptions = [.withInternetDateTime]
        return f2.date(from: s)
    }
}

// MARK: - Capacitor plugin

@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin {

    /// Generates a native A4 PDF from schedule data and presents UIActivityViewController.
    /// No DOM rendering — works immediately without any preview step.
    @objc func sharePDF(_ call: CAPPluginCall) {
        let fileName     = call.getString("fileName")     ?? "WatchSchedule.pdf"
        let scheduleName = call.getString("scheduleName") ?? "Watch Schedule"
        let watchType    = call.getString("watchType")    ?? "navigation"
        let crewPerWatch = call.getInt("crewPerWatch")    ?? 0
        let vesselName   = call.getString("vesselName")   ?? "Vessel"
        let vesselType   = call.getString("vesselType")   ?? "sail"

        // Parse slots
        var slots: [SlotData] = []
        if let rawSlots = call.getArray("slots") as? [[String: Any]] {
            for raw in rawSlots {
                guard
                    let startStr = raw["start"] as? String,
                    let endStr   = raw["end"]   as? String,
                    let start    = PDF.parseDate(startStr),
                    let end      = PDF.parseDate(endStr)
                else { continue }

                var crew: [(String, String)] = []
                if let crewRaw = raw["crew"] as? [[String: Any]] {
                    crew = crewRaw.compactMap {
                        guard let fn = $0["firstName"] as? String,
                              let ln = $0["lastName"]  as? String
                        else { return nil }
                        return (fn, ln)
                    }
                }
                slots.append(SlotData(start: start, end: end, crew: crew))
            }
        }

        // Generate PDF off the main thread
        DispatchQueue.global(qos: .userInitiated).async {
            let data = PDF.generate(
                scheduleName: scheduleName,
                watchType:    watchType,
                crewPerWatch: crewPerWatch,
                vesselName:   vesselName,
                vesselType:   vesselType,
                slots:        slots
            )

            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent(fileName)
            do {
                try data.write(to: url, options: .atomic)
            } catch {
                call.reject("Failed to write PDF: \(error.localizedDescription)")
                return
            }

            DispatchQueue.main.async {
                let vc = UIActivityViewController(
                    activityItems: [url],
                    applicationActivities: nil
                )
                // iPad: must set sourceView/sourceRect or the app crashes
                if let pop = vc.popoverPresentationController, let wv = self.webView {
                    pop.sourceView = wv
                    pop.sourceRect = CGRect(x: wv.bounds.maxX - 60, y: 60, width: 0, height: 0)
                    pop.permittedArrowDirections = [.up]
                }
                self.bridge?.viewController?.present(vc, animated: true) {
                    call.resolve()
                }
            }
        }
    }
}
