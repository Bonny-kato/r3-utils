import LocalStorage from "@bonny-kato/localstorage";

export class ExtendedLocalStorage extends LocalStorage {
    values<T = unknown>(): IterableIterator<T> {
        const storeValues = JSON.parse(
            localStorage.getItem(this.STORE_KEY) ?? "{}"
        ) as object;
        return Object.values(storeValues) as never as IterableIterator<T>;
    }
}
