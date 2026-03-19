// ─── Watch Schedule PDF Generator ─────────────────────────────────────────────
// Built with jsPDF + jspdf-autotable (A4 landscape, matrix layout)

import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface PDFExportOptions {
    fileName:     string;
    scheduleName: string;
    watchType:    string;
    crewPerWatch: number;
    vesselName:   string;
    vesselType:   string;
    slots: Array<{
        start: string;
        end:   string;
        crew:  Array<{ firstName: string; lastName: string }>;
    }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hhmm(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function base64ToBlob(b64: string, mime: string): Blob {
    const bytes = atob(b64);
    const arr   = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

// ─── PDF generation ───────────────────────────────────────────────────────────

function buildPDF(opts: PDFExportOptions): string {

    // ── Document ──────────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W   = 841.89;   // A4 landscape width  (pt)
    const ML  = 32;       // left  margin
    const MR  = 32;       // right margin
    const TW  = W - ML - MR;  // total usable table width  (777.89 pt)

    // ── Palette ───────────────────────────────────────────────────────────────
    const NAVY    : [number,number,number] = [27,  42,  107];
    const GREY    : [number,number,number] = [107, 114, 128];
    const LG      : [number,number,number] = [229, 231, 235];   // light-grey border
    const BLUE_BG : [number,number,number] = [219, 234, 254];   // #DBEAFE watch block
    const TINT    : [number,number,number] = [237, 241, 250];   // day-header bg
    const HDR_BG  : [number,number,number] = [248, 249, 250];   // column-header row bg
    const WHITE   : [number,number,number] = [255, 255, 255];
    const GREEN   : [number,number,number] = [34,  197, 94];
    const GREEN_T : [number,number,number] = [22,  163, 74];

    // ── Table column geometry ─────────────────────────────────────────────────
    const TIME_W = 68;    // time column width

    // ── Collect unique crew (insertion order) ─────────────────────────────────
    const crewKeys : string[] = [];   // "First|||Last" stable ID
    const crewLabel: string[] = [];   // display first name

    for (const slot of opts.slots) {
        for (const c of slot.crew) {
            const key = `${c.firstName}|||${c.lastName}`;
            if (!crewKeys.includes(key)) {
                crewKeys.push(key);
                crewLabel.push(c.firstName?.trim() || '?');
            }
        }
    }

    const NUM_CREW = Math.max(crewKeys.length, 1);
    const CREW_W   = (TW - TIME_W) / NUM_CREW;

    // ── Group slots by calendar day ───────────────────────────────────────────
    interface DayGroup { label: string; slots: typeof opts.slots }
    const days: DayGroup[] = [];

    for (const slot of opts.slots) {
        const label = new Date(slot.start)
            .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
        const g = days.find(d => d.label === label);
        if (g) g.slots.push(slot);
        else   days.push({ label, slots: [slot] });
    }

    // ── Page-header drawing (every page) ──────────────────────────────────────
    // Fixed coords — always drawn at the very top of whichever page is current.
    const HDR_BOTTOM = 38;   // y of the navy rule
    const CONTENT_Y  = HDR_BOTTOM + 10;  // first content Y on continuation pages

    function drawPageHeader() {
        // Logo circle
        doc.setFillColor(...NAVY);
        doc.circle(ML + 9, 20, 8, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('YW', ML + 5.6, 22.5);
        // Title
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.text('YachtWatch', ML + 22, 22);
        // Navy rule
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(0.75);
        doc.line(ML, HDR_BOTTOM, W - MR, HDR_BOTTOM);
    }

    // ── Page 1: header + navigation card ──────────────────────────────────────
    drawPageHeader();
    let curY = CONTENT_Y + 2;

    // Schedule name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(opts.scheduleName, ML, curY);

    // Active badge
    const nameW = doc.getTextWidth(opts.scheduleName);
    doc.setFillColor(...GREEN);
    doc.circle(ML + nameW + 13, curY - 5, 3.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREEN_T);
    doc.text('ACTIVE', ML + nameW + 20, curY - 1.5);

    curY += 14;

    // Duration · crew count
    const fs = opts.slots[0];
    const durH = fs
        ? (new Date(fs.end).getTime() - new Date(fs.start).getTime()) / 3_600_000
        : 0;
    const durStr = Number.isInteger(durH) ? `${durH}h` : `${durH.toFixed(1)}h`;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    doc.text(`${durStr} watches  ·  ${opts.crewPerWatch} per watch`, ML, curY);

    curY += 15;
    doc.setDrawColor(...LG);
    doc.setLineWidth(0.5);
    doc.line(ML, curY, W - MR, curY);
    curY += 12;

    // ── Render one table per day group ────────────────────────────────────────
    for (const day of days) {

        // Pre-compute on-watch matrix for this day's slots
        // onWatch[slotIdx][crewIdx] = true if that crew member is on watch
        const onWatch = day.slots.map(slot =>
            crewKeys.map(key => slot.crew.some(
                c => `${c.firstName}|||${c.lastName}` === key
            ))
        );

        // Pre-compute time strings for each slot
        const times = day.slots.map(slot => ({
            start: hhmm(slot.start),
            end:   hhmm(slot.end),
        }));

        // ── Build autoTable head + body ────────────────────────────────────
        // head: column labels
        const head = [['Time', ...crewLabel]];

        // body row 0: day header spanning all columns
        const DAY_HDR_CELL = {
            content: day.label,
            colSpan: crewKeys.length + 1,
            styles: {
                fillColor: TINT,
                textColor: NAVY,
                fontStyle: 'bold' as const,
                fontSize: 9.5,
                // left padding leaves room for the navy accent bar (drawn in didDrawCell)
                cellPadding: { top: 6, bottom: 6, left: 16, right: 8 },
                halign: 'left' as const,
                valign: 'middle' as const,
                lineColor: LG,
                lineWidth: 0.5,
            },
        };

        // body rows 1..N: one row per slot (all empty — drawn in didDrawCell)
        const slotRows = day.slots.map(() => ['', ...crewKeys.map(() => '')]);

        const body = [
            [DAY_HDR_CELL],
            ...slotRows,
        ];

        // ── Column styles ──────────────────────────────────────────────────
        const colStyles: Record<number, object> = {
            0: { cellWidth: TIME_W, halign: 'center', valign: 'middle', cellPadding: 2 },
        };
        for (let i = 0; i < crewKeys.length; i++) {
            colStyles[i + 1] = { cellWidth: CREW_W, halign: 'center', valign: 'middle', cellPadding: 2 };
        }

        // ── autoTable call ─────────────────────────────────────────────────
        autoTable(doc, {
            startY: curY,
            head,
            body,
            tableWidth: TW,
            margin: { left: ML, right: MR, top: CONTENT_Y },

            columnStyles: colStyles,

            headStyles: {
                fillColor: HDR_BG,
                textColor: GREY,
                fontStyle:  'bold',
                fontSize:   7.5,
                halign:    'center',
                valign:    'middle',
                lineColor:  LG,
                lineWidth:  0.5,
                minCellHeight: 22,
            },

            bodyStyles: {
                fillColor: WHITE,
                textColor: [30, 30, 30],
                lineColor: LG,
                lineWidth: 0.5,
                minCellHeight: 38,
                valign: 'middle',
                halign: 'center',
            },

            // ── Suppress default text for all slot rows ──────────────────
            willDrawCell(data) {
                // Row 0 = day-header (let autoTable draw the label text).
                // Rows 1+ = slot rows — we draw everything in didDrawCell.
                if (data.section === 'body' && data.row.index > 0) {
                    data.cell.text = [];
                }
            },

            // ── Custom cell rendering ────────────────────────────────────
            didDrawCell(data) {
                if (data.section !== 'body') return;

                const { x, y, width, height } = data.cell;

                if (data.row.index === 0) {
                    // Day header: draw navy left-accent bar
                    doc.setFillColor(...NAVY);
                    doc.rect(x, y, 3.5, height, 'F');

                } else {
                    const si = data.row.index - 1;   // slot index

                    if (data.column.index === 0) {
                        // ── Time cell: start (bold navy) / end (grey) ────
                        const t = times[si];
                        if (!t) return;

                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(...NAVY);
                        doc.text(t.start, x + width / 2, y + height * 0.38, { align: 'center' });

                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(...GREY);
                        doc.text(t.end, x + width / 2, y + height * 0.65, { align: 'center' });

                    } else {
                        // ── Crew cell: blue rounded block if on watch ────
                        const ci = data.column.index - 1;
                        if (onWatch[si]?.[ci]) {
                            const p = 4;
                            doc.setFillColor(...BLUE_BG);
                            doc.setDrawColor(...NAVY);
                            doc.setLineWidth(0.75);
                            doc.roundedRect(
                                x + p, y + p,
                                width - p * 2, height - p * 2,
                                5, 5, 'FD'
                            );
                        }
                    }
                }
            },

            // ── Draw page header on every continuation page ──────────────
            didDrawPage(data) {
                if (data.pageNumber > 1) {
                    drawPageHeader();
                }
            },
        });

        curY = (doc as any).lastAutoTable.finalY + 14;
    }

    // Return raw base64 (no data-URI prefix)
    return doc.output('datauristring').split(',')[1];
}

// ─── PrintService ─────────────────────────────────────────────────────────────

export const PrintService = {
    async sharePDF(options: PDFExportOptions): Promise<void> {
        console.log('[PrintService] generating PDF …', { slots: options.slots.length });

        const pdfBase64 = buildPDF(options);

        console.log('[PrintService] PDF ready, bytes (base64):', pdfBase64.length);

        const platform = Capacitor.getPlatform();

        if (platform === 'ios' || platform === 'android') {
            const file = await Filesystem.writeFile({
                path:      options.fileName,
                data:      pdfBase64,
                directory: Directory.Cache,
            });
            await Share.share({
                title:       options.scheduleName,
                url:         file.uri,
                dialogTitle: 'Save or Share Watch Schedule',
            });
        } else {
            // Web — trigger browser download
            const blob = base64ToBlob(pdfBase64, 'application/pdf');
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = options.fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    },
};
