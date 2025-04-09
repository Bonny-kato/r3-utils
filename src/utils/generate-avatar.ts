/**
 * Available avatar styles from DiceBear API
 * @see https://www.dicebear.com/styles
 */
export type AvatarStyle =
    | "adventurer"
    | "adventurer-neutral"
    | "avataaars"
    | "avataaars-neutral"
    | "big-ears"
    | "big-ears-neutral"
    | "big-smile"
    | "bottts"
    | "bottts-neutral"
    | "croodles"
    | "croodles-neutral"
    | "dylan"
    | "fun-emoji"
    | "glass"
    | "icons"
    | "initials"
    | "lorelei"
    | "lorelei-neutral"
    | "micah"
    | "miniavs"
    | "notionists"
    | "notionists-neutral"
    | "open-peeps"
    | "personas"
    | "pixel-art"
    | "pixel-art-neutral"
    | "rings"
    | "shapes"
    | "thumbs"
    | "identicon";

/**
 * Default background colors for avatars
 */
const DEFAULT_COLORS = ["0d47a1", "d1d4f9", "c0aede", "b6e3f4"];

/**
 * Configuration options for avatar generation
 */
export interface AvatarConfig {
    /**
     * The style of avatar to generate
     * @default "open-peeps"
     */
    style?: AvatarStyle;

    /**
     * Background colors in hex format (without #)
     * Will be used randomly for avatar backgrounds
     * @default ["0d47a1", "d1d4f9", "c0aede", "b6e3f4"]
     */
    backgroundColors?: string[];

    /**
     * API version to use
     * @default "9.x"
     */
    apiVersion?: string;

    /**
     * Additional query parameters to pass to the DiceBear API
     */
    additionalParams?: Record<string, string>;
}

/**
 * Generates a URL for an avatar image based on the given name and configuration.
 *
 * @param {string} name - The name to use as a seed for generating the avatar.
 * @param {AvatarConfig} config - Configuration options for the avatar.
 * @returns {string} A URL pointing to the generated avatar image.
 *
 * @example
 * // Basic usage with default style
 * const avatarUrl = generateAvatar("john.doe@example.com");
 *
 * @example
 * // Custom style and colors
 * const avatarUrl = generateAvatar("jane.smith", {
 *   style: "avataaars",
 *   backgroundColors: ["FF5733", "33FF57", "3357FF"]
 * });
 */
export const generateAvatar = (name: string, config: AvatarConfig = {}): string => {
    const {
        style = "open-peeps",
        backgroundColors = DEFAULT_COLORS,
        apiVersion = "9.x",
        additionalParams = {},
    } = config;

    const colorParam = backgroundColors.join(",");
    const baseUrl = `https://api.dicebear.com/${apiVersion}/${style}/svg`;

    const params = new URLSearchParams({
        backgroundColor: colorParam,
        seed: name,
        ...additionalParams,
    });

    return `${baseUrl}?${params.toString()}`;
};
