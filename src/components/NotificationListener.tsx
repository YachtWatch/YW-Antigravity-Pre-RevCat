import { useNotifications } from "../hooks/useNotifications";

export function NotificationListener() {
    useNotifications();
    return null;
}
