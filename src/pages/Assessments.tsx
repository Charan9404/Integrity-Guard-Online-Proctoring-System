import React, { useState, useEffect } from 'react';
import { FileText, MoreVertical, Plus, Trash2, Filter, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface Assessment {
  id: string;
  title: string;
  subject: string;
  status: string;
  participants: string;
  createdAt: string;
  questions: Array<{ id: string; text: string }>;
}

export function Assessments() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';
  const [completedAssessments] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('completedAssessments') || '[]');
  });

  useEffect(() => {
    const storedAssessments = JSON.parse(localStorage.getItem('assessments') || '[]');
    setAssessments(storedAssessments);

    const interval = setInterval(() => {
      const updatedAssessments = JSON.parse(localStorage.getItem('assessments') || '[]');
      setAssessments(updatedAssessments);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = (id: string) => {
    const updatedAssessments = assessments.filter(assessment => assessment.id !== id);
    localStorage.setItem('assessments', JSON.stringify(updatedAssessments));
    setAssessments(updatedAssessments);
    setShowDeleteMenu(null);
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assessment.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || assessment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-gray-900 min-h-screen p-8 space-y-6">
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-white">Assessments</h1>
        {isAdmin && (
          <Link to="/create-assessment">
            <motion.button 
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl hover:from-indigo-700 hover:to-purple-800 flex items-center space-x-2 shadow-lg shadow-indigo-900/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Assessment</span>
            </motion.button>
          </Link>
        )}
      </motion.div>

      <motion.div 
        className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="relative">
              <select 
                className="appearance-none w-full pl-4 pr-8 py-2 bg-gray-700 text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option className="bg-gray-800">All Status</option>
                <option className="bg-gray-800">Active</option>
                <option className="bg-gray-800">Completed</option>
                <option className="bg-gray-800">Scheduled</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider rounded-tl-xl">
                    Assessment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  {isAdmin ? (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider rounded-tr-xl">
                      Actions
                    </th>
                  ) : (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider rounded-tr-xl">
                      Completed
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAssessments.map((assessment) => (
                  <motion.tr
                    key={assessment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4">
                      {!isAdmin ? (
                        <Link 
                          to="/exam-session" 
                          state={{ assessment }}
                          className="flex items-center group"
                        >
                          <FileText className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 mr-3 transition-colors" />
                          <div>
                            <div className="text-sm font-medium text-white group-hover:text-indigo-300">
                              {assessment.title}
                            </div>
                            <div className="text-sm text-gray-400">{assessment.subject}</div>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-white">
                              {assessment.title}
                            </div>
                            <div className="text-sm text-gray-400">{assessment.subject}</div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-400">
                        {assessment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{assessment.participants}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin ? (
                      <td className="px-6 py-4">
                        <div className="relative">
                          <motion.button 
                            className="text-gray-400 hover:text-white"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowDeleteMenu(showDeleteMenu === assessment.id ? null : assessment.id)}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </motion.button>
                          <AnimatePresence>
                            {showDeleteMenu === assessment.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-xl shadow-2xl border border-gray-600 z-10"
                              >
                                <button
                                  onClick={() => handleDelete(assessment.id)}
                                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900/20 rounded-xl flex items-center space-x-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    ) : (
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          completedAssessments.includes(assessment.id)
                            ? 'bg-blue-900/50 text-blue-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}>
                          {completedAssessments.includes(assessment.id) ? 'Yes' : 'No'}
                        </span>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
