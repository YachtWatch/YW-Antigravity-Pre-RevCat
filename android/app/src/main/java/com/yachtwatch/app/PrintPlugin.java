package com.yachtwatch.app;

import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

@CapacitorPlugin(name = "PrintPlugin")
public class PrintPlugin extends Plugin {

    // ── Colors ───────────────────────────────────────────────────────────────
    private static final int NAVY        = Color.rgb(27, 42, 107);
    private static final int NAVY_FAINT  = Color.argb((int)(0.08 * 255), 27, 42, 107);
    private static final int NAVY_BORDER = Color.argb((int)(0.18 * 255), 27, 42, 107);
    private static final int TEXT_PRI    = Color.rgb(26, 26, 31);
    private static final int TEXT_SEC    = Color.rgb(122, 122, 133);
    private static final int ROW_ALT     = Color.rgb(246, 246, 247);
    private static final int DIVIDER     = Color.rgb(222, 222, 227);

    // ── Page geometry (A4 portrait, 72 dpi points) ───────────────────────────
    private static final float W   = 595f;
    private static final float H   = 842f;
    private static final float LM  = 40f;   // left margin
    private static final float RM  = 40f;   // right margin
    private static final float CW  = W - LM - RM;   // content width = 515
    private static final float HDR_H  = 52f;
    private static final float BM     = 36f;
    private static final float CY0    = HDR_H + 16f;
    private static final float Y_MAX  = H - BM;

    // ── Table columns ─────────────────────────────────────────────────────────
    private static final float TCW = 118f;
    private static final float CR_X = LM + TCW;
    private static final float CR_W = CW - TCW;

    // ── Row heights ───────────────────────────────────────────────────────────
    private static final float NAV_CARD_H = 96f;
    private static final float COL_HDR_H  = 20f;
    private static final float DAY_HDR_H  = 26f;
    private static final float SLOT_H     = 22f;

    // ── Data models ───────────────────────────────────────────────────────────

    private static class SlotData {
        Date start;
        Date end;
        List<String[]> crew; // each entry is [firstName, lastName]

        SlotData(Date start, Date end, List<String[]> crew) {
            this.start = start;
            this.end   = end;
            this.crew  = crew;
        }
    }

    private static class DayGroup {
        Date date;
        List<SlotData> slots;

        DayGroup(Date date, List<SlotData> slots) {
            this.date  = date;
            this.slots = slots;
        }
    }

    // ── Plugin method ─────────────────────────────────────────────────────────

    @PluginMethod
    public void sharePDF(final PluginCall call) {
        final String fileName     = call.getString("fileName",     "WatchSchedule.pdf");
        final String scheduleName = call.getString("scheduleName", "Watch Schedule");
        final String watchType    = call.getString("watchType",    "navigation");
        final int    crewPerWatch = call.getInt("crewPerWatch", 0);
        final String vesselName   = call.getString("vesselName",   "Vessel");
        final String vesselType   = call.getString("vesselType",   "sail");

        final List<SlotData> slots = new ArrayList<>();
        JSArray rawSlots = call.getArray("slots");
        if (rawSlots != null) {
            try {
                for (int i = 0; i < rawSlots.length(); i++) {
                    JSONObject raw = rawSlots.getJSONObject(i);
                    Date start = parseDate(raw.optString("start"));
                    Date end   = parseDate(raw.optString("end"));
                    if (start == null || end == null) continue;

                    List<String[]> crew = new ArrayList<>();
                    JSONArray crewRaw = raw.optJSONArray("crew");
                    if (crewRaw != null) {
                        for (int j = 0; j < crewRaw.length(); j++) {
                            JSONObject member = crewRaw.getJSONObject(j);
                            String fn = member.optString("firstName", "");
                            String ln = member.optString("lastName",  "");
                            crew.add(new String[]{fn, ln});
                        }
                    }
                    slots.add(new SlotData(start, end, crew));
                }
            } catch (Exception e) {
                call.reject("Failed to parse slots: " + e.getMessage());
                return;
            }
        }

        new Thread(() -> {
            try {
                byte[] pdfBytes = generatePdf(scheduleName, watchType, crewPerWatch,
                                              vesselName, vesselType, slots);

                File tempFile = new File(getActivity().getCacheDir(), fileName);
                try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                    fos.write(pdfBytes);
                }

                android.net.Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    tempFile
                );

                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("application/pdf");
                shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(shareIntent, "Share Watch Schedule");
                getActivity().startActivity(chooser);

                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to generate PDF: " + e.getMessage());
            }
        }).start();
    }

    // ── PDF generation ────────────────────────────────────────────────────────

    private byte[] generatePdf(String scheduleName, String watchType, int crewPerWatch,
                                String vesselName, String vesselType, List<SlotData> slots)
            throws Exception {

        String prefix   = "motor".equals(vesselType) ? "M/Y" : "S/Y";
        String fullName = prefix + " " + vesselName;

        String typeLabel;
        switch (watchType) {
            case "anchor": typeLabel = "Anchor Watch"; break;
            case "dock":   typeLabel = "Dock Watch";   break;
            default:       typeLabel = "Navigation";
        }

        String dateRange = "", durLabel = "";
        if (!slots.isEmpty()) {
            SlotData first = Collections.min(slots, (a, b) -> a.start.compareTo(b.start));
            SlotData last  = Collections.max(slots, (a, b) -> a.end.compareTo(b.end));
            SimpleDateFormat df = new SimpleDateFormat("d MMM yyyy", Locale.ENGLISH);
            dateRange = df.format(first.start) + " \u2013 " + df.format(last.end);
            double hrs = (first.end.getTime() - first.start.getTime()) / 3600000.0;
            durLabel = (hrs == (long) hrs) ? ((int) hrs) + "h" : String.format(Locale.ENGLISH, "%.1fh", hrs);
        }

        PdfDocument document = new PdfDocument();
        List<DayGroup> groups = groupByDay(slots);
        int[] pageNumber = {1};

        // Helper to start a new page
        PdfDocument.Page firstPage = startNewPage(document, pageNumber);
        Canvas canvas = firstPage.getCanvas();
        drawHeader(canvas);
        float y = CY0;

        y = drawNavCard(canvas, y, fullName, scheduleName, typeLabel, dateRange, crewPerWatch, durLabel);
        y += 14f;
        y = drawColHeaders(canvas, y);
        y += 4f;

        for (DayGroup group : groups) {
            if (y + DAY_HDR_H + SLOT_H > Y_MAX) {
                document.finishPage(firstPage);
                firstPage = startNewPage(document, pageNumber);
                canvas = firstPage.getCanvas();
                drawHeader(canvas);
                y = CY0;
                y = drawColHeaders(canvas, y);
                y += 4f;
            }
            y = drawDayHdr(canvas, y, group.date);

            for (int i = 0; i < group.slots.size(); i++) {
                if (y + SLOT_H > Y_MAX) {
                    document.finishPage(firstPage);
                    firstPage = startNewPage(document, pageNumber);
                    canvas = firstPage.getCanvas();
                    drawHeader(canvas);
                    y = CY0;
                    y = drawColHeaders(canvas, y);
                    y += 4f;
                }
                y = drawSlot(canvas, y, group.slots.get(i), i);
            }
        }

        document.finishPage(firstPage);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        document.writeTo(out);
        document.close();
        return out.toByteArray();
    }

    private PdfDocument.Page startNewPage(PdfDocument document, int[] pageNumber) {
        PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(
                (int) W, (int) H, pageNumber[0]++).create();
        PdfDocument.Page page = document.startPage(pageInfo);
        page.getCanvas().drawColor(Color.WHITE);
        return page;
    }

    // ── Header ────────────────────────────────────────────────────────────────

    private void drawHeader(Canvas canvas) {
        float logoSz = 28f, logoY = 12f, logoX = LM;

        // Navy rounded-rect logo with "YW"
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(NAVY);
        p.setStyle(Paint.Style.FILL);
        canvas.drawRoundRect(new RectF(logoX, logoY, logoX + logoSz, logoY + logoSz), 6f, 6f, p);

        p.setColor(Color.WHITE);
        p.setTextSize(10f);
        p.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        p.setTextAlign(Paint.Align.CENTER);
        float textY = logoY + logoSz / 2f - (p.descent() + p.ascent()) / 2f;
        canvas.drawText("YW", logoX + logoSz / 2f, textY, p);

        // "YachtWatch" title
        p.setColor(NAVY);
        p.setTextSize(16f);
        p.setTextAlign(Paint.Align.LEFT);
        float titleY = logoY + logoSz / 2f - (p.descent() + p.ascent()) / 2f;
        canvas.drawText("YachtWatch", logoX + logoSz + 9f, titleY, p);

        // Navy divider
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(1.5f);
        float dy = logoY + logoSz + 8f;
        canvas.drawLine(LM, dy, W - RM, dy, p);
    }

    // ── Navigation card ───────────────────────────────────────────────────────

    private float drawNavCard(Canvas canvas, float y, String vessel, String schedule,
                               String type, String range, int crew, String dur) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);

        // Card background
        p.setColor(Color.rgb(247, 247, 250));
        p.setStyle(Paint.Style.FILL);
        canvas.drawRoundRect(new RectF(LM, y, LM + CW, y + NAV_CARD_H), 8f, 8f, p);

        // Card border
        p.setColor(NAVY_BORDER);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(1f);
        canvas.drawRoundRect(new RectF(LM, y, LM + CW, y + NAV_CARD_H), 8f, 8f, p);

        float iy = y + 15f;
        float ix = LM + 16f;

        // Vessel name
        p.setStyle(Paint.Style.FILL);
        p.setColor(NAVY);
        p.setTextSize(17f);
        p.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        p.setTextAlign(Paint.Align.LEFT);
        canvas.drawText(vessel, ix, iy - p.ascent(), p);

        // Watch-type badge (top-right)
        p.setTextSize(9f);
        p.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        String bText = type.toUpperCase(Locale.ENGLISH);
        float bTextW = p.measureText(bText);
        float bPad = 6f, bW = bTextW + bPad * 2f, bH = 9f * 1.8f;
        float bX = LM + CW - 16f - bW;
        p.setColor(NAVY_FAINT);
        canvas.drawRoundRect(new RectF(bX, iy + 2f, bX + bW, iy + 2f + bH), 4f, 4f, p);
        p.setColor(NAVY);
        canvas.drawText(bText, bX + bPad, iy + 2f + bH / 2f - (p.descent() + p.ascent()) / 2f, p);

        iy += 17f * 1.2f + 5f;

        // Schedule name
        p.setColor(TEXT_SEC);
        p.setTextSize(11f);
        p.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
        canvas.drawText(schedule, ix, iy - p.ascent(), p);
        iy += 11f * 1.2f + 5f;

        // Date range + stats
        List<String> parts = new ArrayList<>();
        if (!range.isEmpty())  parts.add(range);
        if (crew > 0)          parts.add(crew + " crew per watch");
        if (!dur.isEmpty())    parts.add(dur + " watches");
        p.setColor(TEXT_SEC);
        p.setTextSize(10f);
        canvas.drawText(join(parts, "  \u00B7  "), ix, iy - p.ascent(), p);

        return y + NAV_CARD_H;
    }

    // ── Column headers ────────────────────────────────────────────────────────

    private float drawColHeaders(Canvas canvas, float y) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(TEXT_SEC);
        p.setTextSize(9f);
        p.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        float ty = y + (COL_HDR_H - p.getTextSize()) / 2f;
        canvas.drawText("TIME",          LM,   ty - p.ascent(), p);
        canvas.drawText("CREW ON WATCH", CR_X, ty - p.ascent(), p);

        p.setColor(NAVY_BORDER);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(1f);
        canvas.drawLine(LM, y + COL_HDR_H, W - RM, y + COL_HDR_H, p);
        return y + COL_HDR_H;
    }

    // ── Day header row ────────────────────────────────────────────────────────

    private float drawDayHdr(Canvas canvas, float y, Date date) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(NAVY_FAINT);
        p.setStyle(Paint.Style.FILL);
        canvas.drawRect(LM, y, LM + CW, y + DAY_HDR_H, p);

        SimpleDateFormat df = new SimpleDateFormat("EEEE, d MMMM", Locale.ENGLISH);
        p.setColor(NAVY);
        p.setTextSize(9f);
        p.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        float ty = y + (DAY_HDR_H - p.getTextSize()) / 2f;
        canvas.drawText(df.format(date).toUpperCase(Locale.ENGLISH), LM + 8f, ty - p.ascent(), p);

        p.setColor(DIVIDER);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(0.5f);
        canvas.drawLine(LM, y + DAY_HDR_H, W - RM, y + DAY_HDR_H, p);
        return y + DAY_HDR_H;
    }

    // ── Slot row ──────────────────────────────────────────────────────────────

    private float drawSlot(Canvas canvas, float y, SlotData slot, int idx) {
        if (idx % 2 == 1) {
            Paint bg = new Paint();
            bg.setColor(ROW_ALT);
            canvas.drawRect(LM, y, LM + CW, y + SLOT_H, bg);
        }

        SimpleDateFormat tf = new SimpleDateFormat("HH:mm", Locale.ENGLISH);
        String timeTxt = tf.format(slot.start) + " \u2013 " + tf.format(slot.end);

        List<String> names = new ArrayList<>();
        for (String[] member : slot.crew) {
            names.add(member[0] + " " + member[1]);
        }
        String crewTxt = join(names, ", ");

        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setTextSize(10.5f);
        float ty = y + (SLOT_H - p.getTextSize()) / 2f;

        // Time (monospace)
        p.setColor(TEXT_SEC);
        p.setTypeface(Typeface.MONOSPACE);
        canvas.drawText(timeTxt, LM, ty - p.ascent(), p);

        // Crew (clipped to column width)
        p.setColor(TEXT_PRI);
        p.setTypeface(Typeface.DEFAULT);
        canvas.drawText(clipText(p, crewTxt, CR_W - 8f), CR_X, ty - p.ascent(), p);

        p.setColor(DIVIDER);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(0.5f);
        canvas.drawLine(LM, y + SLOT_H, W - RM, y + SLOT_H, p);
        return y + SLOT_H;
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private String clipText(Paint p, String text, float maxWidth) {
        if (p.measureText(text) <= maxWidth) return text;
        int end = text.length();
        while (end > 0 && p.measureText(text.substring(0, end) + "\u2026") > maxWidth) {
            end--;
        }
        return text.substring(0, end) + "\u2026";
    }

    private List<DayGroup> groupByDay(List<SlotData> slots) {
        List<SlotData> sorted = new ArrayList<>(slots);
        Collections.sort(sorted, (a, b) -> a.start.compareTo(b.start));

        List<DayGroup> result = new ArrayList<>();
        Date currentDay = null;
        List<SlotData> currentSlots = new ArrayList<>();

        Calendar cal = Calendar.getInstance();
        for (SlotData slot : sorted) {
            cal.setTime(slot.start);
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            Date day = cal.getTime();

            if (currentDay == null || !currentDay.equals(day)) {
                if (currentDay != null) {
                    result.add(new DayGroup(currentDay, new ArrayList<>(currentSlots)));
                }
                currentDay = day;
                currentSlots = new ArrayList<>();
            }
            currentSlots.add(slot);
        }
        if (currentDay != null) {
            result.add(new DayGroup(currentDay, currentSlots));
        }
        return result;
    }

    private Date parseDate(String s) {
        String[][] formats = {
            {"yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXX", null},
            {"yyyy-MM-dd'T'HH:mm:ssXXX",        null},
            {"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",    "UTC"},
            {"yyyy-MM-dd'T'HH:mm:ss'Z'",         "UTC"},
        };
        for (String[] entry : formats) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(entry[0], Locale.ENGLISH);
                if (entry[1] != null) sdf.setTimeZone(TimeZone.getTimeZone(entry[1]));
                return sdf.parse(s);
            } catch (Exception ignored) {}
        }
        return null;
    }

    private String join(List<String> parts, String sep) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.size(); i++) {
            if (i > 0) sb.append(sep);
            sb.append(parts.get(i));
        }
        return sb.toString();
    }
}
