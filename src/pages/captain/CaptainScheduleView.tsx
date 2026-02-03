import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Card } from '../../components/ui/card';
import { Calendar, Clock, Users, Download } from 'lucide-react';
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

            <div ref={scheduleRef} className="bg-background">
                <Card className="schedule-meta-card p-4 md:p-6 shadow-md overflow-hidden bg-card text-card-foreground border dark:bg-[#1a1f2e] dark:text-white dark:border-none">
                    <div className="flex flex-col gap-5">
                        {/* Top Row: Title & Actions */}
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl md:text-2xl font-bold truncate capitalize leading-tight">
                                        {schedule.name || 'Current Schedule'}
                                    </h1>
                                    <span className="text-xs font-medium text-muted-foreground dark:text-gray-400 capitalize inline-block mt-0.5">
                                        {schedule.watchType || 'General'}
                                    </span>
                                </div>
                            </div>

                            <div className={cn("flex shrink-0 gap-2", printMode && "opacity-0 pointer-events-none absolute")}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isDownloading}
                                    className="h-8 gap-2 border-input bg-background hover:bg-accent hover:text-accent-foreground dark:bg-transparent dark:border-white/10 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5"
                                    onClick={handleDownloadPDF}
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="hidden md:inline">{isDownloading ? 'Downloading...' : 'PDF'}</span>
                                </Button>

                                <Button

                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-2 border-input bg-background hover:bg-accent hover:text-accent-foreground dark:bg-transparent dark:border-white/10 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5"
                                    onClick={() => navigate('/dashboard/captain/generate-schedule')}
                                >
                                    <img src="https://api.iconify.design/lucide:pencil.svg?color=%239ca3af" className="h-4 w-4" alt="Edit" />
                                    <span className="hidden md:inline">Edit Schedule</span>
                                    <span className="md:hidden">Edit</span>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-400/10"
                                    onClick={handleDelete}
                                    title="Delete Schedule"
                                >
                                    <span className="sr-only">Delete</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </Button>
                            </div>
                        </div>

                        {/* Middle Row: Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 border-t border-border dark:border-white/5 pt-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
                                    <Clock className="h-3 w-3" />
                                    <span>Duration</span>
                                </div>
                                <span className="text-lg font-medium">{watchDurationHours.toFixed(1)}h <span className="text-sm text-muted-foreground dark:text-gray-500 font-normal">watches</span></span>
                            </div>
                            <div className="flex flex-col gap-1 pl-4 border-l border-border dark:border-white/5">
                                <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
                                    <Users className="h-3 w-3" />
                                    <span>Crew ({schedule.crewPerWatch} / watch)</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {Array.from(new Set(schedule.slots.flatMap(s => s.crew.map(c => c.userName))))
                                        .sort()
                                        .map(name => (
                                            <span key={name} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                                {name}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row: View Toggle (Hidden in Print Mode) */}
                        {!printMode && (
                            <div className="flex items-center justify-between gap-4 pt-2">
                                <div className="flex items-center gap-3 w-full max-w-[200px] pl-1 pr-3 py-1.5 rounded-full border cursor-pointer transition-colors bg-secondary/50 border-input dark:bg-white/5 dark:border-white/5 hover:bg-secondary dark:hover:bg-white/10" onClick={() => setShowMyWatches(!showMyWatches)}>
                                    <Switch
                                        checked={showMyWatches}
                                        onCheckedChange={setShowMyWatches}
                                        className="scale-75 data-[state=checked]:bg-primary"
                                    />
                                    <span className={cn(
                                        "text-xs font-medium transition-colors",
                                        showMyWatches ? "text-primary" : "text-muted-foreground dark:text-gray-400"
                                    )}>
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
            </div>

            {/* Edit Slot Modal - Disabled for now */}
        </div>
    );
}
