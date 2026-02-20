import { Link } from 'react-router-dom';
import {
    Anchor,
    CalendarClock,
    Users,
    Smartphone,
    ShieldCheck,
    ArrowRight,
    Menu,
    X,
    Ship
} from 'lucide-react';
import { useTheme } from '../components/theme-provider';
import { Button } from '../components/ui/button';
import { useState } from 'react';

export default function LandingPage() {
    const { setTheme, theme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Navigation */}
            <nav className="border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#1E3A8A]/10 rounded-full">
                            <Anchor className="w-6 h-6 text-[#1E3A8A]" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-[#1E3A8A]">YachtWatch</span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="text-muted-foreground"
                        >
                            {theme === 'dark' ? 'Light' : 'Dark'} Mode
                        </Button>
                        <div className="flex items-center gap-2 ml-2">
                            <Link to="/auth/login">
                                <Button variant="ghost">Sign In</Button>
                            </Link>
                            <Link to="/auth/signup">
                                <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">Get Started</Button>
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </Button>
                        <button onClick={toggleMenu} className="text-foreground">
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-border p-4 bg-background space-y-4 animate-in slide-in-from-top-5">

                        <div className="grid gap-2 pt-4 border-t border-border">
                            <Link to="/auth/login" onClick={() => setIsMenuOpen(false)}>
                                <Button variant="ghost" className="w-full">Sign In</Button>
                            </Link>
                            <Link to="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                                <Button className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">Get Started</Button>
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <header className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center py-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/src/assets/hero-bg.jpg"
                        alt="Superyacht from above"
                        className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                </div>

                <div className="container mx-auto px-4 relative z-10 flex flex-col items-center justify-center -translate-y-2 text-center">

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] max-w-4xl mx-auto">
                        Intelligent Scheduling <br /> for Modern Crews
                    </h1>

                    <p className="text-xl md:text-2xl text-white max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                        Watch schedules. Done In Seconds.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-2">
                        <Link to="/auth/signup" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-[240px] h-14 px-8 text-lg gap-2 shadow-lg shadow-[#1E3A8A]/20 hover:shadow-[#1E3A8A]/40 transition-shadow bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
                                Start for Free <ArrowRight className="w-5 h-5" />
                            </Button>
                        </Link>
                        <p className="text-sm font-medium text-white/80 mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                            14 Day Trial — No Credit Card Required
                        </p>
                    </div>

                    {/* App Badges - Bottom Right */}
                    <div className="absolute -bottom-32 right-0 flex items-center gap-3">
                        <a href="#" className="hover:opacity-80 transition-opacity block">
                            <img src="/src/assets/app-store-badge.svg" alt="Download on the App Store" className="h-8 w-auto" />
                        </a>
                        <a href="#" className="hover:opacity-80 transition-opacity block">
                            <img src="/src/assets/google-play-badge.svg" alt="Get it on Google Play" className="h-8 w-auto" />
                        </a>
                    </div>
                </div>
            </header>



            {/* Main Features */}
            <section id="features" className="py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold mb-4">Built for Life at Sea</h2>
                        <p className="text-muted-foreground text-lg">Everything you need to manage your vessel's watch rotations efficiently, online or offline.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-6">
                                <CalendarClock className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
                            <p className="text-muted-foreground">Automated rotation generators create fair, conflict-free schedules in seconds.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center mb-6">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Mobile Companion</h3>
                            <p className="text-muted-foreground">Crew members carry their schedule in their pocket with our native mobile app.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center mb-6">
                                <Ship className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Vessel Management</h3>
                            <p className="text-muted-foreground">Manage multiple vessels, crew lists, and specialized roles from one dashboard.</p>
                        </div>

                        {/* Feature 4 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mb-6">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
                            <p className="text-muted-foreground">Secure permissions for Captains, Heads of Department, and Crew members.</p>
                        </div>

                        {/* Feature 5 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center mb-6">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Live Sync</h3>
                            <p className="text-muted-foreground">Changes made by the Captain are instantly reflected on all crew devices.</p>
                        </div>

                        {/* Feature 6 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg flex items-center justify-center mb-6">
                                <Anchor className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Yachting Standard</h3>
                            <p className="text-muted-foreground">Designed specifically for the unique workflows of the superyacht industry.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Split View: Captain vs Crew */}


            {/* CTA Bottom */}


            {/* Footer */}
            <footer className="py-12 border-t border-border bg-muted/20">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2 opacity-80">
                            <Anchor className="w-5 h-5" />
                            <span className="font-semibold">YachtWatch</span>
                        </div>
                        <div className="flex gap-8 text-sm text-muted-foreground">
                            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                            <a href="#" className="hover:text-foreground transition-colors">Support</a>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} YachtWatch. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
