import os
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from dotenv import load_dotenv

load_dotenv()

class CallService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.from_number = os.getenv('TWILIO_PHONE_NUMBER')
        self.client = Client(self.account_sid, self.auth_token)

    def make_call(self, to_number, message=None):
        """
        Make an outbound call to the specified number
        """
        try:
            # Create a TwiML response with the message
            response = VoiceResponse()
            if message:
                response.say(message)
            else:
                response.say("Hello! This is your AI receptionist. How may I help you today?")

            # Make the call
            call = self.client.calls.create(
                twiml=str(response),
                to=to_number,
                from_=self.from_number,
                record=True,  # Optional: record the call
                status_callback='/api/call-status',  # Webhook for call status updates
            )
            return {
                'status': 'success',
                'call_sid': call.sid,
                'message': f'Call initiated to {to_number}'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

    def end_call(self, call_sid):
        """
        End an active call
        """
        try:
            call = self.client.calls(call_sid).update(status='completed')
            return {
                'status': 'success',
                'message': f'Call {call_sid} ended successfully'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
