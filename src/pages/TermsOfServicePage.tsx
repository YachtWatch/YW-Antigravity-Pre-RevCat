import { FileText } from 'lucide-react';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Terms of Service</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Last Updated: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <div className="bg-muted p-6 rounded-lg mb-8 border border-border">
                        <p className="text-sm font-medium text-muted-foreground mb-0">
                            [Please paste your generated Terms of Service content here.]
                        </p>
                    </div>

                    <h2>1. Agreement to Terms</h2>
                    <p>By accessing or using the YachtWatch application, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>

                    <h2>2. Modifications to Terms</h2>
                    <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.</p>

                    <h2>3. User Accounts</h2>
                    <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>

                    <h2>4. Subscriptions and Payments</h2>
                    <p>Some parts of the Service are billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis (such as daily, weekly, monthly or annually), depending on the type of Subscription plan you select when purchasing the Subscription.</p>

                    <h2>5. Contact Us</h2>
                    <p>If you have any questions about these Terms, please contact us.</p>
                </div>
            </div>
        </div>
    );
}
