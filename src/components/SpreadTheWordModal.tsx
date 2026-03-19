import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import whatsappLogo from '../../assets/whatsapp-logo.png';

interface SpreadTheWordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const APP_LINK = 'https://yachtwatch.app';

const WHATSAPP_MESSAGE =
    `Hey! I've been using YachtWatch to manage watches and crew onboard — it's a game changer 🛥️ Check it out: ${APP_LINK}`;

export function SpreadTheWordModal({ isOpen, onClose }: SpreadTheWordModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(APP_LINK);
        } catch {
            const el = document.createElement('textarea');
            el.value = APP_LINK;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ text: WHATSAPP_MESSAGE });
            } catch {
                // User cancelled — no action needed
            }
        } else {
            await handleCopy();
        }
    };

    const handleWhatsApp = () => {
        const waScheme = `whatsapp://send?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
        let appOpened = false;

        const onBlur = () => { appOpened = true; };
        window.addEventListener('blur', onBlur);

        window.location.href = waScheme;

        setTimeout(() => {
            window.removeEventListener('blur', onBlur);
            if (!appOpened) {
                handleNativeShare();
            }
        }, 1500);
    };

    return (
        <div
            aria-modal="true"
            role="dialog"
            className={cn(
                // z-[90] keeps this below the tab bar (z-[100]) so the tab bar
                // renders naturally on top — no gap, no CSS calc needed.
                'fixed inset-0 z-[90] transition-opacity duration-300',
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
        >
            {/* Dimmed overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Bottom sheet — extends to screen bottom; tab bar covers the bottom strip */}
            <div
                className={cn(
                    'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out',
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                )}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
                </div>

                {/* Content — padding clears the tab bar (64px) + safe area + 8px gap */}
                <div className="px-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 76px)' }}>
                    {/* Header */}
                    <div className="flex items-start justify-between pt-4 pb-6">
                        <div>
                            <h2 className="text-xl font-bold text-[#1B2A6B]">Spread the word</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Know someone who'd love YachtWatch?
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
                                    ✓ Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 shrink-0" />
                                    Copy Invite Link
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full h-12 gap-3 justify-start border-[#1B2A6B] text-[#1B2A6B] hover:bg-[#1B2A6B]/5 font-semibold text-sm"
                            onClick={handleWhatsApp}
                        >
                            <img src={whatsappLogo} alt="WhatsApp" className="h-5 w-5 shrink-0" style={{ imageRendering: 'auto' }} />
                            Share via WhatsApp
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
