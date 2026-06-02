import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';

export default function Login() {
    const { loginSession } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!email) return setError('Please provide a valid email address.');

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await API.post('/auth/request-otp', { email });
            
            if (response.status === 200 || response.status === 201 || response.data) {
                setMessage('Verification code successfully dispatched to your inbox.');
                setStep(2);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to dispatch verification code.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) return setError('Please enter a complete 6-digit code.');

        setLoading(true);
        setError('');

        try {
            const response = await API.post('/auth/verify-otp', { email, otp });
            
            if (response.status === 200 || response.data?.token) {
                loginSession(response.data.token, response.data.user || { email });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired verification code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lab-container">
            <div className="lab-card">
                <h2 className="lab-title">Project Pixel</h2>
                <p className="lab-subtitle">Digital Image Processing Virtual Laboratory</p>

                {error && <div className="alert-danger">{error}</div>}
                {message && <div className="alert-success">{message}</div>}

                {step === 1 ? (
                    <form onSubmit={handleRequestOtp}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label"> Email Address</label>
                            <input
                                type="email"
                                placeholder="name@gmail.com"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Connecting...' : 'Request Security Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label">6-Digit Verification Code</label>
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                className="form-input-center"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                                required
                            />
                            <p className="hint-text">Code expires automatically in 5 minutes.</p>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Verifying...' : 'Access Lab Workspace'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep(1); setError(''); }}
                            className="btn-link"
                        >
                            ← Change Email Address
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}