import { createSession } from "react-router";

interface User {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    role: {
        name: string;
    };
    lastName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const session = createSession<User>();
session.set("id", "1");

session.set("role", {
    name: "admin",
});

console.log("[data]", session.data);
