import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://skeptic-tipping-hatchling.ngrok-free.dev';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds timeout
});

// Request interceptor to automatically inject the Bearer JWT token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('apex_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Handles throwing consistent user-friendly error messages
 */
const handleError = (error) => {
  console.error('API Error details:', error);
  
  if (error.response && error.response.data) {
    if (typeof error.response.data.detail === 'string') {
      throw new Error(error.response.data.detail);
    } else if (Array.isArray(error.response.data.detail)) {
      const validationMsgs = error.response.data.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ');
      throw new Error(`Validation Error: ${validationMsgs}`);
    } else if (error.response.data.message) {
      throw new Error(error.response.data.message);
    }
  }
  
  if (error.code === 'ECONNABORTED') {
    throw new Error('Request timed out. Please try again.');
  }
  
  throw new Error(error.message || 'Connection failure. Please check if the backend is running.');
};

/**
 * Authenticates user credentials against the backend database.
 */
export const loginUser = async (username, password) => {
  try {
    const response = await apiClient.post('/auth/login', { username, password });
    if (response.data.access_token) {
      localStorage.setItem('apex_token', response.data.access_token);
      localStorage.setItem('apex_user', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Registers a new user on the backend database.
 */
export const registerUser = async (username, password, name) => {
  try {
    const response = await apiClient.post('/auth/register', { username, password, name });
    if (response.data.access_token) {
      localStorage.setItem('apex_token', response.data.access_token);
      localStorage.setItem('apex_user', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Clears active session tokens from local storage.
 */
export const logoutUser = () => {
  localStorage.removeItem('apex_token');
  localStorage.removeItem('apex_user');
};

/**
 * Sends validated financial input to the backend to generate AI personalized advice.
 */
export const generateAdvice = async (financialData) => {
  try {
    const response = await apiClient.post('/generate-advice', financialData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Sends a follow-up chat message with advice context to the backend.
 */
export const sendChatMessage = async (chatPayload) => {
  try {
    const response = await apiClient.post('/chat', chatPayload);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Fetches all past advising history reports from the backend JSON database.
 */
export const getAdviceHistory = async () => {
  try {
    const response = await apiClient.get('/history');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Fetches past stress simulation records from the backend.
 */
export const getSimulationHistory = async () => {
  try {
    const response = await apiClient.get('/simulation/history');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Fetches list of past boardroom deliberation sessions.
 */
export const getBoardroomSessions = async () => {
  try {
    const response = await apiClient.get('/agent-observatory/sessions');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Fetches the details/transcripts for a specific boardroom session.
 */
export const getBoardroomSessionDetails = async (sessionId) => {
  try {
    const response = await apiClient.get(`/agent-observatory/${sessionId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Invokes the backend generator to populate sample reports, stress simulations, and debate sessions.
 */
export const populateSampleHistory = async () => {
  try {
    const response = await apiClient.post('/history/populate-samples');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Deletes a historical advice report.
 */
export const deleteAdviceReport = async (reportId) => {
  try {
    const response = await apiClient.delete(`/history/${reportId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Deletes a historical simulation log.
 */
export const deleteSimulation = async (simulationId) => {
  try {
    const response = await apiClient.delete(`/simulation/${simulationId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Deletes an entire boardroom courtroom debate session.
 */
export const deleteObservatorySession = async (sessionId) => {
  try {
    const response = await apiClient.delete(`/agent-observatory/${sessionId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Upload a bank statement file (PDF, CSV, Excel, TXT) to the backend.
 * Returns parsed transactions with AI categorization + confidence scores.
 */
export const uploadStatement = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Bypass apiClient to prevent global 'application/json' Content-Type from breaking multipart boundaries
    const token = localStorage.getItem('apex_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await axios.post(`${API_BASE_URL}/upload-statement`, formData, {
      headers,
      timeout: 90000, // PDF/Image parsing can take longer
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Enrich manually entered raw transaction JSON with AI categorization.
 */
export const parseRawTransactions = async (transactions) => {
  try {
    const response = await apiClient.post('/parse-transactions', { transactions });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Fetch persisted user transactions or synthetic demo transactions.
 */
export const getTransactions = async () => {
  try {
    const response = await apiClient.get('/transactions');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Fetch synthetic 6-month demo transactions from the backend.
 */
export const getSyntheticData = async () => {
  try {
    const response = await apiClient.get('/synthetic-data');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Health check endpoint
 */
export const checkBackendHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    return { status: 'offline', gemini_api_configured: false };
  }
};
