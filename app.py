from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
from dotenv import load_dotenv
import logging
from twilio.twiml.voice_response import VoiceResponse, Gather
from call_service import CallService
from phone_handler import handle_incoming_call, handle_speech, handle_recording_complete, get_call_transcript, clear_call_data, generate_response
from ai_handler import AIHandler

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# Configure CORS to allow all origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize services
call_service = CallService()
ai_handler = AIHandler()

# In-memory storage
active_calls = []
incoming_calls = []

@app.route('/healthcheck', methods=['GET'])
def healthcheck():
    """Health check endpoint"""
    logger.info("Health check endpoint hit")
    return jsonify({
        'status': 'success',
        'message': 'Server is running'
    })

@app.route('/', methods=['GET', 'POST'])
def root():
    """Root endpoint for speech processing"""
    try:
        print("="*50)
        print("🎯 ROOT ENDPOINT HIT")
        print(f"📝 Method: {request.method}")
        print(f"🔑 Headers: {dict(request.headers)}")
        print(f"📦 Values: {dict(request.values)}")
        print("="*50)
        
        if request.method == 'GET':
            print("✅ Handling GET request")
            return jsonify({
                'status': 'success',
                'message': 'Server is running'
            })
        
        # Handle POST request (speech webhook)
        print("🎤 Starting speech processing")
        response = VoiceResponse()
        
        # Get speech result
        speech_result = request.values.get('SpeechResult')
        call_sid = request.values.get('CallSid')
        
        print(f"📞 Call SID: {call_sid}")
        print(f"🗣️ Speech Result: {speech_result}")
        
        try:
            if speech_result:
                print("🤖 Processing speech with AI")
                # Process with AI
                ai_response = ai_handler.process_speech(call_sid, speech_result)
                print(f"🤖 AI Response: {ai_response}")
                
                # Say the AI response
                response.say(ai_response, voice='alice')
                print("🔊 Added AI response to TwiML")
            else:
                print("⚠️ No speech result received")
                response.say("I apologize, but I didn't catch that. Could you please repeat what you said?", voice='alice')
            
            # Create absolute URLs for webhooks
            speech_url = f"{os.getenv('NGROK_URL')}/"
            print(f"🌐 Using webhook URL: {speech_url}")
            
            # Add new gather
            gather = Gather(
                input='speech',
                action=speech_url,
                method='POST',
                language='en-US',
                speechTimeout='auto',
                enhanced=True
            )
            response.append(gather)
            print("🎤 Added gather for next speech input")
            
            # Add redirect for no input
            response.redirect(speech_url, method='POST')
            print("↩️ Added redirect for no input")
            
            response_str = str(response)
            print("📤 Final TwiML response:")
            print(response_str)
            print("="*50)
            return response_str
            
        except Exception as e:
            print("❌ Error in speech processing:")
            print(f"💥 Error type: {type(e).__name__}")
            print(f"💥 Error message: {str(e)}")
            print(f"💥 Error details:", exc_info=True)
            
            response.say("I apologize for the difficulty. Let me know how I can help you.", voice='alice')
            
            # Create absolute URLs for webhooks
            speech_url = f"{os.getenv('NGROK_URL')}/"
            print(f"🌐 Using webhook URL for error recovery: {speech_url}")
            
            # Add new gather even after error
            gather = Gather(
                input='speech',
                action=speech_url,
                method='POST',
                language='en-US',
                speechTimeout='auto',
                enhanced=True
            )
            response.append(gather)
            print("🎤 Added gather for retry")
            
            # Add redirect for no input
            response.redirect(speech_url, method='POST')
            print("↩️ Added redirect for no input")
            
            response_str = str(response)
            print("📤 Error recovery TwiML response:")
            print(response_str)
            print("="*50)
            return response_str
            
    except Exception as e:
        print("💥 CRITICAL ERROR in root endpoint:")
        print(f"💥 Error type: {type(e).__name__}")
        print(f"💥 Error message: {str(e)}")
        print(f"💥 Error details:", exc_info=True)
        
        response = VoiceResponse()
        response.say("I apologize, but we're experiencing technical difficulties. Please try calling back in a few minutes.", voice='alice')
        response.hangup()
        
        response_str = str(response)
        print("📤 Critical error TwiML response:")
        print(response_str)
        print("="*50)
        return response_str

@app.route('/status', methods=['POST'])
def status():
    """Handle call status updates"""
    try:
        logger.info("=== Received status webhook ===")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"Request values: {dict(request.values)}")
        return '', 200
    except Exception as e:
        logger.exception("Error in status webhook")
        return '', 200

# API endpoints
@app.route('/api/active-calls', methods=['GET'])
def get_active_calls():
    """Get list of active calls"""
    try:
        return jsonify(active_calls if active_calls else [])
    except Exception as e:
        logger.exception("Error in get_active_calls endpoint")
        return jsonify([])

@app.route('/api/make-call', methods=['POST'])
def make_call():
    """Initiate an outbound call"""
    try:
        data = request.json
        to_number = data.get('phone_number')
        message = data.get('message')
        
        if not to_number:
            return jsonify({
                'status': 'error',
                'message': 'Phone number is required'
            }), 400
            
        result = call_service.make_call(to_number, message)
        
        if result['status'] == 'success':
            active_calls.append({
                'call_sid': result['call_sid'],
                'to_number': to_number,
                'status': 'initiated',
                'duration': 0,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        return jsonify(result)
        
    except Exception as e:
        logger.exception("Error making call")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    logger.info("Server will be available at http://0.0.0.0:5001")
    logger.debug(f"TWILIO_ACCOUNT_SID: {os.getenv('TWILIO_ACCOUNT_SID')[:5]}...")
    logger.debug(f"TWILIO_PHONE_NUMBER: {os.getenv('TWILIO_PHONE_NUMBER')}")
    app.run(debug=True, host='0.0.0.0', port=5001)
