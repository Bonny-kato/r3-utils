import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

/**
 * Function to transform a date string into a human-readable duration
 * @param dateStr - The date string to transform
 * @returns Human-readable duration string
 */
export const getDurationFromNow = (dateStr: string): string => {
    // Extend dayjs with relativeTime plugin inside the function to avoid side effects
    dayjs.extend(relativeTime);

    const now = dayjs();
    const targetDate = dayjs(dateStr);

    if (!targetDate.isValid()) {
        throw new Error("Invalid date string");
    }

    return now.to(targetDate);
};
