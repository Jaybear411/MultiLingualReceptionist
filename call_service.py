from twilio.rest import Client
import os
from dotenv import load_dotenv
import logging
from twilio.base.exceptions import TwilioRestException
from twilio.twiml.voice_response import VoiceResponse, Gather
import traceback

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

class CallService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.twilio_number = os.getenv('TWILIO_PHONE_NUMBER')
        self.ngrok_url = os.getenv('NGROK_URL')
        
        logger.info("Initializing CallService")
        logger.debug(f"TWILIO_ACCOUNT_SID: {self.account_sid[:5]}...")
        logger.debug(f"TWILIO_PHONE_NUMBER: {self.twilio_number}")
        logger.debug(f"NGROK_URL: {self.ngrok_url}")
        
        if not all([self.account_sid, self.auth_token, self.twilio_number, self.ngrok_url]):
            logger.error("Missing required credentials!")
            missing = []
            if not self.account_sid: missing.append('TWILIO_ACCOUNT_SID')
            if not self.auth_token: missing.append('TWILIO_AUTH_TOKEN')
            if not self.twilio_number: missing.append('TWILIO_PHONE_NUMBER')
            if not self.ngrok_url: missing.append('NGROK_URL')
            raise ValueError(f"Missing required credentials: {', '.join(missing)}")
            
        self.client = Client(self.account_sid, self.auth_token)
        
    def make_call(self, to_number, message=None):
        """Make an outbound call"""
        try:
            print("="*50)
            print(" CALL SERVICE: Making Call")
            print(f" To Number: {to_number}")
            print(f" Using ngrok URL: {self.ngrok_url}")
            
            # Validate phone number format
            if not to_number.startswith('+'):
                to_number = '+' + to_number
                print(f" Added + prefix to phone number: {to_number}")
            
            # Verify Twilio credentials
            print(" Verifying Twilio credentials...")
            try:
                account = self.client.api.accounts(self.account_sid).fetch()
                print(f" Twilio account verified: {account.friendly_name}")
            except Exception as e:
                print(f" Twilio account verification failed: {str(e)}")
                raise Exception(f"Twilio account verification failed: {str(e)}")
            
            # Create TwiML for initial greeting
            print(" Creating TwiML response")
            response = VoiceResponse()
            response.say("Hello, thank you for calling our medical clinic. How may I assist you today?", voice='alice')
            
            # Create absolute URLs for webhooks
            speech_url = f"{self.ngrok_url}/"
            print(f" Speech webhook URL: {speech_url}")
            
            # Add gather for speech input
            print(" Adding Gather verb for speech input")
            gather = Gather(
                input='speech',
                action=speech_url,
                method='POST',
                language='en-US',
                speechTimeout='auto',
                enhanced=True
            )
            gather.say("Please tell me how I can help you.", voice='alice')
            response.append(gather)
            print(" Added Gather verb to response")
            
            # Add redirect for no input
            response.redirect(speech_url, method='POST')
            print(" Added redirect for no input")
            
            # Convert TwiML to string
            twiml = str(response)
            print(" Generated TwiML:")
            print(twiml)
            
            # Make the call
            print(" Initiating Twilio call")
            try:
                call = self.client.calls.create(
                    to=to_number,
                    from_=self.twilio_number,
                    twiml=twiml,
                    status_callback=f"{self.ngrok_url}/status",
                    status_callback_event=['initiated', 'ringing', 'answered', 'completed'],
                    status_callback_method='POST'
                )
                print(f" Call initiated successfully with SID: {call.sid}")
            except TwilioRestException as e:
                print(" Twilio call creation failed:")
                print(f"Error code: {e.code}")
                print(f"Error message: {e.msg}")
                print(f"More info: {e.more_info}")
                raise
            
            print("="*50)
            return {
                'status': 'success',
                'call_sid': call.sid,
                'message': 'Call initiated successfully'
            }
            
        except TwilioRestException as e:
            print(" Twilio error making call:")
            print(f"Error code: {e.code}")
            print(f"Error message: {e.msg}")
            print(f"More info: {e.more_info}")
            print("="*50)
            return {
                'status': 'error',
                'message': f'Twilio error: {e.msg}'
            }
        except Exception as e:
            print(" Unexpected error making call:")
            print(f"Error type: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            print(traceback.format_exc())
            print("="*50)
            return {
                'status': 'error',
                'message': f'Error making call: {str(e)}'
            }
    
    def end_call(self, call_sid):
        """End an active call"""
        try:
            logger.info(f"Ending call {call_sid}")
            
            call = self.client.calls(call_sid).update(status='completed')
            
            logger.info(f"Call {call_sid} ended successfully")
            return {
                'status': 'success',
                'message': 'Call ended successfully'
            }
            
        except TwilioRestException as e:
            logger.error(f"Twilio error ending call: {str(e)}")
            return {
                'status': 'error',
                'message': f'Twilio error: {e.msg}'
            }
        except Exception as e:
            logger.exception(f"Error ending call: {str(e)}")
            return {
                'status': 'error',
                'message': f'Error ending call: {str(e)}'
            }
