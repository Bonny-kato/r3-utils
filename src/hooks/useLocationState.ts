import { useLocation } from "react-router";

/**
 * Retrieves the state from the current URL location.
 * This hook provides type-safe access to the state that was passed during navigation.
 * 
 * @template TData - The type of data expected to be returned.
 * @returns {TData | undefined} - The state from the current URL location, or `undefined` if not found.
 * 
 * @example
 * // Define a type for your location state
 * interface UserLocationState {
 *   userId: string;
 *   returnTo?: string;
 * }
 * 
 * // In a component
 * const Component = () => {
 *   // Get typed location state
 *   const locationState = useLocationState<UserLocationState>();
 *   
 *   if (locationState?.userId) {
 *     // Access the userId that was passed during navigation
 *     console.log(`User ID from location state: ${locationState.userId}`);
 *   }
 *   
 *   return <div>User Profile</div>;
 * };
 * 
 * // In another component, when navigating:
 * // navigate('/user-profile', { state: { userId: '123', returnTo: '/dashboard' } });
 */
export const useLocationState = <TData = unknown>(): TData | undefined => {
    const location = useLocation();
    return location?.state as TData | undefined;
};
