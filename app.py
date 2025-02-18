from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
from dotenv import load_dotenv
import logging
from call_service import CallService

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# Enable CORS for all domains in debug mode
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins in debug mode
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configure app
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Initialize services
call_service = CallService()

# In-memory storage for active calls (temporary solution)
active_calls = []
incoming_calls = []

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """Test endpoint to verify API is working"""
    return jsonify({
        'status': 'success',
        'message': 'API is working',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    # Temporary placeholder response
    return jsonify({
        'text': 'Speech-to-text functionality coming soon'
    })

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    # Temporary placeholder response
    return jsonify({
        'audio': 'Text-to-speech functionality coming soon'
    })

@app.route('/api/make-call', methods=['POST'])
def make_call():
    """Initiate an outbound call"""
    try:
        logger.debug("Received make-call request")
        logger.debug(f"Request headers: {dict(request.headers)}")
        logger.debug(f"Request data: {request.get_data(as_text=True)}")
        
        if not request.is_json:
            logger.error("Request is not JSON")
            return jsonify({
                'status': 'error',
                'message': 'Request must be JSON'
            }), 400
            
        data = request.json
        logger.debug(f"Parsed JSON data: {data}")
        
        to_number = data.get('phone_number')
        message = data.get('message')
        
        if not to_number:
            logger.error("No phone number provided")
            return jsonify({
                'status': 'error',
                'message': 'Phone number is required'
            }), 400
            
        logger.info(f"Making call to {to_number}")
        result = call_service.make_call(to_number, message)
        logger.debug(f"Call result: {result}")
        
        if result['status'] == 'success':
            # Store call info in memory
            active_calls.append({
                'call_sid': result['call_sid'],
                'to_number': to_number,
                'from_number': os.getenv('TWILIO_PHONE_NUMBER'),
                'status': 'initiated',
                'start_time': datetime.utcnow().isoformat(),
                'duration': 0
            })
            
        return jsonify(result)
    except Exception as e:
        logger.exception("Error in make_call endpoint")
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/api/active-calls', methods=['GET'])
def get_active_calls():
    """Get list of active calls"""
    try:
        return jsonify([
            call for call in active_calls 
            if call['status'] in ['initiated', 'ringing', 'in-progress']
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/call-status', methods=['POST'])
def call_status():
    """Handle call status callbacks from Twilio"""
    try:
        call_sid = request.values.get('CallSid')
        call_status = request.values.get('CallStatus')
        duration = request.values.get('CallDuration', 0)
        
        # Update call status in memory
        for call in active_calls:
            if call['call_sid'] == call_sid:
                call['status'] = call_status
                call['duration'] = duration
                if call_status in ['completed', 'failed', 'busy', 'no-answer', 'canceled']:
                    call['end_time'] = datetime.utcnow().isoformat()
                break
        
        return '', 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/end-call', methods=['POST'])
def end_call():
    """End an active call"""
    try:
        data = request.json
        call_sid = data.get('call_sid')
        
        if not call_sid:
            return jsonify({'error': 'Call SID is required'}), 400
            
        result = call_service.end_call(call_sid)
        
        # Update call status in memory
        for call in active_calls:
            if call['call_sid'] == call_sid:
                call['status'] = 'completed'
                call['end_time'] = datetime.utcnow().isoformat()
                break
                
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/incoming-calls', methods=['GET'])
def get_incoming_calls():
    """Get list of incoming calls"""
    try:
        return jsonify([
            call for call in incoming_calls 
            if call['status'] in ['ringing', 'queued']
        ])
    except Exception as e:
        logger.exception("Error in get_incoming_calls endpoint")
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/webhook/incoming-call', methods=['POST'])
def incoming_call_webhook():
    """Handle incoming call webhook from Twilio"""
    try:
        call_sid = request.values.get('CallSid')
        from_number = request.values.get('From')
        
        # Store incoming call
        incoming_calls.append({
            'call_sid': call_sid,
            'from_number': from_number,
            'status': 'ringing',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return handle_incoming_call()
    except Exception as e:
        logger.exception("Error in incoming_call_webhook endpoint")
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/api/answer-call', methods=['POST'])
def answer_call():
    """Answer an incoming call"""
    try:
        data = request.json
        call_sid = data.get('call_sid')
        
        if not call_sid:
            return jsonify({
                'status': 'error',
                'message': 'Call SID is required'
            }), 400
            
        # Find the call
        call = next((call for call in incoming_calls if call['call_sid'] == call_sid), None)
        if not call:
            return jsonify({
                'status': 'error',
                'message': 'Call not found'
            }), 404
            
        # Update call status
        call['status'] = 'in-progress'
        
        return jsonify({
            'status': 'success',
            'message': 'Call answered successfully'
        })
    except Exception as e:
        logger.exception("Error in answer_call endpoint")
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/api/respond-to-call', methods=['POST'])
def respond_to_call():
    """Send a response to an active call"""
    try:
        data = request.json
        call_sid = data.get('call_sid')
        message = data.get('message')
        
        if not call_sid or not message:
            return jsonify({
                'status': 'error',
                'message': 'Call SID and message are required'
            }), 400
            
        # Generate TwiML response
        twiml = handle_call_response(message)
        
        return jsonify({
            'status': 'success',
            'message': 'Response sent successfully'
        })
    except Exception as e:
        logger.exception("Error in respond_to_call endpoint")
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/webhook/speech', methods=['POST'])
def speech_webhook():
    """Handle speech input from Twilio"""
    try:
        call_sid = request.values.get('CallSid')
        speech_result = request.values.get('SpeechResult')
        
        logger.info(f"Received speech from {call_sid}: {speech_result}")
        
        # Process speech and get AI response
        response = handle_speech(call_sid, speech_result)
        
        return response
    except Exception as e:
        logger.exception("Error in speech webhook")
        return generate_response("I apologize, but I'm having trouble. Please try again.")

@app.route('/webhook/recording-complete', methods=['POST'])
def recording_complete():
    """Handle completed recording"""
    try:
        call_sid = request.values.get('CallSid')
        recording_url = request.values.get('RecordingUrl')
        
        # Process the recording
        handle_recording_complete(call_sid, recording_url)
        
        return '', 200
    except Exception as e:
        logger.exception("Error in recording complete webhook")
        return '', 500

@app.route('/webhook/recording-status', methods=['POST'])
def recording_status():
    """Handle recording status updates"""
    try:
        call_sid = request.values.get('CallSid')
        status = request.values.get('RecordingStatus')
        
        logger.info(f"Recording status for {call_sid}: {status}")
        
        return '', 200
    except Exception as e:
        logger.exception("Error in recording status webhook")
        return '', 500

@app.route('/api/call-transcript', methods=['GET'])
def get_transcript():
    """Get transcript for a call"""
    try:
        call_sid = request.args.get('call_sid')
        
        if not call_sid:
            return jsonify({
                'status': 'error',
                'message': 'Call SID is required'
            }), 400
            
        transcript = get_call_transcript(call_sid)
        
        return jsonify({
            'status': 'success',
            'transcript': transcript
        })
    except Exception as e:
        logger.exception("Error getting transcript")
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    logger.debug(f"TWILIO_ACCOUNT_SID: {os.getenv('TWILIO_ACCOUNT_SID')[:5]}...")  # Only log first 5 chars
    logger.debug(f"TWILIO_PHONE_NUMBER: {os.getenv('TWILIO_PHONE_NUMBER')}")
    app.run(debug=True, host='127.0.0.1', port=5000)
