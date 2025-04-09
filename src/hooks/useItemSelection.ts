import {
    ChangeEvent,
    ChangeEventHandler,
    RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from "react";
import { FieldValues, Path, useFormContext } from "react-hook-form";

interface Identifiable {
    id: string | number;
}

interface UseHandleSelectAllItems {
    handleChange: ChangeEventHandler<HTMLInputElement>;
    checkboxRef: RefObject<HTMLInputElement | null>;
}

/**
 * Handles the selection of all items in a list.
 * @template T - The type of the items in the list. Must be Identifiable.
 * @template TForm - The type of the form containing the checkbox field.
 *
 * @param {T[]} items - The list of items to select from.
 * @param {Path<TForm>} fieldName - The name of the field in the form that hold array of items.
 *
 * @returns {UseHandleSelectAllItems} - An object containing the handleChange function and checkboxRef.
 * 
 * @example
 * // In a component with react-hook-form
 * const { control } = useFormContext<MyFormType>();
 * const items = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
 * 
 * // Use the hook to handle "select all" functionality
 * const { handleChange, checkboxRef } = useHandleSelectAllItems(items, 'selectedItems');
 * 
 * // Use the returned values in your JSX
 * // <input type="checkbox" ref={checkboxRef} onChange={handleChange} />
 */
export const useHandleSelectAllItems = <T extends Identifiable, TForm extends FieldValues>(
    items: T[],
    fieldName: Path<TForm>
): UseHandleSelectAllItems => {
    const checkboxRef = useRef<HTMLInputElement>(null);
    const { setValue, watch } = useFormContext<TForm>();

    const selectedItems = watch(fieldName) as T[];
    const itemsIds = items.map((item) => item.id);

    //--------------------------------------------------------------
    const updateCheckboxState = () => {
        if (!checkboxRef.current) return;

        const selectedItemsIds = new Set(selectedItems.map(({ id }) => id));
        const areAllItemsSelected =
            itemsIds.every((id) => selectedItemsIds.has(id)) && !!selectedItemsIds.size;

        const isAnyItemSelected = itemsIds.some((id) => selectedItemsIds.has(id));

        checkboxRef.current.indeterminate = !areAllItemsSelected && isAnyItemSelected;
        checkboxRef.current.checked = areAllItemsSelected;
    };
    //--------------------------------------------------------------

    useEffect(() => {
        updateCheckboxState();
    }, [selectedItems]);

    //--------------------------------------------------------------

    const handleChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const checked = e.target.checked;

            const filteredItems = selectedItems.filter((item) => !itemsIds.includes(item.id));

            const newItemList = checked ? [...filteredItems, ...items] : filteredItems;

            setValue(fieldName, newItemList as never);
        },
        [selectedItems, itemsIds, items, setValue]
    );

    return { handleChange, checkboxRef };
};

interface UseHandleSelectItem {
    toggleItemSelection: VoidFunction;
    checkboxRef: RefObject<HTMLInputElement | null>;
}

/**
 * A custom hook that handles the selection of an item.
 *
 * @generic
 * T - The type of the item being selected, which must extend Identifiable.
 * TForm - The type of the form values.
 *
 * @param item - The item to be selected.
 * @param fieldName - The name of the field in the form that holds array of items.
 *
 * @returns An object containing the checkbox reference and a function to toggle item selection.
 * 
 * @example
 * // In a component with react-hook-form
 * const { control } = useFormContext<MyFormType>();
 * const item = { id: 1, name: 'Item 1' };
 * 
 * // Use the hook to handle individual item selection
 * const { checkboxRef, toggleItemSelection } = useHandleSelectItem(item, 'selectedItems');
 * 
 * // Use in your JSX
 * // <input 
 * //   type="checkbox" 
 * //   ref={checkboxRef} 
 * //   onChange={toggleItemSelection} 
 * //   id={`item-${item.id}`} 
 * // />
 */
export const useHandleSelectItem = <T extends Identifiable, TForm extends FieldValues>(
    item: T,
    fieldName: Path<TForm>
): UseHandleSelectItem => {
    const { setValue, watch } = useFormContext<TForm>();
    const checkboxRef = useRef<HTMLInputElement>(null);

    const selectedItems = watch(fieldName) as T[];

    const isItemSelected = useMemo(
        () => selectedItems.some((selectedDevice) => selectedDevice.id === item.id),
        [selectedItems, item.id]
    );

    useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.checked = isItemSelected;
        }
    }, [isItemSelected]);

    const toggleItemSelection = useCallback(() => {
        const newDeviceList = isItemSelected
            ? selectedItems.filter((selectedDevice) => selectedDevice.id !== item.id)
            : [...selectedItems, item];

        setValue(fieldName, newDeviceList as never);
    }, [item, isItemSelected, selectedItems, setValue, fieldName]);

    return {
        checkboxRef,
        toggleItemSelection,
    };
};
