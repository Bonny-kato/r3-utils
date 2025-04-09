/**
 * Async function to extract form data from a request and return it as a typed object.
 *
 * @template T - The expected type of the form data object.
 * @param {Request} request - The HTTP request object containing form data.
 * @returns {Promise<T>} - A promise that resolves to the form data object of the specified type.
 */
export const getRequestFormData = async <T>(request: Request): Promise<T> => {
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("multipart/form-data")) {
        return Object.fromEntries(await request.formData()) as T;
    }
    const formData = await request.json();
    return formData as T;
};
