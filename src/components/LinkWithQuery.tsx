import React from 'react';
import { Link, LinkProps, useLocation } from 'react-router';

/**
 * Props for the LinkWithQuery component.
 */
export interface LinkWithQueryProps extends Omit<LinkProps, 'to'> {
  /**
   * The destination path for the link.
   * Can be a string or a location object.
   */
  to: LinkProps['to'];

  /**
   * Whether to preserve the current query parameters.
   * @default true
   */
  preserveQuery?: boolean;
}

/**
 * A Link component that preserves the current query parameters by default.
 * 
 * @example
 * ```tsx
 * // Basic usage - preserves current query params
 * <LinkWithQuery to="/products">Products</LinkWithQuery>
 * 
 * // Disable query preservation
 * <LinkWithQuery to="/products" preserveQuery={false}>Products</LinkWithQuery>
 * 
 * // Works with location objects too
 * <LinkWithQuery to={{ pathname: '/products', hash: 'top' }}>Products</LinkWithQuery>
 * ```
 */
export const LinkWithQuery: React.FC<LinkWithQueryProps> = ({
  to,
  preserveQuery = true,
  ...rest
}) => {
  const location = useLocation();

  // If preserveQuery is false or 'to' is not an object, use 'to' as is
  if (!preserveQuery || typeof to !== 'object') {
    return <Link to={to} {...rest} />;
  }

  // Merge the current search params with the destination
  const destination = {
    ...to,
    search: location.search && !to.search ? location.search : to.search,
  };

  return <Link to={destination} {...rest} />;
};
