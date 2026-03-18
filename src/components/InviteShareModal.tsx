import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface InviteShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** The vessel join code. Include it for captains; omit for crew-only share. */
    joinCode?: string | null;
}

const APP_LINK = 'https://yachtwatch.app';

export function InviteShareModal({ isOpen, onClose, joinCode }: InviteShareModalProps) {
    const [copied, setCopied] = useState(false);

    const inviteLink = joinCode ? `${APP_LINK}/join/${joinCode}` : APP_LINK;

    const whatsappMessage = joinCode
        ? `Hey! Join me on YachtWatch 🛥️ Use code ${joinCode} to join the vessel. Download here: ${APP_LINK}`
        : `Hey! I'm using YachtWatch to manage our watch schedule 🛥️ Download here: ${APP_LINK}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
        } catch {
            // Fallback for environments without clipboard API
            const el = document.createElement('textarea');
            el.value = inviteLink;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
    };

    return (
        // Keep mounted so the slide-out animation plays on close.
        <div
            aria-modal="true"
            role="dialog"
            className={cn(
                'fixed inset-0 z-50 transition-opacity duration-300',
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
        >
            {/* Dimmed overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Bottom sheet */}
            <div
                className={cn(
                    'absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out',
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                )}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
                </div>

                <div className="px-6 pb-10">
                    {/* Header */}
                    <div className="flex items-start justify-between pt-4 pb-6">
                        <div>
                            <h2 className="text-xl font-bold text-[#1B2A6B]">Invite your crew</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Share YachtWatch with your crew members
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3">
                        <Button
                            variant="outline"
                            className="w-full h-12 gap-3 justify-start border-[#1B2A6B] text-[#1B2A6B] hover:bg-[#1B2A6B]/5 font-semibold text-sm"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 shrink-0" />
                                    ✓ Link Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 shrink-0" />
                                    📋 Copy Invite Link
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full h-12 gap-3 justify-start border-[#1B2A6B] text-[#1B2A6B] hover:bg-[#1B2A6B]/5 font-semibold text-sm"
                            onClick={handleWhatsApp}
                        >
                            <span className="text-base leading-none shrink-0">💬</span>
                            Share via WhatsApp
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
