
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../app/api";

export default function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        setLoading(true);
        setError("");

        try {
            await api("/api/register", {
                method: "POST",
                body: JSON.stringify({
                    username,
                    email,
                    password,
                }),
            });

            navigate("/login");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Inscription impossible"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-screen">
            <div className="auth-card">
                <div className="brand">● URC</div>

                <h1>Créer un compte</h1>
                <p>Rejoins UBO Relay Chat</p>

                <form onSubmit={handleSubmit}>
                    <label>
                        Identifiant
                        <input
                            type="text"
                            value={username}
                            minLength={3}
                            maxLength={50}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            required
                        />
                    </label>

                    <label>
                        Adresse email
                        <input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            required
                        />
                    </label>

                    <label>
                        Mot de passe
                        <input
                            type="password"
                            value={password}
                            minLength={8}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            required
                        />
                    </label>

                    {error && (
                        <p className="error" role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Inscription..." : "Créer mon compte"}
                    </button>
                </form>

                <p>
                    Déjà un compte ?{" "}
                    <Link to="/login">Se connecter</Link>
                </p>
            </div>
        </main>
    );
}
