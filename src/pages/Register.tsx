import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, UserPlus, User, Lock, Mail, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState({
    password: false,
    confirmPassword: false
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length > 7) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordStrength < 3) {
      setError('Password is too weak. Please use a stronger password.');
      return;
    }
    // For now, just redirect to login
    navigate('/login');
  };

  const handlePasswordChange = (value: string, field: 'password' | 'confirmPassword') => {
    setFormData({ ...formData, [field]: value });
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Registration Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-12">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center mb-8">
            <Shield className="w-10 h-10 text-blue-600 mr-4" />
            <h1 className="text-3xl font-bold text-gray-900">IntegrityGuard</h1>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Create Account</h2>
          <p className="text-gray-600 mb-8">Join our secure exam management platform</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={isPasswordVisible.password ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value, 'password')}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(prev => ({ ...prev, password: !prev.password }))}
                  className="absolute right-3 top-3 text-gray-500 hover:text-blue-600"
                >
                  {isPasswordVisible.password ? 
                    <EyeOff className="w-5 h-5" /> : 
                    <Eye className="w-5 h-5" />
                  }
                </button>
              </div>
              <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    passwordStrength === 1 ? 'bg-red-500 w-1/4' : 
                    passwordStrength === 2 ? 'bg-yellow-500 w-1/2' : 
                    passwordStrength === 3 ? 'bg-green-500 w-3/4' : 
                    passwordStrength === 4 ? 'bg-green-600 w-full' : 'bg-gray-200 w-0'
                  }`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {passwordStrength === 0 && 'Password strength'}
                {passwordStrength === 1 && 'Weak password'}
                {passwordStrength === 2 && 'Moderate password'}
                {passwordStrength === 3 && 'Strong password'}
                {passwordStrength === 4 && 'Very strong password'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={isPasswordVisible.confirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handlePasswordChange(e.target.value, 'confirmPassword')}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                  className="absolute right-3 top-3 text-gray-500 hover:text-blue-600"
                >
                  {isPasswordVisible.confirmPassword ? 
                    <EyeOff className="w-5 h-5" /> : 
                    <Eye className="w-5 h-5" />
                  }
                </button>
              </div>
            </div>

            {error && (
              <motion.p 
                className="text-red-600 text-sm flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <CheckCircle className="mr-2 w-4 h-4" />
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Create Account
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Decorative Section */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-purple-600 items-center justify-center relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-pattern opacity-10"
        />
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="z-10 text-white text-center max-w-md p-8"
        >
          <div className="flex justify-center mb-6">
            <Shield className="w-24 h-24 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Secure Registration</h2>
          <p className="text-lg opacity-80">
            Robust security measures protect your personal information and ensure a trustworthy registration process.
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <div className="bg-white/20 rounded-full p-3">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Register;
