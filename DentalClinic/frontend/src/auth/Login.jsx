import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { Eye, EyeOff, Mail, Lock, Heart } from 'lucide-react';
import axios from 'axios';

function Login() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post('https://gental-care-dental.onrender.com/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      if (user.role === "Admin" || user.role === "Staff" || user.role === "Dentist") {
        navigate("/dashboard");
      } else {
        navigate("/home");
      }
    } catch (error) {
      setIsLoading(false);
      if (error.response && error.response.data) {
        if (error.response.data.errors && error.response.data.errors.length > 0) {
          setError(error.response.data.errors[0].msg);
        } else if (error.response.data.message) {
          setError(error.response.data.message);
        } else {
          setError("Login failed!");
        }
      } else {
        setError("Login failed!");
      }
      return;
    }
    setIsLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <div className={styles.logo}>
            <Heart className={styles.logoIcon} />
          </div>
          <h1 className={styles.title}>Gentle Care Dental</h1>
        </div>

        {/* Form Section */}
        <div className={styles.formSection}>
          <div className={styles.welcomeText}>
            <h2 className={`${styles.welcomeTitle} ${error ? styles.errorTitle : ''}`}>
              {error || 'Welcome back!'}
            </h2>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {/* Email Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={20} />
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {showPassword ? (
                  <EyeOff
                    className={styles.eyeIcon}
                    size={20}
                    onClick={togglePasswordVisibility}
                  />
                ) : (
                  <Eye
                    className={styles.eyeIcon}
                    size={20}
                    onClick={togglePasswordVisibility}
                  />
                )}
              </div>
            </div>



            {/* Forgot Password */}
            <div className={styles.forgotPassword}>
              <a 
                href="/forgot-password" 
                className={styles.forgotLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/forgot-password");
                }}
              >
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className={styles.loginButton}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine}></div>
            <span className={styles.dividerText}>Or</span>
            <div className={styles.dividerLine}></div>
          </div>

          {/* Register Section */}
          <div className={styles.registerSection}>
            <p className={styles.registerText}>
              No account yet?{' '}
              <a 
                href="/register" 
                className={styles.registerLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/register");
                }}
              >
                Sign up now
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;