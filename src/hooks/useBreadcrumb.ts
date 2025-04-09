import { UIMatch, useMatches } from "react-router";

/**
 * Interface representing a breadcrumb item
 */
interface Breadcrumb {
    /** The name of the route segment */
    route: string;
    /** The URL path for the breadcrumb */
    link: string;
    /** Unique identifier for the breadcrumb */
    routeId: string;
}

/**
 * A custom hook that generates breadcrumb navigation based on the current route path.
 * It splits the current pathname into segments and creates a breadcrumb for each segment.
 * 
 * @returns {Breadcrumb[]} An array of breadcrumb objects containing route name, link, and ID
 * 
 * @example
 * // In a component
 * const breadcrumbs = useBreadcrumb();
 * 
 * // Render breadcrumbs
 * return (
 *   <nav>
 *     {breadcrumbs.map((crumb) => (
 *       <Link key={crumb.routeId} to={crumb.link}>
 *         {crumb.route}
 *       </Link>
 *     ))}
 *   </nav>
 * );
 */
export const useBreadcrumb = (): Breadcrumb[] => {
    const matches = useMatches();
    const currentRoute = matches.at(-1) as UIMatch;

    const routeArray = currentRoute.pathname.split("/").filter(Boolean);
    return routeArray.map((route, index) => {
        const link = `/${routeArray.slice(0, index + 1).join("/")}`;

        return {
            route,
            link,
            routeId: `${link}-${route}`,
        };
    });
};
