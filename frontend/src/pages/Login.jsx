import { useState, useRef } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestRegistrationCode, supabase } from '../supabaseClient';
import { Mail, CheckCircle2, ShieldCheck, ArrowRight, MailOpen, AlertCircle, Lock, User, MapPin, Eye, EyeOff } from 'lucide-react';
import { State, City } from 'country-state-city';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/home', { replace: true }); 
        // 'replace: true' overwrites the history so they can't get stuck in a back-button loop
      }
    };
    checkActiveSession();
  }, [navigate]);
  
  // State Management
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [accountExists, setAccountExists] = useState(false);

  // Onboarding Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    state: '',
    city: '',
    monthlyBudget: ''
  });

  // Password Strength & Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Helper Data for State/City Cascading Dropdowns
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const indianStates = State.getStatesOfCountry('IN');
  const availableCities = selectedStateCode ? City.getCitiesOfState('IN', selectedStateCode) : [];

  // Keep OTP input focus and in-flight requests stable across renders.
  const inputRefs = useRef([]);
  const otpRequestPending = useRef(false);

  const switchToSignIn = () => {
    setIsSignUp(false);
    setIsForgotPassword(false);
    setAccountExists(false);
    setErrorMsg('');
    setPassword('');
    setPasswordStrength(0);
  };

  // ==========================================
  // PASSWORD STRENGTH HANDLER
  // ==========================================
  const handlePasswordChange = (e) => {
    const pass = e.target.value;
    setPassword(pass);
    
    let score = 0;
    if (pass.length > 0) score += 1; // Very Weak
    if (pass.length >= 8) score += 1; // Weak
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1; // Fair
    if (/[0-9]/.test(pass)) score += 1; // Good
    if (/[^A-Za-z0-9]/.test(pass)) score += 1; // Strong
    
    setPasswordStrength(score);
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return { text: 'Weak Password', color: 'text-red-ink', bg: 'bg-red-500' };
    if (passwordStrength <= 3) return { text: 'Fair Password', color: 'text-amber-ink', bg: 'bg-amber-500' };
    return { text: 'Strong Password', color: 'text-emerald-ink', bg: 'bg-emerald-500' };
  };

  // ==========================================
  // FLOW 1: STANDARD LOGIN (Email & Password)
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // Check if onboarding is complete
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    if (profile && profile.onboarding_complete) {
      navigate('/home');
    } else {
      // They abandoned onboarding previously. Force them to finish it.
      setStep(3);
    }
  };

  // ==========================================
  // FLOW 2 & 3: SEND OTP (Sign Up & Forgot Password)
  // ==========================================
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (otpRequestPending.current || accountExists) return;

    otpRequestPending.current = true;
    setLoading(true);
    setErrorMsg('');
    const normalizedEmail = email.trim().toLowerCase();

    try {
      setEmail(normalizedEmail);

      if (isSignUp) {
        const result = await requestRegistrationCode(normalizedEmail);
        if (result === 'account_exists') {
          setAccountExists(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
        if (error) throw error;
      }

      setOtp(['', '', '', '', '', '']);
      setStep(2);
    } catch (error) {
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
        setErrorMsg('Too many requests. Please wait a moment and try again.');
      } else {
        setErrorMsg('We couldn’t send a verification code. Please try again.');
      }
    } finally {
      otpRequestPending.current = false;
      setLoading(false);
    }
  };

  // ==========================================
  // VERIFY OTP
  // ==========================================
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpRequestPending.current) return;

    const token = otp.join('');
    if (token.length < 6) {
      setErrorMsg('Please enter all 6 digits.');
      return;
    }

    otpRequestPending.current = true;
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: isForgotPassword ? 'recovery' : 'signup',
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setStep(isForgotPassword ? 4 : 3);
    } catch {
      setErrorMsg('We couldn’t verify the code. Please try again.');
    } finally {
      otpRequestPending.current = false;
      setLoading(false);
    }
  };

  // ==========================================
  // FINALIZE ONBOARDING
  // ==========================================
  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 1. Save new password securely in auth.users
    const { data: authData, error: authError } = await supabase.auth.updateUser({
      password: password
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    // 2. Save profile data in 'profiles' table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        state: formData.state, 
        city: formData.city,
        monthly_budget: parseInt(formData.monthlyBudget),
        onboarding_complete: true
      });

    setLoading(false);

  if (profileError) {
      // Temporarily print the EXACT error from Supabase so we can debug it
      console.error("SUPABASE ERROR:", profileError);
      setErrorMsg(`DB Error: ${profileError.message}`);
    } else {
      navigate('/home');
    }
  };

  // ==========================================
  // FINALIZE PASSWORD RESET
  // ==========================================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      // Password changed successfully! Send to dashboard.
      navigate('/home');
    }
  };

  // --- OTP Input Helpers ---
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== '' && index < 5) inputRefs.current[index + 1].focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-tint/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="bg-surface w-full max-w-[440px] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-divider p-8">
        
        {/* ============================== */}
        {/* STEP 1: INITIAL LOGIN / EMAIL  */}
        {/* ============================== */}
        {step === 1 && (
          <>
            <div className="flex p-1 bg-subtle rounded-lg mb-8">
              <button
                type="button" disabled={loading}
                onClick={switchToSignIn}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isSignUp ? 'bg-surface text-heading shadow-sm' : 'text-quiet hover:text-body'}`}
              >
                Sign In
              </button>
              <button
                type="button" disabled={loading}
                onClick={() => { setIsSignUp(true); setIsForgotPassword(false); setErrorMsg(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${isSignUp ? 'bg-surface text-heading shadow-sm' : 'text-quiet hover:text-body'}`}
              >
                Create Account <span className="bg-indigo-tint text-indigo-ink text-[10px] px-2 py-0.5 rounded-full font-bold">New</span>
              </button>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-heading flex items-center gap-2 mb-2">
                {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create your account' : 'Welcome back'}
                {!isForgotPassword && <CheckCircle2 className="text-indigo-ink w-5 h-5" />}
              </h2>
              <p className="text-quiet text-sm">
                {isForgotPassword 
                  ? 'Enter your email to receive a recovery code.' 
                  : isSignUp 
                    ? 'Enter your email to receive a secure one-time passcode (OTP).' 
                    : 'Enter your credentials to access your dashboard.'}
              </p>
            </div>

            <form onSubmit={isSignUp || isForgotPassword ? handleSendOTP : handleLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-body uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-hint w-5 h-5" />
                  <input 
                    type="email" required disabled={loading} placeholder="name@example.com" value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setAccountExists(false);
                      setErrorMsg('');
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-heading"
                  />
                </div>
              </div>

              {(!isSignUp && !isForgotPassword) && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-body uppercase tracking-wider">Password</label>
                    <button type="button" disabled={loading} onClick={() => { setIsForgotPassword(true); setErrorMsg(''); }} className="text-xs font-bold text-indigo-ink hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-hint w-5 h-5" />
                    <input 
                      type="password" required placeholder="••••••••" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-surface border border-outline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-heading"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-ink text-sm bg-red-wash p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              {accountExists ? (
                <div className="space-y-3">
                  <p role="status" className="text-sm text-indigo-ink bg-indigo-wash p-3 rounded-lg">
                    An account with this email already exists. Sign in with your email and password to continue.
                  </p>
                  <button type="button" onClick={switchToSignIn} className="w-full bg-sign-in text-white py-3.5 rounded-xl text-sm font-medium hover:bg-sign-in-hover flex items-center justify-center gap-2">
                    Sign In <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-sign-in text-white py-3.5 rounded-xl text-sm font-medium hover:bg-sign-in-hover flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? 'Processing...' : (!isSignUp && !isForgotPassword ? 'Sign In' : 'Send Verification Code')}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              )}

              {isForgotPassword && (
                <button type="button" disabled={loading} onClick={switchToSignIn} className="w-full text-sm font-bold text-quiet hover:text-heading">
                  Back to Sign In
                </button>
              )}
            </form>
          </>
        )}

        {/* ============================== */}
        {/* STEP 2: VERIFY OTP             */}
        {/* ============================== */}
        {step === 2 && (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 bg-indigo-wash rounded-full flex items-center justify-center mb-6 relative">
                <MailOpen className="text-indigo-ink w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-heading mb-2">Check your email</h2>
              <p className="text-quiet text-sm text-center mb-6">
                We sent a 6-digit security code to authenticate your session.
              </p>
              <div className="flex items-center gap-2 bg-subtle px-4 py-1.5 rounded-full border border-outline">
                <span className="text-sm font-medium text-body">@ {email}</span>
                <button type="button" disabled={loading} onClick={() => { setErrorMsg(''); setStep(1); }} className="text-xs text-indigo-ink font-semibold hover:underline">Edit</button>
              </div>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index} ref={(el) => (inputRefs.current[index] = el)}
                    type="text" maxLength={1} value={digit} disabled={loading}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-semibold bg-surface border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-heading"
                  />
                ))}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-ink text-sm bg-red-wash p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-sign-in text-white py-3.5 rounded-xl text-sm font-medium hover:bg-sign-in-hover flex items-center justify-center gap-2 disabled:opacity-70">
                {loading ? 'Verifying...' : 'Verify & Continue'}
                {!loading && <ShieldCheck className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}

        {/* ============================== */}
        {/* STEP 3: ONBOARDING PROFILE     */}
        {/* ============================== */}
        {step === 3 && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-heading mb-2">Complete Your Profile</h2>
              <p className="text-quiet text-sm leading-relaxed">
                Set your security credentials and customize your financial ledger experience.
              </p>
            </div>

            <form onSubmit={handleCompleteOnboarding} className="space-y-5">
              
              {/* Password Section */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-quiet uppercase tracking-wider">Create Password</label>
                  {passwordStrength > 0 && (
                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${getStrengthLabel().color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStrengthLabel().bg}`}></span>
                      {getStrengthLabel().text}
                    </span>
                  )}
                </div>
                <div className="relative mb-2">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-hint w-4 h-4" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="••••••••••••••••" 
                    value={password}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-10 py-2.5 bg-surface border border-outline rounded-xl text-sm font-medium text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-hint hover:text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                {/* Strength Bars */}
                <div className="flex gap-1 mb-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div 
                      key={level} 
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        passwordStrength >= level 
                          ? getStrengthLabel().bg 
                          : 'bg-muted'
                      }`}
                    ></div>
                  ))}
                </div>
                <p className="text-[10px] font-medium text-hint text-right">8+ chars, symbol & number</p>
              </div>

              {/* Name & Age Row */}
              <div className="flex gap-4">
                <div className="flex-[2]">
                  <label className="block text-[11px] font-bold text-quiet uppercase tracking-wider mb-1.5">Full Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-hint w-4 h-4" />
                    <input 
                      type="text" required placeholder="e.g. Alex Morgan" value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-divider rounded-xl text-sm font-medium text-heading focus:bg-surface focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-quiet uppercase tracking-wider mb-1.5">Age</label>
                  <input 
                    type="number" required placeholder="e.g. 24" value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    className="w-full px-4 py-2.5 bg-canvas border border-divider rounded-xl text-sm font-medium text-heading focus:bg-surface focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Gender, State, City Row */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-quiet uppercase tracking-wider mb-1.5">Gender</label>
                  <select 
                    required value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-surface border border-divider rounded-xl text-sm font-medium text-body focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-quiet uppercase tracking-wider mb-1.5">State</label>
                  <select 
                    required 
                    value={selectedStateCode} 
                    onChange={(e) => {
                      const code = e.target.value;
                      const stateName = e.target.options[e.target.selectedIndex].text;
                      setSelectedStateCode(code);
                      setFormData({...formData, state: stateName, city: ''});
                    }}
                    className="w-full px-3.5 py-2.5 bg-surface border border-divider rounded-xl text-sm font-medium text-body focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>Select state</option>
                    {indianStates.map(state => (
                      <option key={state.isoCode} value={state.isoCode}>{state.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-[1.2]">
                  <label className="block text-[11px] font-bold text-quiet uppercase tracking-wider mb-1.5">City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-hint w-4 h-4" />
                    <select 
                      required 
                      disabled={!selectedStateCode} 
                      value={formData.city} 
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-divider rounded-xl text-sm font-medium text-body focus:bg-surface focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="" disabled>{selectedStateCode ? 'Select city' : 'Select state first'}</option>
                      {availableCities.map(city => (
                        <option key={city.name} value={city.name}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Master Budget */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-quiet uppercase tracking-wider">Master Monthly Budget</label>
                  <span className="bg-muted text-secondary text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">INR (₹)</span>
                </div>
                <div className="relative mb-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-hint font-medium">₹</span>
                  <input 
                    type="number" required placeholder="e.g. 15,000" value={formData.monthlyBudget}
                    onChange={(e) => setFormData({...formData, monthlyBudget: e.target.value})}
                    className="w-full pl-8 pr-16 py-3 bg-canvas border border-divider rounded-xl text-sm font-medium text-heading focus:bg-surface focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-hint text-sm font-medium">/ month</span>
                </div>
                <p className="text-[10px] font-medium text-hint leading-relaxed">
                  Used to calibrate smart expense limits and envelope balances. Can be altered anytime.
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-ink text-sm bg-red-wash p-3 rounded-lg mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <button 
                type="submit" disabled={loading} 
                className="w-full bg-[#4133d3] text-white py-3.5 rounded-xl text-sm font-semibold shadow-lg shadow-brand-shadow/50 hover:bg-[#3428a8] transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
              >
                {loading ? 'Processing...' : 'Complete Setup & Login'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
            
            <div className="mt-6 pt-5 border-t border-divider flex items-center justify-center gap-1.5 text-[10px] text-hint font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              256-bit TLS encryption • Regulated Financial Privacy
            </div>
          </div>
        )}

        {/* ============================== */}
        {/* STEP 4: RESET PASSWORD (RECOVERY) */}
        {/* ============================== */}
        {step === 4 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-heading mb-2">Set New Password</h2>
              <p className="text-quiet text-sm">Enter a new secure password for your account.</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-body uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-hint w-5 h-5" />
                  <input 
                    type="password" required placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-heading"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-ink text-sm bg-red-wash p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                {loading ? 'Updating...' : 'Update Password & Login'}
              </button>
            </form>
          </>
        )}

      </div>

      <div className="mt-8 flex items-center gap-6 text-xs text-quiet font-medium">
        <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-indigo-ink"/> 256-bit TLS encryption</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-indigo-ink"/> Instant access</span>
      </div>
    </div>
  );
}
