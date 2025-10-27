/**
 * An asynchronous function that simulates a fake network delay.
 *
 * @param {number} time - The optional time (in milliseconds) to delay the execution. If not provided, a random delay between 0 and 900 milliseconds will be used.
 *
 * @returns - A Promise that resolves after the specified delay.
 */
export const fakeNetwork = async (time?: number) => {
    const delayTime = time ?? Math.random() * 900;
    return new Promise((res) => setTimeout(res, delayTime));
};
