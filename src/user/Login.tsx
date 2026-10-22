
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import { loginSuccess } from "../features/auth/authSlice";
import { api } from "../app/api";

type LoginResponse = {
    token: string;
    username: string;
    externalId: string;
    id: number;
};

export function Login() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const session = await api<LoginResponse>(
                "/api/login",
                {
                    method: "POST",
                    body: JSON.stringify({
                        username,
                        password,
                    }),
                }
            );

            sessionStorage.setItem("token", session.token);
            sessionStorage.setItem("username", session.username);
            sessionStorage.setItem(
                "externalId",
                session.externalId
            );
            sessionStorage.setItem(
                "id",
                String(session.id)
            );

            dispatch(loginSuccess(session));

            navigate("/messages");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Connexion impossible"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-screen">
            <div className="auth-card">
                <div className="brand">● URC</div>

                <h1>Connexion</h1>
                <p>Connecte-toi à UBO Relay Chat</p>

                <form onSubmit={handleSubmit}>
                    <label>
                        Identifiant
                        <input
                            type="text"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            required
                            autoComplete="username"
                            placeholder="Ton identifiant"
                        />
                    </label>

                    <label>
                        Mot de passe
                        <input
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            required
                            autoComplete="current-password"
                            placeholder="Ton mot de passe"
                        />
                    </label>

                    {error && (
                        <p className="error" role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Connexion..." : "Se connecter"}
                    </button>
                </form>

                <p>
                    Pas encore de compte ?{" "}
                    <Link to="/register">S'inscrire</Link>
                </p>
            </div>
        </main>
    );
}
