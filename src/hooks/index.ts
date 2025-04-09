// Import and re-export specific hooks and components for better tree shaking
import { useBreadcrumb } from "./useBreadcrumb";
import { useDebounce } from "./useDebounce";
import { useEventListener } from "./useEventListener";
import { useIsPathActive } from "./useIsPathActive";
import { useHandleSelectAllItems, useHandleSelectItem } from "./useItemSelection";
import { useLocationState } from "./useLocationState";
import { LinkWithQueryParams, useNavigateWithQueryParams } from "./useNavigateWithQueryParams";
import { useNavigationState } from "./useNavigationState";
import { useScroll } from "./useScroll";
import { useSearchParamsState } from "./useSearchParamsState";
import { useSubmitData } from "./useSubmitData";
import { useUploadFile } from "./useUploadFile";

// Re-export all hooks and components
export {
    // Event handling
    useEventListener,

    // Navigation and routing
    useBreadcrumb,
    useIsPathActive,
    useLocationState,
    useNavigateWithQueryParams,
    LinkWithQueryParams,
    useNavigationState,

    // UI and interaction
    useDebounce,
    useScroll,
    useSearchParamsState,

    // Data handling
    useHandleSelectAllItems,
    useHandleSelectItem,
    useSubmitData,
    useUploadFile,
};
