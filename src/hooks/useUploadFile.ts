import { useCallback } from "react";
import { useFetcher } from "react-router";
import {
    ErrorType,
    TryCatchHttpReturnType,
} from "../http-client/try-catch-http";

/**
 * Result type returned by the useUploadFile hook
 */
type UseUploadFileResult<TData = unknown> = {
    /** The data returned from the server after successful upload */
    data: TData | null;
    /** Error object if the upload failed */
    error: ErrorType | null;
    /** Boolean indicating if an upload is in progress */
    isUploading: boolean;
    /** Function to trigger the file upload */
    uploadFile: (file: File) => void;
};

/**
 * Options for configuring the useUploadFile hook
 */
type UseUploadFileOptions = {
    /** The URL endpoint to upload the file to */
    action: string;
    /** The name of the file property in the FormData (defaults to "file") */
    filePropertyName?: string;
};

/**
 * A hook for handling file uploads with progress tracking and error handling.
 *
 * @template TData - The type of data expected to be returned from the server after upload
 * @param {UseUploadFileOptions} options - Configuration options for the upload
 * @returns {UseUploadFileResult<TData>} Object containing upload state and functions
 *
 * @example
 * // Basic usage
 * interface UploadResponse {
 *   fileUrl: string;
 *   fileId: string;
 * }
 *
 * const FileUploader = () => {
 *   const { uploadFile, isUploading, data, error } = useUploadFile<UploadResponse>({
 *     action: '/api/upload',
 *     filePropertyName: 'document'
 *   });
 *
 *   const handleFileChange = (event) => {
 *     const file = event.target.files[0];
 *     if (file) {
 *       uploadFile(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} disabled={isUploading} />
 *
 *       {isUploading && <p>Uploading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *       {data && <p>File uploaded! URL: {data.fileUrl}</p>}
 *     </div>
 *   );
 * };
 */
export const useUploadFile = <
    TData = unknown,
    TError extends ErrorType = ErrorType,
>({
    action,
    filePropertyName = "file",
}: UseUploadFileOptions): UseUploadFileResult<TData> => {
    const uploadFileFetcher =
        useFetcher<TryCatchHttpReturnType<TData, TError>>();
    const isUploading = uploadFileFetcher.state !== "idle";

    const uploadFile = useCallback(
        async (file: File) => {
            const formData = new FormData();
            formData.append(filePropertyName, file);

            await uploadFileFetcher.submit(formData, {
                method: "post",
                action,
                encType: "multipart/form-data",
            });
        },
        [uploadFileFetcher, filePropertyName, action]
    );

    const uploadFileData = uploadFileFetcher.data ?? [null, null];
    const [error, resultData] = uploadFileData;

    return {
        data: resultData,
        error,
        isUploading,
        uploadFile,
    };
};
