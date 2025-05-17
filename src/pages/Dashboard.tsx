import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileCheck, 
  AlertTriangle, 
  Clock, 
  BarChart2, 
  Activity, 
  Shield,
  Moon,
  Sun
} from 'lucide-react';

// Dynamic Card Component
const DashboardCard = ({ 
  title, 
  value, 
  icon, 
  className = '', 
  trend = 0 
}) => {
  return (
    <motion.div 
      className={bg-gray-800 border border-gray-700 rounded-3xl p-6 space-y-4 hover:bg-gray-700/50 transition-all duration-300 ${className}}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex justify-between items-center">
        {icon}
        <span className={text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      </div>
      <div>
        <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
};

export function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [stats, setStats] = useState({
    suspicious: { 
      tabSwitching: 24, 
      aiDetection: 12, 
      multipleDevices: 8 
    },
    assessments: { 
      total: 156, 
      flagged: 32, 
      clean: 124 
    },
    performance: { 
      responseTime: 234, 
      uptime: 99.9, 
      apiCalls: 45 
    }
  });

  const [trends, setTrends] = useState({
    activeSessions: 5,
    completedAssessments: -2,
    flaggedActivities: 3,
    averageDuration: -1
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        suspicious: {
          tabSwitching: Math.min(100, prev.suspicious.tabSwitching + Math.floor(Math.random() * 3) - 1),
          aiDetection: Math.min(100, prev.suspicious.aiDetection + Math.floor(Math.random() * 3) - 1),
          multipleDevices: Math.min(100, prev.suspicious.multipleDevices + Math.floor(Math.random() * 3) - 1)
        },
        assessments: {
          total: prev.assessments.total + Math.floor(Math.random() * 2),
          flagged: prev.assessments.flagged + Math.floor(Math.random() * 2),
          clean: prev.assessments.clean + Math.floor(Math.random() * 2)
        },
        performance: {
          responseTime: Math.max(100, Math.min(500, prev.performance.responseTime + Math.floor(Math.random() * 20) - 10)),
          uptime: Math.min(100, Math.max(98, prev.performance.uptime + (Math.random() * 0.1 - 0.05))),
          apiCalls: prev.performance.apiCalls + Math.floor(Math.random() * 5)
        }
      }));

      // Update trends
      setTrends({
        activeSessions: Math.floor(Math.random() * 10) - 5,
        completedAssessments: Math.floor(Math.random() * 10) - 5,
        flaggedActivities: Math.floor(Math.random() * 10) - 5,
        averageDuration: Math.floor(Math.random() * 10) - 5
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={min-h-screen p-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}}>
      <div className="flex justify-between items-center mb-8">
        <h1 className={text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}}>
          Proctor Dashboard
        </h1>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
        >
          {isDarkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-gray-800" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Active Sessions"
          value="24"
          icon={<Users className="w-6 h-6 text-blue-400" />}
          trend={trends.activeSessions}
        />
        <DashboardCard
          title="Completed Assessments"
          value="156"
          icon={<FileCheck className="w-6 h-6 text-green-400" />}
          trend={trends.completedAssessments}
        />
        <DashboardCard
          title="Flagged Activities"
          value="8"
          icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
          trend={trends.flaggedActivities}
        />
        <DashboardCard
          title="Average Duration"
          value="45m"
          icon={<Clock className="w-6 h-6 text-purple-400" />}
          trend={trends.averageDuration}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          className={rounded-3xl p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* <h2 className={text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}}>
            System Performance
          </h2>
          <div className="space-y-6">
            {[
              { 
                label: 'Average Response Time', 
                value: ${stats.performance.responseTime}ms, 
                color: 'from-blue-500 to-indigo-500',
                progress: Math.min(100, (stats.performance.responseTime / 500) * 100)
              },
              { 
                label: 'System Uptime', 
                value: ${stats.performance.uptime.toFixed(1)}%, 
                color: 'from-green-500 to-emerald-500',
                progress: stats.performance.uptime
              },
              { 
                label: 'API Calls', 
                value: ${stats.performance.apiCalls}k/day, 
                color: 'from-purple-500 to-pink-500',
                progress: Math.min(100, (stats.performance.apiCalls / 100) * 100)
              }
            ].map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{item.label}</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{item.value}</span>
                </div>
                <div className={h-2 bg-gray-700 rounded-full overflow-hidden}>
                  <motion.div 
                    className={h-full bg-gradient-to-r ${item.color}}
                    initial={{ width: '0%' }}
                    animate={{ width: ${item.progress}% }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div> */}
        </motion.div>

        <motion.div 
          className={rounded-3xl p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className={text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}}>
            System Status
          </h2>
          <div className="space-y-4">
            {[
              { name: 'AI Analysis Engine', status: 'Operational', icon: <BarChart2 className="text-blue-400" /> },
              { name: 'Video Processing', status: 'Operational', icon: <Activity className="text-green-400" /> },
              { name: 'Plagiarism Detection', status: 'Operational', icon: <Shield className="text-purple-400" /> }
            ].map((service, index) => (
              <motion.div 
                key={index} 
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700/30 border-gray-600/50 hover:bg-gray-700/50' 
                    : 'bg-gray-100 border-gray-200 hover:bg-gray-200/50'
                }`}
                whileHover={{ scale: 1.03 }}
              >
                <div className="flex items-center space-x-4">
                  {service.icon}
                  <span className={font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}}>
                    {service.name}
                  </span>
                </div>
                <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-xl text-sm font-medium">
                  {service.status}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
