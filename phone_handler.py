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

NGROK_URL = os.getenv('NGROK_URL', 'https://56ec-171-66-13-202.ngrok-free.app')

def handle_incoming_call():
    """Handle initial incoming call"""
    try:
        logger.info("Handling incoming call")
        response = VoiceResponse()
        
        # Start recording
        response.record(
            action='/webhook/recording-complete',
            recordingStatusCallback='/webhook/recording-status',
            recordingStatusCallbackEvent=['in-progress', 'completed'],
            trim='trim-silence',
            maxLength=3600  # 1 hour max
        )
        
        # Initial greeting
        response.say(
            "Hello! You've reached the AI Receptionist. How may I assist you today?",
            voice='alice'
        )
        
        # Add speech gathering
        add_speech_gathering(response)
        
        logger.debug(f"Generated initial response for incoming call: {str(response)}")
        return str(response)
    except Exception as e:
        logger.exception("Error handling incoming call")
        response = VoiceResponse()
        response.say("I apologize, but I'm having trouble. Please try calling back later.", voice='alice')
        response.hangup()
        return str(response)

def handle_speech(call_sid, speech_result):
    """Process speech from the caller and generate AI response"""
    try:
        logger.info(f"Processing speech for call {call_sid}: {speech_result}")
        
        # Create base response
        response = VoiceResponse()
        
        if not speech_result:
            logger.info("No speech result received")
            response.say("I'm sorry, I didn't catch that. Could you please repeat?", voice='alice')
            add_speech_gathering(response)
            return str(response)
            
        try:
            # Process speech with AI
            ai_response = ai_handler.process_speech(call_sid, speech_result)
            logger.info(f"AI response: {ai_response}")
            
            # Say the AI response
            response.say(ai_response, voice='alice')
        except Exception as ai_error:
            logger.exception("Error processing with AI")
            response.say("I apologize, but I'm having trouble understanding. Let me try again.", voice='alice')
        
        # Always add speech gathering for next input
        add_speech_gathering(response)
        
        return str(response)
        
    except Exception as e:
        logger.exception(f"Error in handle_speech: {str(e)}")
        # Create error response
        response = VoiceResponse()
        response.say("I encountered an error. Let me try again.", voice='alice')
        add_speech_gathering(response)
        return str(response)

def add_speech_gathering(response):
    """Add speech gathering to a response"""
    try:
        gather = Gather(
            input='speech',
            action=f'{NGROK_URL}/webhook/speech',
            method='POST',
            language='en-US',
            speechTimeout='auto',
            enhanced=True
        )
        gather.say("How can I help you?", voice='alice')
        response.append(gather)
        
        # Add redirect in case no input is received
        response.redirect(f'{NGROK_URL}/webhook/speech', method='POST')
    except Exception as e:
        logger.exception("Error adding speech gathering")
        response.say("I'm having trouble. Please try calling back later.", voice='alice')
        response.hangup()

def handle_recording_complete(call_sid, recording_url):
    """Handle completed recording"""
    try:
        logger.info(f"Call recording completed for {call_sid}: {recording_url}")
        return True
    except Exception as e:
        logger.exception(f"Error handling recording: {str(e)}")
        return False

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
        logger.exception(f"Error getting transcript: {str(e)}")
        return []

def clear_call_data(call_sid):
    """Clean up call data when call ends"""
    try:
        ai_handler.clear_conversation(call_sid)
        return True
    except Exception as e:
        logger.exception(f"Error clearing call data: {str(e)}")
        return False

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
