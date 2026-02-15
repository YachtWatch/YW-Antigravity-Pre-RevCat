
import React from 'react';
import Paywall from '../components/Paywall';
import { useSubscription } from '../context/SubscriptionContext';
import { Button } from '../components/ui/button';

const SubscriptionPage: React.FC = () => {
    const { restorePurchases } = useSubscription();

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-4xl font-bold text-center mb-8">Premium Subscriptions</h1>
            <Paywall />
            <div className="mt-8 text-center">
                <Button variant="outline" onClick={() => restorePurchases()}>
                    Restore Purchases
                </Button>
            </div>
        </div>
    );
};

export default SubscriptionPage;
