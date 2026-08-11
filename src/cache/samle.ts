import { HttpClient } from "~/http-client";
import { isAxiosError } from "axios";

const httpClient = new HttpClient({});

httpClient.onResponse(
    (response) => response,
    (error) => {
        console.error("Intercepted: Error occurred:", error);
        if (isAxiosError(error)) {
            console.log("[config]", error.config);
        }
        throw error;
    }
);

httpClient
    .get("https://jsonplaceholder.typicode.com/bonny/1")
    .then((response) => console.log("Response:", response))
    .catch((error) => console.error("Error occurred:", error));
