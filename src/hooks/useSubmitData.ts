import { SubmitOptions, useSubmit } from "react-router";

export type SubmitTarget =
    | HTMLFormElement
    | HTMLButtonElement
    | HTMLInputElement
    | FormData
    | URLSearchParams
    | null;

type UseSubmitData<T = unknown> = (data: T, options?: SubmitOptions) => void;

/**
 * A custom hook that returns a function to submit data.
 * The returned function takes data and optional submission options as arguments,
 * converts the data to a JSON string, and submits it using the specified
 * submission options.
 *
 * @typeparam T - The type of data being submitted.
 *
 * @returns {UseSubmitData<T>} - Function that submits the provided data
 *                               with specified options.
 * 
 * @example
 * // In a form component
 * interface UserFormData {
 *   name: string;
 *   email: string;
 *   role: string;
 * }
 * 
 * const UserForm = () => {
 *   const submitData = useSubmitData<UserFormData>();
 *   
 *   const handleSubmit = (event) => {
 *     event.preventDefault();
 *     
 *     const formData = {
 *       name: 'John Doe',
 *       email: 'john@example.com',
 *       role: 'admin'
 *     };
 *     
 *     // Submit the data with POST method
 *     submitData(formData, { 
 *       method: 'post',
 *       action: '/api/users'
 *     });
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       // Form fields would go here
 *       <button type="submit">Save User</button>
 *     </form>
 *   );
 * };
 */
export const useSubmitData = <T = unknown>(): UseSubmitData<T> => {
    const submit = useSubmit();

    return async (data: T, options?: SubmitOptions) => {
        await submit(data as never as SubmitTarget, {
            method: "post",
            encType: "application/json",
            viewTransition: true,
            ...options,
        });
    };
};
