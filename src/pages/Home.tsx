import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ArrowRight, 
  CheckCircle, 
  Lock, 
  Cpu, 
  BarChart, 
  Users, 
  Globe, 
  Zap 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const [activeFeature, setActiveFeature] = useState(null);

  const features = [
    {
      icon: Lock,
      title: "Advanced Security",
      description: "Multi-layered AI-powered protection ensuring exam integrity.",
      details: [
        "Real-time behavioral analysis",
        "Machine learning threat detection",
        "Adaptive security protocols"
      ]
    },
    {
      icon: Cpu,
      title: "Smart Monitoring",
      description: "Intelligent tracking of exam environments.",
      details: [
        "Automated suspicious activity flagging",
        "Contextual understanding",
        "Minimal student disruption"
      ]
    },
    {
      icon: BarChart,
      title: "Comprehensive Analytics",
      description: "Deep insights into exam performance and patterns.",
      details: [
        "Detailed performance metrics",
        "Predictive assessment models",
        "Institutional improvement recommendations"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Interactive Features */}
      <div className="w-full lg:w-1/2 bg-white shadow-lg p-12 flex flex-col justify-center relative">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <div className="flex items-center mb-6">
            <Shield className="w-12 h-12 text-blue-600 mr-4" />
            <h1 className="text-4xl font-bold text-gray-900">IntegrityGuard</h1>
          </div>

          <p className="text-xl text-gray-600 mb-8">
            Revolutionizing online assessments with cutting-edge AI-powered proctoring technology.
          </p>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className={`
                  border rounded-xl p-4 cursor-pointer transition-all duration-300
                  ${activeFeature === index 
                    ? 'bg-blue-50 border-blue-300 shadow-md' 
                    : 'bg-white border-gray-200 hover:border-blue-300'}
                `}
                onClick={() => setActiveFeature(activeFeature === index ? null : index)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <feature.icon className={`
                      w-8 h-8 mr-4 
                      ${activeFeature === index ? 'text-blue-600' : 'text-gray-500'}
                    `} />
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                  </div>
                  <motion.div 
                    animate={{ rotate: activeFeature === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                  </motion.div>
                </div>
                {activeFeature === index && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 pl-12"
                  >
                    <p className="text-gray-600 mb-2">{feature.description}</p>
                    <ul className="space-y-1 text-sm text-gray-500">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex space-x-4">
            <Link 
              to="/login"
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              to="/demo"
              className="flex items-center px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Watch Demo
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Graphical Representation */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-purple-600 items-center justify-center relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-pattern opacity-10"
        />
        <div className="z-10 text-white text-center max-w-md">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="flex justify-center mb-6">
              <Globe className="w-24 h-24 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Global Exam Integrity</h2>
            <p className="text-lg opacity-80">
              Seamless, secure online assessments that maintain academic standards across different contexts and environments.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Home;
