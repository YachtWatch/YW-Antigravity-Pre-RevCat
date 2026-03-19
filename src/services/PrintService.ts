import { registerPlugin, Capacitor } from '@capacitor/core';

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

interface PrintPluginInterface {
    sharePDF(options: PDFExportOptions): Promise<void>;
}

const NativePrintPlugin = registerPlugin<PrintPluginInterface>('PrintPlugin');

export const PrintService = {
    /**
     * On iOS: generates a native CoreGraphics PDF from the schedule data
     * and presents UIActivityViewController (Save to Files, Mail, AirDrop…).
     * On web: falls back to window.print().
     */
    async sharePDF(options: PDFExportOptions): Promise<void> {
        if (Capacitor.isNativePlatform()) {
            try {
                await NativePrintPlugin.sharePDF(options);
                return;
            } catch {
                // Plugin unavailable — fall through to window.print()
            }
        }
        window.print();
    },
};
