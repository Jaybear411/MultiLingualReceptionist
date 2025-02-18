from twilio.twiml.voice_response import VoiceResponse, Gather
from google.cloud import speech
from google.cloud import texttospeech
import os
from datetime import datetime
import logging
from ai_handler import AIHandler

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize AI handler
ai_handler = AIHandler()

def handle_incoming_call():
    """Handle initial incoming call"""
    try:
        logger.info("Handling incoming call")
        response = VoiceResponse()
        
        # Start recording the call
        response.record(
            action='/webhook/recording-complete',
            recordingStatusCallback='/webhook/recording-status',
            recordingStatusCallbackEvent=['completed'],
            trim='trim-silence'
        )
        
        # Initial greeting
        response.say(
            "Hello! You've reached the AI Receptionist. How may I assist you today?",
            voice='alice'
        )
        
        # Gather speech input
        gather = Gather(
            input='speech',
            action='/webhook/speech',
            language='en-US',
            speechTimeout='auto',
            enhanced=True  # Enable enhanced speech recognition
        )
        response.append(gather)
        
        # If no input received
        response.say("I didn't catch that. Please try again.", voice='alice')
        
        logger.debug("Generated initial response for incoming call")
        return str(response)
    except Exception as e:
        logger.error(f"Error handling incoming call: {str(e)}")
        raise

def handle_speech(call_sid, speech_result):
    """Process speech from the caller and generate AI response"""
    try:
        logger.info(f"Processing speech for call {call_sid}: {speech_result}")
        
        if not speech_result:
            return generate_response("I'm sorry, I didn't catch that. Could you please repeat?")
            
        # Process speech with AI
        ai_response = ai_handler.process_speech(call_sid, speech_result)
        
        return generate_response(ai_response)
    except Exception as e:
        logger.error(f"Error processing speech: {str(e)}")
        return generate_response("I apologize, but I'm having trouble understanding. Could you please try again?")

def generate_response(message, gather_speech=True):
    """Generate TwiML response with optional speech gathering"""
    try:
        response = VoiceResponse()
        response.say(message, voice='alice')
        
        if gather_speech:
            # Gather next speech input
            gather = Gather(
                input='speech',
                action='/webhook/speech',
                language='en-US',
                speechTimeout='auto',
                enhanced=True
            )
            response.append(gather)
        
        return str(response)
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        raise

def handle_recording_complete(call_sid, recording_url):
    """Handle completed call recording"""
    try:
        logger.info(f"Call recording completed for {call_sid}: {recording_url}")
        
        # Here you would typically:
        # 1. Download the recording
        # 2. Store it in your database/storage
        # 3. Process it for analysis
        
        return True
    except Exception as e:
        logger.error(f"Error handling recording: {str(e)}")
        raise

def get_call_transcript(call_sid):
    """Get the transcript of the conversation"""
    try:
        conversation = ai_handler.get_conversation_history(call_sid)
        
        # Format conversation for display
        transcript = []
        for msg in conversation:
            if msg['role'] not in ['system']:
                transcript.append({
                    'type': 'user' if msg['role'] == 'user' else 'ai',
                    'text': msg['content']
                })
        
        return transcript
    except Exception as e:
        logger.error(f"Error getting transcript: {str(e)}")
        raise

def clear_call_data(call_sid):
    """Clean up call data when call ends"""
    try:
        ai_handler.clear_conversation(call_sid)
        return True
    except Exception as e:
        logger.error(f"Error clearing call data: {str(e)}")
        raise
