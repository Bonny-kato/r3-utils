import SimpleDB from "@bonnykato/simple-db";
import { AuthUser } from "../access-control/access";

/**
 * Database instance for storing and retrieving user data.
 *
 * Uses SimpleDB to provide persistent storage of user information
 * in a JSON file named 'db.json' with a collection named 'users'.
 */
export const db = new SimpleDB<AuthUser>("db.json", "users");

/**
 * Asynchronously saves or updates a user in the database.
 *
 * This function checks if the user already exists in the database by their ID.
 * If the user exists, it updates their information; otherwise, it creates a new
 * user entry with the provided data.
 *
 * @param user - The user data to be saved or updated
 * @returns A promise that resolves to the saved or updated user data
 */
export const saveOrUpdateUser = async (user: AuthUser): Promise<AuthUser> => {
    const existingUser = await db.getByID(user.id);

    if (existingUser) {
        return (await db.update(user.id, user)) as AuthUser;
    }
    return await db.create(user);
};
