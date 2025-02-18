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
const API_BASE_URL = 'http://127.0.0.1:5000/api';
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 5000 // 5 seconds timeout
});

const CallManager = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [activeCalls, setActiveCalls] = useState([]);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [loading, setLoading] = useState(false);

  const testConnection = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/active-calls');
      console.log('Backend connection test successful:', response.data);
    } catch (error) {
      console.error('Backend connection test failed:', error);
      showNotification('Error connecting to backend server', 'error');
    }
  }, []);

  const fetchActiveCalls = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/active-calls');
      setActiveCalls(response.data);
    } catch (error) {
      console.error('Error fetching active calls:', error);
    }
  }, []);

  // Test connection on component mount
  useEffect(() => {
    testConnection();
    const interval = setInterval(fetchActiveCalls, 5000);
    return () => clearInterval(interval);
  }, [testConnection, fetchActiveCalls]);

  const handleMakeCall = async () => {
    if (!phoneNumber) {
      showNotification('Please enter a phone number', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('Making call request to:', `${API_BASE_URL}/make-call`);
      console.log('Request payload:', { phone_number: phoneNumber, message });
      
      const response = await axiosInstance.post('/make-call', {
        phone_number: phoneNumber,
        message: message || undefined
      });
      
      console.log('Call response:', response.data);

      if (response.data.status === 'success') {
        showNotification('Call initiated successfully!', 'success');
        setShowCallDialog(false);
        fetchActiveCalls();
      } else {
        showNotification(`Failed to initiate call: ${response.data.message}`, 'error');
      }
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        request: error.request
      });
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      showNotification(`Error making call: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async (callSid) => {
    try {
      const response = await axiosInstance.post('/end-call', {
        call_sid: callSid
      });

      if (response.data.status === 'success') {
        showNotification('Call ended successfully', 'success');
        fetchActiveCalls();
      } else {
        showNotification(response.data.message || 'Failed to end call', 'error');
      }
    } catch (error) {
      console.error('Error ending call:', error);
      showNotification(error.response?.data?.error || 'Error ending call', 'error');
    }
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
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
          mb: 4,
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
          {activeCalls.map((call, index) => (
            <React.Fragment key={call.call_sid}>
              {index > 0 && <Divider sx={{ my: 1 }} />}
              <ListItem
                sx={{
                  py: 2,
                  px: 3,
                  '&:hover': {
                    bgcolor: 'background.default',
                  },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => handleEndCall(call.call_sid)}
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
                }
              >
                <ListItemText
                  primary={
                    <Typography variant="h6" sx={{ fontFamily: 'Marcellus' }}>
                      {call.to_number}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Duration: {call.duration}s | Status: {call.status}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
          {activeCalls.length === 0 && (
            <ListItem sx={{ py: 4 }}>
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
        onClose={() => setShowCallDialog(false)}
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
            disabled={loading}
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
