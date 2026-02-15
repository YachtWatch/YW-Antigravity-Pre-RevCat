
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Purchases, PurchasesPackage, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface SubscriptionContextType {
    currentCustomerInfo: CustomerInfo | null;
    offerings: PurchasesPackage[];
    isSubscribed: boolean;
    purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentCustomerInfo, setCurrentCustomerInfo] = useState<CustomerInfo | null>(null);
    const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (Capacitor.getPlatform() === 'web') {
                console.log('RevenueCat is not supported on web. Mocking or skipping initialization.');
                setLoading(false);
                return;
            }

            try {
                if (Capacitor.getPlatform() === 'ios') {
                    await Purchases.configure({ apiKey: import.meta.env.VITE_REVENUECAT_API_KEY_IOS });
                } else if (Capacitor.getPlatform() === 'android') {
                    await Purchases.configure({ apiKey: import.meta.env.VITE_REVENUECAT_API_KEY_ANDROID });
                }

                await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

                // Purchases.getCustomerInfo() returns { customerInfo: ... }
                const { customerInfo } = await Purchases.getCustomerInfo();
                setCurrentCustomerInfo(customerInfo);
                updateSubscriptionStatus(customerInfo);

                const offerings = await Purchases.getOfferings();
                if (offerings.current && offerings.current.availablePackages.length !== 0) {
                    setOfferings(offerings.current.availablePackages);
                }
            } catch (error) {
                console.error('Error initializing RevenueCat', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const updateSubscriptionStatus = (customerInfo: CustomerInfo) => {
        // Replace 'pro' with your actual entitlement identifier
        // active is an object where keys are entitlement identifiers
        const isPro = customerInfo.entitlements.active['pro'] !== undefined;
        setIsSubscribed(isPro);
    };

    const purchasePackage = async (pkg: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
            setCurrentCustomerInfo(customerInfo);
            updateSubscriptionStatus(customerInfo);
        } catch (error: any) {
            if (!error.userCancelled) {
                console.error('Error purchasing package', error);
            }
        }
    };

    const restorePurchases = async () => {
        try {
            const { customerInfo } = await Purchases.restorePurchases();
            setCurrentCustomerInfo(customerInfo);
            updateSubscriptionStatus(customerInfo);
        } catch (error) {
            console.error('Error restoring purchases', error);
        }
    };

    return (
        <SubscriptionContext.Provider value={{ currentCustomerInfo, offerings, isSubscribed, purchasePackage, restorePurchases, loading }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
