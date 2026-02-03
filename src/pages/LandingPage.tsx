import { Link } from 'react-router-dom';
import { Anchor } from 'lucide-react';
import { useTheme } from '../components/theme-provider';

export default function LandingPage() {
    const { setTheme, theme } = useTheme();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground transition-colors duration-300">
            <div className="max-w-4xl w-full text-center space-y-8">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <Anchor className="w-16 h-16 text-primary" />
                    </div>
                </div>

                <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-maritime-gradient">
                    YachtWatch
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    The intelligent crew management and watch scheduling platform for the modern superyacht industry.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                    <Link
                        to="/auth/login"
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
                    >
                        Sign In
                    </Link>
                    <Link
                        to="/auth/signup"
                        className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors w-full sm:w-auto"
                    >
                        Get Started
                    </Link>
                </div>

                <div className="pt-12">
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                    >
                        Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
                    </button>
                </div>
            </div>
        </div>
    );
}
