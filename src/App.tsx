import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './components/ui/Toast';
import { NotificationListener } from './components/NotificationListener';
import { SubscriptionProvider } from './context/SubscriptionContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
// import ConnectionTestPage from './pages/ConnectionTestPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import CaptainDashboard from './pages/captain/CaptainDashboard';
import CrewDashboard from './pages/crew/CrewDashboard';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import DashboardIndex from './pages/DashboardIndex';
import ScheduleGeneratorWizard from './pages/captain/ScheduleGeneratorWizard';
import { ActiveWatchOverlay } from './components/ActiveWatchOverlay';
import DiagnosticsPage from './pages/DiagnosticsPage';
import SubscriptionPage from './pages/SubscriptionPage';

function App() {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            // Hide the splash screen when the app is mounted
            SplashScreen.hide();

            // Set a consistent status bar style
            StatusBar.setStyle({ style: Style.Dark });

            if (Capacitor.getPlatform() === 'ios') {
                StatusBar.setOverlaysWebView({ overlay: true });
                document.body.classList.add('platform-ios');
            }

            // Optional: Handle back button on Android
            // App.addListener('backButton', ({ canGoBack }) => {
            //     if(!canGoBack){
            //         App.exitApp();
            //     } else {
            //         window.history.back();
            //     }
            // });
        }
    }, []);

    return (
        <ThemeProvider defaultTheme="system" storageKey="yachtwatch-ui-theme">
            <ToastProvider>
                <DataProvider>
                    <AuthProvider>
                        <SubscriptionProvider>
                            <NotificationListener />
                            <div className="min-h-screen bg-background text-foreground font-sans antialiased">
                                <BrowserRouter>
                                    <Routes>
                                        {/* <Route path="/" element={<ConnectionTestPage />} /> */}
                                        <Route path="/" element={<LandingPage />} />

                                        <Route path="/auth">
                                            <Route path="login" element={<LoginPage />} />
                                            <Route path="signup" element={<SignupPage />} />
                                            <Route path="confirm" element={<div className="p-8 text-center">Please check your email to confirm your account.</div>} />
                                        </Route>

                                        {/* Generic Protected Routes (Any Authenticated User) */}
                                        <Route element={<ProtectedRoute />}>
                                            <Route path="/dashboard" element={<DashboardIndex />} />
                                            <Route path="/complete-profile" element={<CompleteProfilePage />} />
                                            <Route path="/profile" element={<ProfilePage />} />
                                            <Route path="/settings" element={<SettingsPage />} />
                                            <Route path="/diagnostics" element={<DiagnosticsPage />} />
                                            <Route path="/subscription" element={<SubscriptionPage />} />
                                        </Route>

                                        {/* Strict Role-Based Dashboards */}
                                        <Route element={<ProtectedRoute allowedRoles={['captain']} />}>
                                            <Route path="/dashboard/captain" element={<CaptainDashboard />} />
                                            <Route path="/dashboard/captain/generate-schedule" element={<ScheduleGeneratorWizard />} />
                                        </Route>

                                        <Route element={<ProtectedRoute allowedRoles={['crew']} />}>
                                            <Route path="/dashboard/crew" element={<CrewDashboard />} />
                                        </Route>

                                        {/* Fallback */}
                                        <Route path="*" element={<Navigate to="/" replace />} />
                                    </Routes>
                                    <ActiveWatchOverlay />
                                </BrowserRouter>
                            </div>
                        </SubscriptionProvider>
                    </AuthProvider>
                </DataProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
