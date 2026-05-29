import React, { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight, UserPlus, Sparkles } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function Auth({ onAuthSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all credentials.');
      return;
    }
    if (isRegistering && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let data;
      if (isRegistering) {
        data = await registerUser(username.trim(), password, name.trim());
      } else {
        data = await loginUser(username.trim(), password);
      }
      
      if (data && data.access_token) {
        onAuthSuccess(data);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setUsername('');
    setPassword('');
    setName('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bank-bg p-4 relative overflow-hidden font-outfit">
      
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Panel */}
      <div className="glass-panel w-full max-w-md p-8 sm:p-10 relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
        
        {/* Brand Logo & Title */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/30 text-emerald-400 shadow-glow-emerald">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-bank-textActive tracking-tight flex items-center justify-center gap-1.5">
              ApexWealth <span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-xs text-bank-textMuted mt-1 tracking-wider uppercase font-semibold">
              Personalized Neobanking Advisory Suite
            </p>
          </div>
        </div>

        {/* Display Error Alerts */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl mb-6 text-center animate-shake">
            {error}
          </div>
        )}

        {/* Input Fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div className="space-y-1.5">
              <label className="text-xs text-bank-textMuted font-bold uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-bank-textMuted pointer-events-none">
                  <UserPlus className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-bank-bg border border-bank-cardBorder hover:border-bank-cardBorder/80 focus:border-emerald-500/80 rounded-xl pl-10 pr-4 py-3 text-sm text-bank-textActive placeholder-bank-textMuted outline-none transition duration-150"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-bank-textMuted font-bold uppercase tracking-wider">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-bank-textMuted pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-bank-bg border border-bank-cardBorder hover:border-bank-cardBorder/80 focus:border-emerald-500/80 rounded-xl pl-10 pr-4 py-3 text-sm text-bank-textActive placeholder-bank-textMuted outline-none transition duration-150"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-bank-textMuted font-bold uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-bank-textMuted pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-bank-bg border border-bank-cardBorder hover:border-bank-cardBorder/80 focus:border-emerald-500/80 rounded-xl pl-10 pr-4 py-3 text-sm text-bank-textActive placeholder-bank-textMuted outline-none transition duration-150"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl shadow-glow-emerald disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              <>
                <span>{isRegistering ? 'Register Account' : 'Secure Login'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggles */}
        <div className="mt-8 text-center border-t border-bank-cardBorder/60 pt-6">
          <button
            onClick={toggleAuthMode}
            className="text-xs font-bold text-bank-textMuted hover:text-emerald-400 transition duration-150 flex items-center justify-center gap-1.5 mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
