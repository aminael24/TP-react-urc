
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type PublicUser = {
    user_id: number;
    username: string;
    last_login: string | null;
};

export type Room = {
    room_id: number;
    name: string;
};

export type Message = {
    id: string;
    senderId: number;
    senderName: string;
    content: string;
    createdAt: string;
};

interface ChatState {
    users: PublicUser[];
    rooms: Room[];
    messages: Message[];
    loading: boolean;
}

const initialState: ChatState = {
    users: [],
    rooms: [],
    messages: [],
    loading: false,
};

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setUsers: (
            state,
            action: PayloadAction<PublicUser[]>
        ) => {
            state.users = action.payload;
        },

        setRooms: (
            state,
            action: PayloadAction<Room[]>
        ) => {
            state.rooms = action.payload;
        },

        setMessages: (
            state,
            action: PayloadAction<Message[]>
        ) => {
            state.messages = action.payload;
        },

        setLoading: (
            state,
            action: PayloadAction<boolean>
        ) => {
            state.loading = action.payload;
        },

        resetChat: () => initialState,
    },
});

export const {
    setUsers,
    setRooms,
    setMessages,
    setLoading,
    resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
