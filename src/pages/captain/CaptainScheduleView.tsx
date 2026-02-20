import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Card } from '../../components/ui/card';
import { Clock, Users, Download } from 'lucide-react';
import { WatchSchedule, JoinRequest } from '../../contexts/DataContext';
import { ScheduleMatrixView } from '../../components/ScheduleMatrixView';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { NoScheduleState } from '../../components/NoScheduleState';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

interface CaptainScheduleViewProps {
    schedule: WatchSchedule | null | undefined;
    approvedCrew: JoinRequest[];
    vessel: any;
    onGenerateSchedule: (options: any) => void;
    onUpdateScheduleSettings: (vesselId: string, settings: any) => void;
    onUpdateSlot: (vesselId: string, slotId: number, crewIds: string[]) => void;
    onClearSchedule: () => void;
}

export function CaptainScheduleView({
    schedule,
    // approvedCrew, // Unused while modal is disabled
    // vessel,
    // onUpdateScheduleSettings,
    // onUpdateSlot, // Unused while modal is disabled
    onClearSchedule
}: CaptainScheduleViewProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showMyWatches, setShowMyWatches] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [printMode, setPrintMode] = useState(false);
    const scheduleRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = async () => {
        if (!scheduleRef.current || !schedule) return;
        setIsDownloading(true);
        setPrintMode(true);

        // Wait for render to update with printMode=true (expanded slots)
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            // const pdfHeight = pdf.internal.pageSize.getHeight(); // Unused

            // 0. Capture Meta Card (Title, Duration, Crew)
            const metaEl = scheduleRef.current.querySelector('.schedule-meta-card') as HTMLElement;
            let metaHeightOnPdf = 0;
            let metaImgData = '';

            if (metaEl) {
                const metaCanvas = await html2canvas(metaEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' } as any);
                metaImgData = metaCanvas.toDataURL('image/png');
                const metaAspectRatio = metaCanvas.height / metaCanvas.width;
                metaHeightOnPdf = pdfWidth * metaAspectRatio;
            }

            // 1. Capture Header
            const headerEl = scheduleRef.current.querySelector('.schedule-header-row') as HTMLElement;
            let headerHeightOnPdf = 0;
            let headerImgData = '';

            if (headerEl) {
                const headerCanvas = await html2canvas(headerEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' } as any);
                headerImgData = headerCanvas.toDataURL('image/png');
                const headerAspectRatio = headerCanvas.height / headerCanvas.width;
                headerHeightOnPdf = pdfWidth * headerAspectRatio;
            }

            // 2. Capture Each Day
            const dayElements = Array.from(scheduleRef.current.querySelectorAll('.schedule-day-group')) as HTMLElement[];

            for (let i = 0; i < dayElements.length; i++) {
                const dayEl = dayElements[i];
                if (i > 0) pdf.addPage();

                let currentY = 0;

                // Add Meta (Title/Stats) to each page
                if (metaImgData) {
                    pdf.addImage(metaImgData, 'PNG', 0, currentY, pdfWidth, metaHeightOnPdf);
                    currentY += metaHeightOnPdf;
                }

                // Add Column Headers to each page
                if (headerImgData) {
                    // Add a small gap or overlap fix if needed
                    pdf.addImage(headerImgData, 'PNG', 0, currentY, pdfWidth, headerHeightOnPdf);
                    currentY += headerHeightOnPdf;
                }

                const dayCanvas = await html2canvas(dayEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' } as any);
                const dayImgData = dayCanvas.toDataURL('image/png');
                const dayAspectRatio = dayCanvas.height / dayCanvas.width;
                const dayHeightOnPdf = pdfWidth * dayAspectRatio;

                pdf.addImage(dayImgData, 'PNG', 0, currentY, pdfWidth, dayHeightOnPdf);
            }

            pdf.save(`WatchSchedule_${schedule.name.replace(/\s+/g, '_')}.pdf`);

        } catch (error) {
            console.error("Failed to generate PDF", error);
            alert("Failed to generate PDF");
        } finally {
            setPrintMode(false);
            setIsDownloading(false);
        }
    };

    // Logic for editing slots is currently disabled to simplify build
    // const [editingSlot, setEditingSlot] = useState<any>(null);


    if (!schedule) {
        return (
            <div className="py-8">
                <NoScheduleState onCreateSchedule={() => navigate('/dashboard/captain/generate-schedule')} />
            </div>
        );
    }

    // Calculate generic watch duration from the first slot (approximate)
    const firstSlot = schedule.slots[0];
    const watchDurationHours = firstSlot
        ? (new Date(firstSlot.end).getTime() - new Date(firstSlot.start).getTime()) / (1000 * 60 * 60)
        : 0;

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        onClearSchedule();
        setShowDeleteConfirm(false);
    };

    return (
        <div className="space-y-6 relative">
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-[320px] shadow-xl border-destructive/20 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg">Delete Schedule?</h3>
                                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={confirmDelete}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <div ref={scheduleRef} className="bg-background space-y-6">
                <Card className="schedule-meta-card p-5 shadow-sm bg-card text-card-foreground border dark:bg-[#1a1f2e] dark:text-white dark:border-none">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            {/* Left: Type & Title */}
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-left">
                                    {schedule.watchType === 'anchor' ? 'Anchor Watch' : 'Navigation'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-bold text-foreground leading-tight tracking-tight">
                                        {schedule.name || 'Current Schedule'}
                                    </h1>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <span className="text-green-600 font-bold text-[10px] uppercase tracking-wider">Active</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className={cn("flex items-center gap-2", printMode && "opacity-0 pointer-events-none absolute right-0 top-0")}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 gap-2 text-foreground font-medium"
                                    onClick={() => navigate('/dashboard/captain/generate-schedule', { state: { schedule } })}
                                >
                                    <img src="https://api.iconify.design/lucide:pencil.svg?color=%2364748b" className="h-3.5 w-3.5" alt="" />
                                    <span>Edit</span>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={handleDelete}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isDownloading}
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={handleDownloadPDF}
                                    title="Download PDF"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border/40 w-full" />

                        {/* Row 2: Stats Grid */}
                        <div className="flex items-start gap-8">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Duration</span>
                                </div>
                                <div className="text-lg font-semibold text-foreground">
                                    {watchDurationHours.toFixed(1)}h <span className="text-sm font-normal text-muted-foreground">watches</span>
                                </div>
                            </div>

                            <div className="w-px self-stretch bg-border/40" />

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                    <Users className="h-3.5 w-3.5" />
                                    <span>Crew</span>
                                </div>
                                <div className="text-lg font-semibold text-foreground">
                                    {schedule.crewPerWatch ? schedule.crewPerWatch : '-'} <span className="text-sm font-normal text-muted-foreground">per watch</span>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Toggle */}
                        {!printMode && (
                            <div>
                                <div className="inline-flex items-center gap-3 px-1.5 pr-4 py-1.5 rounded-full border bg-background hover:bg-accent/50 transition-colors cursor-pointer w-auto" onClick={() => setShowMyWatches(!showMyWatches)}>
                                    <Switch
                                        checked={showMyWatches}
                                        onCheckedChange={setShowMyWatches}
                                        className="scale-90 data-[state=checked]:bg-primary"
                                    />
                                    <span className="text-sm text-muted-foreground font-medium select-none">
                                        My Watch Only
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="min-h-[300px]">
                    <ScheduleMatrixView
                        schedule={schedule}
                        currentUserId={user?.id}
                        showOnlyUserId={showMyWatches ? user?.id : undefined}
                        printMode={printMode}
                    />
                </div>
            </div >

            {/* Edit Slot Modal - Disabled for now */}
        </div >
    );
}
