import { useNavigation } from "react-router";

/**
 * A hook that provides enhanced navigation state information from react-router.
 *
 * This hook wraps the {@link useNavigation} hook from react-router and provides additional
 * derived state properties for easier consumption in components.

 * @example
 * ```tsx
 * const { isSubmitting, isLoading, isBusy, formData } = useNavigationState<MyFormData>();
 *
 * return (
 *   <div>
 *     {isBusy && <LoadingSpinner />}
 *     {!isBusy && <div>Content loaded</div>}
 *   </div>
 * );
 * ```
 */

export interface NavigationState<T = unknown> {
    /** The JSON data from the navigation */
    formData: T | undefined;
    /** The HTTP method used for the form submission GET,POST, DELETE, PUT */
    requestMethod: string | undefined;
    /** Whether the navigation state is "submitting" */
    isSubmitting: boolean;
    /** Whether the navigation state is "loading" */
    isLoading: boolean;
    /** Whether the navigation state is not "idle" */
    isBusy: boolean;
    /** The pathname of the location being navigated to */
    headingLocation: string | undefined;
}

export const useNavigationState = <T = unknown>(): NavigationState<T> => {
    const navigation = useNavigation();

    const isSubmitting = navigation.state === "submitting";
    const isLoading = navigation.state === "loading";
    return {
        formData: navigation.json as T | undefined,
        requestMethod: navigation.formMethod,
        isSubmitting,
        isLoading,
        isBusy: navigation.state !== "idle",
        headingLocation: navigation.location?.pathname,
    };
};
