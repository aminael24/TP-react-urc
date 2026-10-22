
import type { CustomError } from "./CustomError";

export const AUTHENT_HEADER = "Authorization";
export const BEARER = "Bearer ";

export interface User {
    user_id: number;
    username: string;
    email?: string;
    password: string;
    last_login?: string;
    external_id?: string;
}

// Type centralisé de la session
export interface Session {
    token: string;
    username: string;
    id: number;
    externalId: string;
}

// Interfaces fournies initialement par le professeur
export interface EmptyCallback {
    (): void;
}

export interface SessionCallback {
    (session: Session): void;
}

export interface ErrorCallback {
    (error: CustomError): void;
}
