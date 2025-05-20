import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { AlertTriangle, Eye, MessageSquare, Send, Camera, ShieldAlert, Clock, CheckCircle, XCircle, Smartphone, MonitorX, Home, ArrowLeft, ArrowRight, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { Link, useLocation } from 'react-router-dom';
import { detectFace, cleanup as cleanupFaceDetection } from '../lib/faceDetection';
import { detectAIContent, checkPlagiarism } from '../lib/gemini';
// Import necessary Chart.js components and Line chart
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
// Import the fast audio detector
import { GaussianDFTAudioDetectorFast } from '../lib/AudioDetectorFast';

// Register Chart.js components (do this once)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);


const socket = io('http://localhost:3000');

interface Question {
  id: string;
  text: string;
  answer: string;
}

interface Anomaly {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: Date;
}

// Interface for audio detection results
interface AudioDetectionResults {
  speechPercentage: number;
  duration: number; // Processing duration
  logLikelihood: number[];
  speechFrames: boolean[];
}


export function ExamSession() {
  const location = useLocation();
  const assessment = location.state?.assessment;
  const [questions, setQuestions] = useState<Question[]>(
    assessment?.questions.map((q: Question) => ({ ...q, answer: '' })) || []
  );

  const webcamRef = useRef<Webcam>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isAIDetected, setIsAIDetected] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [hasWebcamAccess, setHasWebcamAccess] = useState(false);
  const [hasMicrophoneAccess, setHasMicrophoneAccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(assessment?.totalTime * 60 || 3600);
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [examId] = useState('exam-123');
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [outOfFrameCount, setOutOfFrameCount] = useState(0);
  const [phoneUsageCount, setPhoneUsageCount] = useState(0);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Use ref for media recorder
  const [isRecording, setIsRecording] = useState(false);
  const audioChunksRef = useRef<Blob[]>([]); // Use ref to store audio chunks during recording
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const faceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null); // Use ref for intervals

  // State and ref for audio detection results and detector instance
  const [audioDetectionResults, setAudioDetectionResults] = useState<AudioDetectionResults | null>(null);
  const audioDetectorRef = useRef<GaussianDFTAudioDetectorFast | null>(null);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);


  // Effect to detect tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examStarted && !examCompleted) {
        setTabSwitchCount(prev => prev + 1);
        setWarnings(prev => [...prev, 'Tab switching detected']);
        socket.emit('suspicious-activity', {
          type: 'tab-switch',
          message: 'Tab switching detected'
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [examStarted, examCompleted]); // Re-run effect if exam state changes

  // Effect to manage the exam timer
  useEffect(() => {
    if (examStarted && timeLeft > 0 && !examCompleted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer); // Cleanup interval on component unmount or state change
    }
    if (timeLeft === 0 && examStarted && !examCompleted) {
      handleSubmit(); // Auto-submit when time runs out
    }
  }, [examStarted, timeLeft, examCompleted]); // Re-run effect based on exam state and time

  // Effect for Socket.IO communication
  useEffect(() => {
    socket.emit('join-exam', examId); // Join a specific exam room
    socket.on('activity-alert', (data) => {
      if (!examCompleted) {
        setWarnings(prev => [...prev, data.message]); // Add incoming alerts to warnings
      }
    });

    return () => {
      socket.off('activity-alert'); // Clean up socket listener
    };
  }, [examId, examCompleted]); // Re-run effect if examId or completion state changes

  // Function to request camera and microphone access
  const requestMediaAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setWebcamStream(stream);
      setMicrophoneStream(stream);
      setHasWebcamAccess(true);
      setHasMicrophoneAccess(true);
      setExamStarted(true); // Start the exam after getting access
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setWarnings(prev => [...prev, 'Camera and microphone access denied. Cannot start exam.']);
      setHasWebcamAccess(false);
      setHasMicrophoneAccess(false);
    }
  };

  // Effect to set up and manage audio recording
  useEffect(() => {
    if (microphoneStream && examStarted && !examCompleted) {
      try {
        const recorder = new MediaRecorder(microphoneStream);
        mediaRecorderRef.current = recorder; // Store recorder in ref
        audioChunksRef.current = []; // Clear chunks on new recording

        // Handle available audio data chunks
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data); // Store chunks in ref
            // Removed socket.emit('audio-chunk', event.data) as processing is done after exam
          }
        };

        // Handle recorder stop - this is where we'll trigger processing
        recorder.onstop = async () => {
          setIsRecording(false);
          // Processing will be triggered in handleSubmit after stopping the recorder
        };

        recorder.start(5000); // Start recording, gathering data every 5 seconds
        setIsRecording(true);

      } catch (error) {
        console.error("Error setting up MediaRecorder:", error);
        setWarnings(prev => [...prev, 'Error starting audio recording.']);
        setIsRecording(false);
      }
    }

    return () => {
      // Stop recording and streams on cleanup
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (microphoneStream) {
         microphoneStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [microphoneStream, examStarted, examCompleted]); // Re-run effect if stream or exam state changes

  // Effect to set up and manage face detection
  useEffect(() => {
    if (hasWebcamAccess && examStarted && !examCompleted) {
      const interval = setInterval(async () => {
        if (webcamRef.current?.video && !examCompleted) {
          const result = await detectFace(webcamRef.current.video); // Perform face detection
          if (!result) return;

          // Use a functional update for setFaceDetected to access the previous state (prevFaceDetected)
          // for accurate transition detection, without needing faceDetected in the useEffect dependencies.
          setFaceDetected(prevFaceDetected => {
            if (result.multipleFaces) { // Check for multiple faces first
              socket.emit('suspicious-activity', {
                type: 'multiple-faces',
                message: 'Multiple faces detected'
              });
              setWarnings(prev => [...prev, 'Multiple faces detected']);
            } else if (!result.faceDetected && prevFaceDetected) {
              // Face was detected, now it's not (and not multiple faces)
              setOutOfFrameCount(prev => prev + 1);
              socket.emit('suspicious-activity', {
                type: 'face-not-detected',
                message: 'No face detected in frame'
              });
              setWarnings(prev => [...prev, 'No face detected in frame']);
            }
            // Return the new state for faceDetected (true if single face, false if no face or multiple faces for simplicity here)
            // The primary purpose of faceDetected state is for UI indicators, warnings are more specific.
            return result.faceDetected && !result.multipleFaces;
          });

          // Check for phone detection
          if (result.phoneDetected) {
            setPhoneUsageCount(prev => prev + 1);
            socket.emit('suspicious-activity', {
              type: 'phone-detected',
              message: 'Eye-Gaze out of screen'
            });
            setWarnings(prev => [...prev, 'Eye-Gaze out of screen']);
          }
        }
      }, 1000); // Run detection every 1 second

      faceDetectionIntervalRef.current = interval; // Store interval ID in ref
      return () => {
        if (faceDetectionIntervalRef.current) {
           clearInterval(faceDetectionIntervalRef.current); // Clear interval on cleanup
           faceDetectionIntervalRef.current = null;
        }
      };
    }
  }, [hasWebcamAccess, examStarted, examCompleted]); // Removed faceDetected from dependencies

  // Removed the audioProcessIntervalRef effect as processing is now done on submit

  // Function to format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handler for answer text area changes
  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].answer = text;
    setQuestions(updatedQuestions);

    // Trigger AI and plagiarism checks if text is long enough and exam is not completed
    if (text.length > 100 && !examCompleted) {
      const [aiResult, plagiarismResult] = await Promise.all([
        detectAIContent(text),
        checkPlagiarism(text)
      ]);

      if (aiResult) {
        setIsAIDetected(true);
        socket.emit('suspicious-activity', {
          type: 'ai-content',
          message: 'Potential AI-generated content detected'
        });
        setWarnings(prev => [...prev, 'AI-generated content detected']);
      }

      if (plagiarismResult?.isPlagiarized) {
        socket.emit('suspicious-activity', {
          type: 'plagiarism',
          message: `Potential plagiarism detected (${Math.round(plagiarismResult.similarity * 100)}% similarity)`
        });
        setWarnings(prev => [...prev, `Plagiarism detected (${Math.round(plagiarismResult.similarity * 100)}% similarity)`]);
      }
    }
  };

  // Function to process the recorded audio blob using the detector
  const processRecordedAudio = async (audioBlob: Blob) => {
    setIsAudioProcessing(true);
    try {
      // Convert Blob to File for the detector
      const audioFile = new File([audioBlob], 'recorded-exam-audio.webm', { type: audioBlob.type });

      if (!audioDetectorRef.current) {
        audioDetectorRef.current = new GaussianDFTAudioDetectorFast();
      }

      const fastStartTime = performance.now();
      // Call the detectSpeech method from the imported detector
      const { speechFrames: fastSpeechFrames, logLikelihood: fastLogLikelihood } =
        await audioDetectorRef.current.detectSpeech(audioFile);
      const fastEndTime = performance.now();

      const fastSpeechPercentage =
        (fastSpeechFrames.filter(Boolean).length / fastSpeechFrames.length) * 100;

      setAudioDetectionResults({
        speechPercentage: fastSpeechPercentage,
        duration: (fastEndTime - fastStartTime) / 1000,
        logLikelihood: fastLogLikelihood,
        speechFrames: fastSpeechFrames
      });

    } catch (error) {
      console.error('Error processing recorded audio:', error);
      setWarnings(prev => [...prev, 'Failed to process recorded audio for speech detection.']);
      setAudioDetectionResults(null); // Clear results on error
    } finally {
      setIsAudioProcessing(false);
    }
  };


  // Handler for submitting the exam
  const handleSubmit = async () => { // Made async to await audio processing
    const hasEmptyAnswers = questions.some(q => !q.answer.trim());
    if (hasEmptyAnswers) {
      setSubmitAttempted(true); // Set flag to show validation errors
      setWarnings(prev => [...prev, 'Please answer all questions before submitting']);
      return; // Prevent submission if questions are unanswered
    }

    // Stop recording before processing
    if (mediaRecorderRef.current && isRecording) {
       mediaRecorderRef.current.stop();
       // The onstop handler will set isRecording to false, but processing starts here
    }

    // Process the recorded audio chunks
    if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Assuming webm type
        await processRecordedAudio(audioBlob); // Wait for audio processing to complete
    } else if (hasMicrophoneAccess && examStarted) {
         // If recording was expected but no chunks, add a warning
         setWarnings(prev => [...prev, 'No audio data was recorded. Microphone may not have been active.']);
    }


    setExamCompleted(true); // Mark exam as completed *after* processing

    // Stop all media streams and cleanup resources
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    // Microphone stream is stopped in the audio recording effect's cleanup or above
    setMicrophoneStream(null); // Ensure state is updated

    if (faceDetectionIntervalRef.current) {
       clearInterval(faceDetectionIntervalRef.current); // Clear interval on cleanup
       faceDetectionIntervalRef.current = null;
    }

    cleanupFaceDetection(); // Call cleanup for face detection library

    // Compile the final list of anomalies for the report
    let aiAnomaly: Anomaly | undefined;
    if (isAIDetected) {
      aiAnomaly = {
        type: 'AI Content',
        count: 1, // Assuming one detection is enough for an anomaly entry
        severity: 'high',
        description: 'Potential use of AI-generated content',
        timestamp: new Date()
      };
    }

    const finalAnomalies: Anomaly[] = [
      {
        type: 'Tab Switching',
        count: tabSwitchCount,
        severity: tabSwitchCount > 5 ? 'high' : tabSwitchCount > 2 ? 'medium' : 'low', // Severity based on count
        description: 'Switched between browser tabs during exam',
        timestamp: new Date()
      },
      {
        type: 'Face Detection',
        count: outOfFrameCount,
        severity: outOfFrameCount > 10 ? 'high' : outOfFrameCount > 5 ? 'medium' : 'low', // Severity based on count
        description: 'Face not detected in camera frame',
        timestamp: new Date()
      },
      {
        type: 'Eye-Gaze out of screen',
        count: phoneUsageCount,
        severity: phoneUsageCount > 3 ? 'high' : phoneUsageCount > 1 ? 'medium' : 'low', // Severity based on count
        description: 'Eye-Gaze out of screen',
        timestamp: new Date()
      },
      ...(aiAnomaly ? [aiAnomaly] : []), // Add AI anomaly if detected
      //  // Add audio anomaly if significant speech was detected (example threshold)
      // ...(audioDetectionResults && audioDetectionResults.speechPercentage > 10 ? [{
      //     type: 'Speech Detected',
      //     count: Math.round(audioDetectionResults.speechPercentage), // Use percentage as count indicator
      //     severity: audioDetectionResults.speechPercentage > 50 ? 'high' : audioDetectionResults.speechPercentage > 20 ? 'medium' : 'low',
      //     description: `Speech detected in ${audioDetectionResults.speechPercentage.toFixed(1)}% of audio`,
      //     timestamp: new Date()
      // }] : []),
    ];
    setAnomalies(finalAnomalies);

    // Prepare exam result data
    const examResult = {
      id: Date.now().toString(), // Simple timestamp ID
      timestamp: new Date(),
      anomalies: finalAnomalies,
      warnings: warnings,
      tabSwitches: tabSwitchCount,
      aiDetected: isAIDetected,
      phoneUsage: phoneUsageCount,
      outOfFrame: outOfFrameCount,
      audioAnalysis: audioDetectionResults // Include audio analysis results
    };
    // Save results to local storage (Note: Not secure for sensitive data)
    const existingResults = JSON.parse(localStorage.getItem('examResults') || '[]');
    localStorage.setItem('examResults', JSON.stringify([examResult, ...existingResults]));

    socket.emit('exam-completed', examResult); // Emit completion event via socket
  };

  // Handler to navigate to the next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Handler to navigate to the previous question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

   // Function to create chart data for audio analysis
  const createAudioChartData = (results: AudioDetectionResults | null) => {
    if (!results) return null;

    return {
      labels: Array.from({ length: results.logLikelihood.length }, (_, i) => i),
      datasets: [
        {
          label: 'Log Likelihood Ratio',
          data: results.logLikelihood,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          pointRadius: 0, // Hide points for smoother line
        },
        {
          label: 'Speech Detected (1=Yes, 0=No)',
          data: results.speechFrames.map((v) => (v ? 1 : 0)),
          borderColor: 'rgb(255, 99, 132)',
          tension: 0,
          stepSize: 1, // Ensure steps for binary data
          pointRadius: 0, // Hide points
          borderWidth: 1, // Make the step line thinner
        }
      ]
    };
  };

  const audioChartData = createAudioChartData(audioDetectionResults);

  // Chart options for audio analysis visualization
  const audioChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to fill container height
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
            color: '#d1d5db', // Light gray text for dark mode
        }
      },
      title: {
        display: true,
        text: 'Audio Speech Detection Results',
        color: '#e5e7eb', // Light gray text for dark mode
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
                label += ': ';
            }
            if (context.dataset.label === 'Speech Detected (1=Yes, 0=No)') {
                label += context.raw === 1 ? 'Speech' : 'No Speech';
            } else {
                label += context.raw.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
            display: true,
            text: 'Audio Frames',
            color: '#d1d5db',
        },
        ticks: {
            color: '#9ca3af', // Gray text for ticks
        },
        grid: {
            color: '#374151', // Darker grid lines
        }
      },
      y: {
        title: {
            display: true,
            text: 'Value',
            color: '#d1d5db',
        },
        min: -2, // Keep fixed scale as in the original audio code
        max: 2,
         ticks: {
            color: '#9ca3af',
        },
         grid: {
            color: '#374151',
        }
      }
    }
  };


  // Render the exam completion screen
  if (examCompleted) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-8 text-gray-800 dark:text-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Exam Completed</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Your answers have been submitted successfully</p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
                <ShieldAlert className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                <span>Proctor Report Summary</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Display anomaly summary cards */}
                {anomalies.map((anomaly, index) => (
                  <motion.div
                    key={index}
                    className={`p-6 rounded-2xl border ${
                      anomaly.severity === 'high'
                        ? 'bg-red-50 border-red-100 dark:bg-red-950 dark:border-red-900'
                        : anomaly.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-100 dark:bg-yellow-950 dark:border-yellow-900'
                        : 'bg-green-50 border-green-100 dark:bg-green-950 dark:border-green-900'
                    } text-gray-800 dark:text-gray-200`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">{anomaly.type}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{anomaly.description}</p>
                      </div>
                      <span className={`text-2xl font-bold ${
                        anomaly.severity === 'high'
                          ? 'text-red-600 dark:text-red-400'
                          : anomaly.severity === 'medium'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {anomaly.count}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Display Audio Analysis Results */}
              {isAudioProcessing && (
                 <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">Analyzing recorded audio...</p>
                  </div>
              )}

              {audioDetectionResults && (
                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950 rounded-2xl border border-blue-100 dark:border-blue-900">
                   <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center space-x-2">
                       <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                       <span>Audio Analysis Results (FFT)</span>
                   </h4>
                   <div className="space-y-2 text-gray-600 dark:text-gray-300">
                       <p>
                           Speech detected in{' '}
                           <span className="font-semibold text-blue-600 dark:text-blue-400">
                               {audioDetectionResults.speechPercentage.toFixed(1)}%
                           </span>{' '}
                           of the recorded audio.
                       </p>
                        <p>
                           Analysis time:{' '}
                           <span className="font-semibold text-blue-600 dark:text-blue-400">
                               {audioDetectionResults.duration.toFixed(2)}s
                           </span>
                       </p>
                   </div>
                   {/* Audio Analysis Chart */}
                   {audioChartData && (
                       <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm" style={{ height: '300px' }}>
                           <Line
                               data={audioChartData}
                               options={audioChartOptions as any} // Cast to any to avoid strict type issues with chartjs types
                           />
                       </div>
                   )}
                </div>
              )}


              {warnings.length > 0 && (
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 rounded-2xl">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Suspicious Activities Timeline</h4>
                  <div className="space-y-4">
                    {/* Display timeline of warnings */}
                    <AnimatePresence>
                      {warnings.map((warning, index) => (
                        <motion.div
                          key={index}
                          className="flex items-center space-x-3 text-gray-700 dark:text-gray-300"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <AlertTriangle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                          <span>{warning}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Link back to dashboard */}
            <motion.div
              className="mt-8 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold flex items-center space-x-3 shadow-lg shadow-blue-200/50 hover:shadow-xl hover:scale-105 transition-all duration-200 dark:from-blue-700 dark:to-indigo-700 dark:shadow-blue-900/50"
              >
                <Home className="w-5 h-5" />
                <span>Return to Dashboard</span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Render screen requesting media access if not granted
  if (!hasWebcamAccess || !hasMicrophoneAccess) {
    return (
      <motion.div
        className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-8 text-center text-gray-800 dark:text-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Display relevant icon based on missing access */}
        {!hasWebcamAccess && !hasMicrophoneAccess && (
            <Camera className="w-16 h-16 text-blue-500 dark:text-blue-400" />
        )}
        {hasWebcamAccess && !hasMicrophoneAccess && (
            <MicOff className="w-16 h-16 text-red-500 dark:text-red-400" />
        )}
          {!hasWebcamAccess && hasMicrophoneAccess && (
            <MonitorX className="w-16 h-16 text-red-500 dark:text-red-400" />
        )}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {!hasWebcamAccess && !hasMicrophoneAccess ? 'Camera and Microphone Access Required' :
            !hasWebcamAccess ? 'Camera Access Required' : 'Microphone Access Required'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">
          To ensure exam integrity, we need access to your {`${!hasWebcamAccess && !hasMicrophoneAccess ? 'camera and microphone' : !hasWebcamAccess ? 'camera' : 'microphone'}`} for proctoring.
          Please allow access to continue.
        </p>
        {/* Display warnings related to access denial */}
        {warnings.map((warning, index) => (
            <motion.div
              key={index}
              className="flex items-center space-x-2 text-red-600 bg-red-100 p-3 rounded-lg dark:bg-red-900 dark:text-red-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AlertTriangle className="w-5 h-5" />
              <span>{warning}</span>
            </motion.div>
        ))}
        {/* Button to request media access */}
        <motion.button
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-2xl font-semibold flex items-center space-x-3 shadow-lg shadow-green-200/50 hover:shadow-xl hover:scale-105 transition-all duration-200 dark:from-green-600 dark:to-teal-700 dark:shadow-green-900/50"
            onClick={requestMediaAccess}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
        >
            <Camera className="w-5 h-5" />
            <Mic className="w-5 h-5" />
            <span>Enable Camera & Mic</span>
        </motion.button>
        {/* Hidden webcam component used for initial permission request if audio={true} */}
        <Webcam
          ref={webcamRef}
          audio={true} // Request audio permission here as well
          onUserMedia={() => {
            // This callback fires when media is successfully accessed
            // State updates (setHasWebcamAccess, setHasMicrophoneAccess) are handled in requestMediaAccess
          }}
          className="hidden"
        />
      </motion.div>
    );
  }

  // Render the main exam session UI
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gray-900 min-h-screen p-6 text-gray-100">
      {/* Main Exam Content Area */}
      <div className="lg:col-span-2 space-y-4">
        <motion.div
          className="bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between items-center mb-6">
            {/* Question navigation header */}
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 text-transparent bg-clip-text">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h2>
            {/* Timer display */}
            <motion.div
              className="px-6 py-3 bg-gray-700 rounded-full flex items-center space-x-3"
              animate={{ scale: timeLeft <= 300 ? [1, 1.1, 1] : 1 }} // Pulse animation when time is low
              transition={{ repeat: timeLeft <= 300 ? Infinity : 0, duration: 1 }}
            >
              <Clock className={`w-5 h-5 ${timeLeft <= 300 ? 'text-red-400' : 'text-purple-400'}`} />
              <span className={`font-semibold ${timeLeft <= 300 ? 'text-red-400' : 'text-gray-100'}`}>
                {formatTime(timeLeft)}
              </span>
            </motion.div>
          </div>
          {/* Question text */}
          <div className="prose max-w-none">
            <p className="text-gray-300 text-lg">
              {questions[currentQuestionIndex].text}
            </p>
          </div>
          {/* Answer text area and navigation */}
          <div className="mt-8 space-y-6">
            <div className="relative">
              <textarea
                className={`w-full h-64 p-6 bg-gray-700 text-gray-100 border ${
                  submitAttempted && !questions[currentQuestionIndex].answer.trim()
                    ? 'border-red-600 focus:ring-red-500' // Highlight if empty on submit attempt
                    : 'border-gray-600 focus:ring-purple-500'
                } rounded-2xl focus:ring-2 focus:border-transparent resize-none`}
                placeholder="Type your answer here..."
                value={questions[currentQuestionIndex].answer}
                onChange={handleTextChange}
              />
              {/* Validation message for empty answer */}
              {submitAttempted && !questions[currentQuestionIndex].answer.trim() && (
                <p className="text-red-500 text-sm mt-2">This question requires an answer</p>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between space-x-4">
              <motion.button
                className="px-6 py-4 bg-gray-700 text-gray-300 rounded-2xl font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0} // Disable on the first question
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </motion.button>

              {/* Submit button on the last question, otherwise Next button */}
              {currentQuestionIndex === questions.length - 1 ? (
                <motion.button
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-2xl font-semibold flex items-center justify-center space-x-3 shadow-lg shadow-purple-900/50 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgb(99 102 241 / 0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={isAudioProcessing} // Disable submit while audio is processing
                >
                  <Send className="w-5 h-5" />
                  <span>{isAudioProcessing ? 'Processing Audio...' : 'Submit All Answers'}</span>
                </motion.button>
              ) : (
                <motion.button
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center space-x-3 shadow-lg shadow-blue-200/50 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextQuestion}
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
            </div>

            {/* Question navigation dots */}
            <div className="flex justify-center space-x-2">
              {questions.map((_, index) => (
                <motion.div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentQuestionIndex
                      ? 'bg-purple-500' // Current question dot
                      : questions[index].answer.trim()
                      ? 'bg-green-500' // Answered question dot
                      : 'bg-gray-600' // Unanswered question dot
                  }`}
                  whileHover={{ scale: 1.2 }}
                  onClick={() => setCurrentQuestionIndex(index)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Proctoring Sidebar */}
      <div className="space-y-4">
        {/* Live Webcam Feed */}
        <motion.div
          className="bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Live Invigilation Screen</span>
            </h3>
          </div>
          <div className="p-4">
            <Webcam
              ref={webcamRef}
              className="w-full rounded-2xl"
              mirrored // Mirror the user's view
              videoConstraints={{ facingMode: "user" }}
              audio={false} // Audio handled separately
            />
          </div>
        </motion.div>

        {/* Activity Monitor */}
        <motion.div
          className="bg-gray-800 rounded-3xl shadow-2xl border border-red-900/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <span>Activity Monitor</span>
            </h3>
          </div>
          <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
            {/* Display real-time warnings and status */}
            <AnimatePresence>
              {!faceDetected && (
                <motion.div
                  className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-2xl dark:bg-red-900 dark:text-red-300"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Face not detected</span>
                </motion.div>
              )}
              {warnings.map((warning, index) => (
                <motion.div
                  key={index}
                  className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-4 rounded-2xl dark:bg-amber-900 dark:text-amber-300"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{warning}</span>
                </motion.div>
              ))}
              {isAIDetected && (
                <motion.div
                  className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-2xl dark:bg-red-900 dark:text-red-300"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Potential AI-generated content detected</span>
                </motion.div>
              )}
              {/* Audio recording status indicators */}
              {!isRecording && hasMicrophoneAccess && examStarted && (
                    <motion.div
                      className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 p-4 rounded-2xl dark:bg-yellow-900 dark:text-yellow-300"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                      <MicOff className="w-4 h-4" />
                      <span>Audio recording not active</span>
                    </motion.div>
                )}
                  {isRecording && hasMicrophoneAccess && examStarted && (
                    <motion.div
                      className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-2xl dark:bg-green-900 dark:text-green-300"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                      <Mic className="w-4 h-4" />
                      <span>Audio recording active</span>
                    </motion.div>
                  )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Integrity Guard Status */}
        <motion.div
          className={`bg-gradient-to-r ${
            faceDetected && isRecording // Status based on face detection and recording
              ? 'from-emerald-400 to-green-500 dark:from-emerald-600 dark:to-green-600'
              : 'from-red-500 to-pink-500 dark:from-red-600 dark:to-pink-600'
          } rounded-3xl shadow-xl p-4 text-white`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <Mic className="w-5 h-5" />
            <span>IntegrityGuard {faceDetected && isRecording ? 'Active' : 'Monitoring Warning'}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
