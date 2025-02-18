import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Phone as PhoneIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 5000
});

const IncomingCallHandler = () => {
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [responseText, setResponseText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchIncomingCalls = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/incoming-calls');
      setIncomingCalls(response.data);
    } catch (error) {
      console.error('Error fetching incoming calls:', error);
    }
  }, []);

  const fetchTranscript = useCallback(async (callSid) => {
    try {
      const response = await axiosInstance.get('/call-transcript', {
        params: { call_sid: callSid }
      });
      if (response.data.status === 'success') {
        setTranscript(response.data.transcript);
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
    }
  }, []);

  useEffect(() => {
    fetchIncomingCalls();
    const interval = setInterval(fetchIncomingCalls, 3000);
    return () => {
      clearInterval(interval);
      if (audioPlayer) {
        audioPlayer.pause();
      }
    };
  }, [fetchIncomingCalls]);

  useEffect(() => {
    if (activeCall) {
      const interval = setInterval(() => fetchTranscript(activeCall.call_sid), 2000);
      return () => clearInterval(interval);
    }
  }, [activeCall, fetchTranscript]);

  const handleAnswerCall = async (callSid) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/answer-call', { call_sid: callSid });
      if (response.data.status === 'success') {
        const call = incomingCalls.find(call => call.call_sid === callSid);
        setActiveCall(call);
        setTranscript([]);
      }
    } catch (error) {
      console.error('Error answering call:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    
    setLoading(true);
    try {
      await axiosInstance.post('/end-call', { call_sid: activeCall.call_sid });
      setActiveCall(null);
      setTranscript([]);
      setResponseText('');
      if (audioPlayer) {
        audioPlayer.pause();
        setAudioPlayer(null);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async () => {
    if (!activeCall || !responseText.trim()) return;

    setLoading(true);
    try {
      const response = await axiosInstance.post('/respond-to-call', {
        call_sid: activeCall.call_sid,
        message: responseText
      });

      if (response.data.status === 'success') {
        setResponseText('');
        fetchTranscript(activeCall.call_sid);
      }
    } catch (error) {
      console.error('Error sending response:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = (recordingUrl) => {
    if (isPlaying && audioPlayer) {
      audioPlayer.pause();
      setIsPlaying(false);
      setAudioPlayer(null);
      return;
    }

    const audio = new Audio(recordingUrl);
    audio.onended = () => {
      setIsPlaying(false);
      setAudioPlayer(null);
    };
    audio.play();
    setIsPlaying(true);
    setAudioPlayer(audio);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      {!activeCall ? (
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
            Incoming Calls
          </Typography>
          <List>
            {incomingCalls.map((call, index) => (
              <React.Fragment key={call.call_sid}>
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
                        {call.from_number}
                      </Typography>
                    }
                    secondary={`Status: ${call.status}`}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PhoneIcon />}
                    onClick={() => handleAnswerCall(call.call_sid)}
                    disabled={loading}
                    sx={{ ml: 2 }}
                  >
                    {loading ? 'Answering...' : 'Answer'}
                  </Button>
                </ListItem>
              </React.Fragment>
            ))}
            {incomingCalls.length === 0 && (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      color="text.secondary" 
                      align="center"
                      sx={{ fontFamily: 'Marcellus' }}
                    >
                      No incoming calls
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Paper>
      ) : (
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography 
                variant="h5"
                sx={{
                  fontFamily: 'Playfair Display',
                  fontWeight: 500,
                  color: 'primary.main'
                }}
              >
                Active Call: {activeCall.from_number}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Status: {activeCall.status}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeCall.recording_url && (
                <Tooltip title={isPlaying ? "Pause Recording" : "Play Recording"}>
                  <IconButton 
                    onClick={() => handlePlayRecording(activeCall.recording_url)}
                    color="primary"
                  >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="View Full Transcript">
                <IconButton 
                  onClick={() => setShowTranscriptDialog(true)}
                  color="primary"
                >
                  <ArticleIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                color="error"
                startIcon={<CallEndIcon />}
                onClick={handleEndCall}
                disabled={loading}
              >
                {loading ? 'Ending...' : 'End Call'}
              </Button>
            </Box>
          </Box>

          <Paper 
            sx={{ 
              height: '300px', 
              p: 2, 
              mb: 3, 
              overflow: 'auto',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'secondary.light'
            }}
          >
            {transcript.map((msg, index) => (
              <Box 
                key={index} 
                sx={{ 
                  mb: 2,
                  textAlign: msg.type === 'user' ? 'left' : 'right'
                }}
              >
                <Typography
                  sx={{
                    display: 'inline-block',
                    bgcolor: msg.type === 'user' ? 'secondary.light' : 'primary.light',
                    color: msg.type === 'user' ? 'text.primary' : 'common.white',
                    p: 2,
                    borderRadius: 2,
                    maxWidth: '80%',
                    fontFamily: 'Marcellus'
                  }}
                >
                  {msg.text}
                </Typography>
              </Box>
            ))}
          </Paper>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your response..."
              disabled={loading}
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: 'Marcellus'
                }
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendResponse}
              disabled={loading || !responseText.trim()}
              sx={{ px: 4 }}
            >
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </Paper>
      )}

      <Dialog 
        open={showTranscriptDialog} 
        onClose={() => setShowTranscriptDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Playfair Display' }}>
          Call Transcript
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, maxHeight: '60vh', overflow: 'auto' }}>
            {transcript.map((msg, index) => (
              <Box 
                key={index} 
                sx={{ 
                  mb: 2,
                  display: 'flex',
                  flexDirection: msg.type === 'user' ? 'row' : 'row-reverse'
                }}
              >
                <Box
                  sx={{
                    maxWidth: '80%',
                    bgcolor: msg.type === 'user' ? 'secondary.light' : 'primary.light',
                    color: msg.type === 'user' ? 'text.primary' : 'common.white',
                    p: 2,
                    borderRadius: 2,
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      mb: 1,
                      opacity: 0.8
                    }}
                  >
                    {msg.type === 'user' ? 'Caller' : 'AI Receptionist'}
                  </Typography>
                  <Typography sx={{ fontFamily: 'Marcellus' }}>
                    {msg.text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTranscriptDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncomingCallHandler;
