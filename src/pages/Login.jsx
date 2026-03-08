import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import './Login.css';

export default function Login() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                const res = await register(username, password);
                if (res.success) {
                    navigate('/'); // Go to dashboard if registered and auto-logged in
                } else {
                    setError(res.error);
                }
            } else {
                const res = await login(username, password);
                if (res.success) {
                    navigate('/');
                } else {
                    setError(res.error);
                }
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box bg-card border">
                <div className="login-header">
                    <h1 className="brand-font">Moment<span className="text-red">um</span></h1>
                    <p className="text-secondary brand-font">{isRegistering ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <Input
                        label="Username"
                        name="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                    />
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                    />

                    {error && <div className="login-error text-red brand-font">{error}</div>}

                    <Button variant="primary" size="lg" type="submit" className="login-submit" disabled={isLoading}>
                        {isLoading ? 'Wait...' : isRegistering ? 'REGISTER' : 'LOGIN'}
                    </Button>
                </form>

                <div className="login-footer brand-font">
                    {isRegistering ? "Already have an account?" : "No account yet?"}{' '}
                    <button className="text-red login-switch-btn" onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                    }}>
                        {isRegistering ? 'Login' : 'Register'}
                    </button>
                </div>
            </div>
        </div>
    );
}
