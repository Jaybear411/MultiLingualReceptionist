import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';
import {
  Phone as PhoneIcon,
  CallEnd as CallEndIcon,
  PhoneDisabled as PhoneDisabledIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import axios from 'axios';

// Update API configuration
const API_BASE_URL = 'http://localhost:5001/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000,
  withCredentials: false
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(request => {
  console.log('Starting Request:', {
    url: request.url,
    method: request.method,
    data: request.data,
    headers: request.headers
  });
  return request;
}, error => {
  console.error('Request Error:', error);
  return Promise.reject(error);
});

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  response => {
    console.log('Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });
    
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error.message === 'Network Error') {
      errorMessage = 'Cannot connect to the server. Please check if the backend server is running and refresh the page.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    
    return Promise.reject(new Error(errorMessage));
  }
);

const CallManager = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [activeCalls, setActiveCalls] = useState([]);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  }, []);

  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  // Test connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing API connection...');
        const response = await axiosInstance.get('/test');
        console.log('API test response:', response.data);
        showNotification('Connected to server successfully!', 'success');
      } catch (error) {
        console.error('API connection test failed:', error);
        showNotification('Failed to connect to server. Please check if the backend is running.', 'error');
      }
    };

    testConnection();
  }, [showNotification]);

  const fetchActiveCalls = useCallback(async () => {
    try {
      console.log('Fetching active calls...');
      const response = await axiosInstance.get('/active-calls');
      console.log('Active calls response:', response.data);
      setActiveCalls(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching active calls:', error);
      showNotification('Error fetching active calls', 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    fetchActiveCalls();
    const interval = setInterval(fetchActiveCalls, 3000);
    return () => clearInterval(interval);
  }, [fetchActiveCalls]);

  const handleMakeCall = async () => {
    if (!phoneNumber) {
      showNotification('Please enter a phone number', 'error');
      return;
    }

    // Format phone number
    let formattedNumber = phoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }

    setLoading(true);
    try {
      console.log('Making call request:', {
        phone_number: formattedNumber,
        message: message
      });

      const response = await axiosInstance.post('/make-call', {
        phone_number: formattedNumber,
        message: message
      });

      console.log('Call response:', response.data);

      if (response.data.status === 'success') {
        showNotification('Call initiated successfully', 'success');
        setShowCallDialog(false);
        setPhoneNumber('');
        setMessage('');
        fetchActiveCalls();
      } else {
        throw new Error(response.data.message || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error making call:', error);
      showNotification(error.message || 'Failed to initiate call. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async (callSid) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/end-call', { call_sid: callSid });
      if (response.data.status === 'success') {
        showNotification('Call ended successfully', 'success');
        fetchActiveCalls();
      }
    } catch (error) {
      console.error('Error ending call:', error);
      showNotification('Failed to end call. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PhoneIcon />}
          onClick={() => setShowCallDialog(true)}
          sx={{
            py: 2,
            px: 4,
            fontSize: '1.1rem',
            fontFamily: 'Marcellus',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
            },
          }}
        >
          Make New Call
        </Button>
      </Box>

      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          border: '1px solid',
          borderColor: 'secondary.light',
          borderRadius: 2,
          bgcolor: 'background.paper'
        }}
      >
        <Typography 
          variant="h5" 
          gutterBottom
          sx={{
            fontFamily: 'Playfair Display',
            fontWeight: 500,
            color: 'primary.main',
            mb: 3
          }}
        >
          Active Calls
        </Typography>
        <List>
          {(Array.isArray(activeCalls) ? activeCalls : []).map((call, index) => (
            <React.Fragment key={call?.call_sid || index}>
              {index > 0 && <Divider sx={{ my: 1 }} />}
              <ListItem
                sx={{
                  py: 2,
                  '&:hover': {
                    bgcolor: 'background.default',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="h6" sx={{ fontFamily: 'Marcellus' }}>
                      {call?.to_number || 'Unknown Number'}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Duration: {call?.duration || 0}s | Status: {call?.status || 'unknown'}
                      </Typography>
                    </Box>
                  }
                />
                <IconButton
                  edge="end"
                  color="error"
                  onClick={() => call?.call_sid && handleEndCall(call.call_sid)}
                  disabled={loading || !call?.call_sid}
                  sx={{
                    border: '1px solid',
                    borderColor: 'error.main',
                    '&:hover': {
                      bgcolor: 'error.light',
                    },
                  }}
                >
                  <CallEndIcon />
                </IconButton>
              </ListItem>
            </React.Fragment>
          ))}
          {(!Array.isArray(activeCalls) || activeCalls.length === 0) && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    align="center"
                    sx={{ fontFamily: 'Marcellus' }}
                  >
                    No active calls
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <Dialog 
        open={showCallDialog} 
        onClose={() => !loading && setShowCallDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: 'background.paper',
            minWidth: { xs: '90%', sm: 400 }
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center',
          fontFamily: 'Playfair Display',
          fontSize: '1.5rem',
          pb: 1
        }}>
          Make a Call
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Phone Number"
            type="tel"
            fullWidth
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1234567890"
            disabled={loading}
            sx={{ 
              mb: 3,
              '& label': { fontFamily: 'Marcellus' },
              '& input': { fontFamily: 'Marcellus' }
            }}
          />
          <TextField
            margin="dense"
            label="Message (Optional)"
            fullWidth
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message to be spoken..."
            disabled={loading}
            sx={{ 
              '& label': { fontFamily: 'Marcellus' },
              '& textarea': { fontFamily: 'Marcellus' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
          <Button
            onClick={() => setShowCallDialog(false)}
            startIcon={<PhoneDisabledIcon />}
            disabled={loading}
            sx={{ 
              fontFamily: 'Marcellus',
              color: 'text.secondary'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMakeCall}
            variant="contained"
            color="primary"
            startIcon={<PhoneIcon />}
            disabled={loading || !phoneNumber.trim()}
            sx={{ 
              fontFamily: 'Marcellus',
              px: 3
            }}
          >
            {loading ? 'Initiating Call...' : 'Call'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ 
            width: '100%',
            fontFamily: 'Marcellus',
            '& .MuiAlert-message': { fontFamily: 'Marcellus' }
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CallManager;
