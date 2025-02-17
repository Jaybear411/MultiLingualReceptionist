import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import MicIcon from '@mui/icons-material/Mic';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    clientName: '',
    datetime: new Date(),
    purpose: ''
  });
  
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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            AI Receptionist
          </Typography>
          
          <Paper sx={{ p: 2, height: '400px', overflow: 'auto', mb: 2 }}>
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
          </Paper>

          <Button
            variant="contained"
            color={isRecording ? "secondary" : "primary"}
            startIcon={<MicIcon />}
            onClick={isRecording ? stopRecording : startRecording}
            fullWidth
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
        </Box>

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
      </Container>
    </LocalizationProvider>
  );
}

export default App;
