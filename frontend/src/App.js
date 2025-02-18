import React, { useState, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  AppBar,
  ThemeProvider,
  CssBaseline,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers';
import MicIcon from '@mui/icons-material/Mic';
import axios from 'axios';
import CallManager from './components/CallManager';
import IncomingCallHandler from './components/IncomingCallHandler';
import theme from './theme';

// Add Google Fonts link
const googleFontsLink = document.createElement('link');
googleFontsLink.rel = 'stylesheet';
googleFontsLink.href = 'https://fonts.googleapis.com/css2?family=Marcellus&family=Playfair+Display:wght@400;500;600&display=swap';
document.head.appendChild(googleFontsLink);

const API_BASE_URL = 'http://localhost:5000/api';

function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    clientName: '',
    datetime: new Date(),
    purpose: ''
  });
  const [tabValue, setTabValue] = useState(0);
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await axios.post(`${API_BASE_URL}/speech-to-text`, formData);
      const text = response.data.text;

      setConversation(prev => [...prev, { type: 'user', text }]);
      
      // Process the text and get AI response
      // This is where you'd implement the logic to understand the user's intent
      // and generate appropriate responses
      const aiResponse = await processUserInput(text);
      setConversation(prev => [...prev, { type: 'ai', text: aiResponse }]);
      
      // Convert AI response to speech
      const speechResponse = await axios.post(`${API_BASE_URL}/text-to-speech`, {
        text: aiResponse,
        language: 'en-US'
      });
      
      // Play the audio response
      const audio = new Audio(`data:audio/mp3;base64,${speechResponse.data.audio}`);
      audio.play();
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  };

  const processUserInput = async (text) => {
    // Simple logic to detect appointment booking intent
    if (text.toLowerCase().includes('appointment') || text.toLowerCase().includes('book')) {
      setShowAppointmentDialog(true);
      return "I'll help you book an appointment. Please provide your details in the form that appears.";
    }
    
    // Add more intent detection and response logic here
    return "How else can I assist you today?";
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAppointmentSubmit = async () => {
    try {
      await axios.post(`${API_BASE_URL}/appointments`, appointmentData);
      setShowAppointmentDialog(false);
      setConversation(prev => [...prev, {
        type: 'ai',
        text: `Great! I've booked your appointment for ${appointmentData.datetime.toLocaleString()}`
      }]);
    } catch (error) {
      console.error('Error booking appointment:', error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ 
          minHeight: '100vh',
          bgcolor: 'background.default',
          pt: 4,
          pb: 8
        }}>
          <Container maxWidth="lg">
            <Box sx={{ 
              textAlign: 'center',
              mb: 6
            }}>
              <Typography 
                variant="h2" 
                component="h1" 
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}
              >
                AI Receptionist
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  maxWidth: '600px',
                  mx: 'auto',
                  mb: 4,
                  fontFamily: 'Marcellus'
                }}
              >
                Elegant and Professional Call Management System
              </Typography>
            </Box>

            <Paper 
              elevation={0}
              sx={{ 
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'secondary.light'
              }}
            >
              <AppBar 
                position="static" 
                color="default" 
                elevation={0}
                sx={{
                  bgcolor: 'secondary.light',
                  borderBottom: '1px solid',
                  borderColor: 'secondary.main'
                }}
              >
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  variant="fullWidth"
                  sx={{
                    '& .MuiTab-root': {
                      fontSize: '1.1rem',
                      fontFamily: 'Marcellus',
                      py: 2
                    }
                  }}
                >
                  <Tab label="Outbound Calls" />
                  <Tab label="Incoming Calls" />
                  <Tab label="Voice Chat" />
                  <Tab label="Appointments" />
                </Tabs>
              </AppBar>

              <Box sx={{ p: { xs: 2, md: 4 } }}>
                <TabPanel value={tabValue} index={0}>
                  <CallManager />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <IncomingCallHandler />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Paper 
                    sx={{ 
                      p: 3,
                      height: '400px',
                      overflow: 'auto',
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'secondary.light'
                    }}
                  >
                    {conversation.map((msg, index) => (
                      <Box key={index} sx={{ mb: 1, textAlign: msg.type === 'user' ? 'right' : 'left' }}>
                        <Typography
                          sx={{
                            display: 'inline-block',
                            bgcolor: msg.type === 'user' ? 'primary.light' : 'grey.200',
                            p: 1,
                            borderRadius: 1
                          }}
                        >
                          {msg.text}
                        </Typography>
                      </Box>
                    ))}
                    <Button
                      variant="contained"
                      color={isRecording ? "secondary" : "primary"}
                      startIcon={<MicIcon />}
                      onClick={isRecording ? stopRecording : startRecording}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </Button>
                  </Paper>
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                  <Dialog open={showAppointmentDialog} onClose={() => setShowAppointmentDialog(false)}>
                    <DialogTitle>Book Appointment</DialogTitle>
                    <DialogContent>
                      <TextField
                        autoFocus
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={appointmentData.clientName}
                        onChange={(e) => setAppointmentData(prev => ({ ...prev, clientName: e.target.value }))}
                      />
                      <DateTimePicker
                        label="Date & Time"
                        value={appointmentData.datetime}
                        onChange={(newValue) => setAppointmentData(prev => ({ ...prev, datetime: newValue }))}
                        renderInput={(params) => <TextField {...params} fullWidth sx={{ mt: 2 }} />}
                      />
                      <TextField
                        margin="dense"
                        label="Purpose"
                        fullWidth
                        multiline
                        rows={4}
                        value={appointmentData.purpose}
                        onChange={(e) => setAppointmentData(prev => ({ ...prev, purpose: e.target.value }))}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setShowAppointmentDialog(false)}>Cancel</Button>
                      <Button onClick={handleAppointmentSubmit} variant="contained">Book</Button>
                    </DialogActions>
                  </Dialog>
                  <Typography variant="body1" color="text.secondary" align="center">
                    Appointment management coming soon...
                  </Typography>
                </TabPanel>
              </Box>
            </Paper>
          </Container>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
