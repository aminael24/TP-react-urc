
import {
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";

export type PublicUser = {
    user_id: number;
    username: string;
    last_login: string | null;
};

export type Room = {
    room_id: number;
    name: string;
    is_private?: boolean;
    created_by?: number;
};

export type Message = {
    id: string;
    senderId: number;
    senderName: string;
    content: string;
    imageUrl?: string | null;
    replyTo?: string | null;
    reactions?: Record<string, number>;
    createdAt: string;
};

export type SelectedConversation = {
    kind: "user" | "room";
    targetId: number;
} | null;

type ChatState = {
    users: PublicUser[];
    rooms: Room[];
    messages: Message[];
    loading: boolean;
    selectedConversation: SelectedConversation;
};

const initialState: ChatState = {
    users: [],
    rooms: [],
    messages: [],
    loading: false,
    selectedConversation: null,
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

        setSelectedConversation: (
            state,
            action: PayloadAction<SelectedConversation>
        ) => {
            state.selectedConversation = action.payload;
        },

        resetChat: () => initialState,
    },
});

export const {
    setUsers,
    setRooms,
    setMessages,
    setLoading,
    setSelectedConversation,
    resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
