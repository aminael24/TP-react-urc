
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthSession = {
    token: string;
    username: string;
    id: number;
    externalId: string;
};

type AuthState = {
    session: AuthSession | null;
};

function loadSession(): AuthSession | null {
    const token = sessionStorage.getItem("token");
    const username = sessionStorage.getItem("username");
    const externalId = sessionStorage.getItem("externalId");
    const idValue = sessionStorage.getItem("id");
    const id = Number(idValue);

    if (
        !token ||
        !username ||
        !externalId ||
        !idValue ||
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        return null;
    }

    return { token, username, externalId, id };
}

const initialState: AuthState = {
    session: loadSession(),
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        loginSuccess: (
            state,
            action: PayloadAction<AuthSession>
        ) => {
            state.session = action.payload;
        },

        logout: (state) => {
            state.session = null;
        },
    },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
