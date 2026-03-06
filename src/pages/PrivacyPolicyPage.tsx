import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Privacy Policy</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Last Updated: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p>
                        YachtWatch ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the YachtWatch mobile application and associated services (collectively, the "App").
                    </p>

                    <h2>1. Information We Collect</h2>
                    <p>We may collect information about you in a variety of ways. The information we may collect via the App includes:</p>
                    <ul>
                        <li><strong>Personal Data:</strong> Demographic and other personally identifiable information (such as your name, email address, nationality, date of birth, and passport number) that you voluntarily give to us when choosing to participate in various activities related to the App.</li>
                        <li><strong>Vessel Data:</strong> Information regarding boats you captain or crew on, including vessel name, type, and watch schedules.</li>
                        <li><strong>Device Data:</strong> Information our servers automatically collect when you access the App, such as your native actions that are integral to the App, as well as your device type and OS version.</li>
                        <li><strong>Push Notifications:</strong> We may request to send you push notifications regarding your account or the App. If you wish to opt-out from receiving these types of communications, you may turn them off in your device's settings.</li>
                    </ul>

                    <h2>2. How We Use Your Information</h2>
                    <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the App to:</p>
                    <ul>
                        <li>Create and manage your account.</li>
                        <li>Facilitate vessel management and crew scheduling.</li>
                        <li>Email you regarding your account or order.</li>
                        <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.</li>
                        <li>Deliver targeted advertising, coupons, newsletters, and other information regarding promotions and the App to you (if you have opted-in).</li>
                    </ul>

                    <h2>3. Disclosure of Your Information</h2>
                    <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
                    <ul>
                        <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
                        <li><strong>Between Captains and Crew:</strong> Limited profile information (such as your name, role, and schedule preferences) is shared with the Captain and other crew members of a vessel you join to facilitate operations. Core identifying numbers (like Passport Number) are strictly restricted and secured.</li>
                        <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing (e.g., Apple, Google, RevenueCat), data analysis, email delivery, hosting services (e.g., Supabase), customer service, and marketing assistance.</li>
                    </ul>

                    <h2>4. Security of Your Information</h2>
                    <p>We use administrative, technical, and physical security measures (including Row Level Security in our databases) to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>

                    <h2>5. Contact Us</h2>
                    <p>If you have questions or comments about this Privacy Policy, please contact us at: [Insert Contact Email Here]</p>
                </div>
            </div>
        </div>
    );
}
