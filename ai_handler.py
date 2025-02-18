import os
from openai import OpenAI
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

class AIHandler:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.conversation_history = {}  # Store conversation history per call
        
    def init_conversation(self, call_sid):
        """Initialize a new conversation"""
        self.conversation_history[call_sid] = [
            {"role": "system", "content": """You are an AI receptionist. Be professional, courteous, and helpful.
            Your responses should be clear and concise as they will be spoken to the caller.
            If you need specific information, ask for it clearly.
            Keep track of the conversation context and refer back to previous information when relevant."""}
        ]
    
    def process_speech(self, call_sid, speech_text):
        """Process speech input and generate a response"""
        try:
            if call_sid not in self.conversation_history:
                self.init_conversation(call_sid)
            
            # Add user's message to history
            self.conversation_history[call_sid].append({
                "role": "user",
                "content": speech_text
            })
            
            # Get response from GPT
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=self.conversation_history[call_sid],
                max_tokens=150,
                temperature=0.7,
                presence_penalty=0.6
            )
            
            # Extract and store response
            ai_response = response.choices[0].message.content
            self.conversation_history[call_sid].append({
                "role": "assistant",
                "content": ai_response
            })
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Error processing speech with AI: {str(e)}")
            return "I apologize, but I'm having trouble processing your request. Could you please try again?"
    
    def get_conversation_history(self, call_sid):
        """Get the conversation history for a call"""
        return self.conversation_history.get(call_sid, [])
    
    def clear_conversation(self, call_sid):
        """Clear the conversation history for a call"""
        if call_sid in self.conversation_history:
            del self.conversation_history[call_sid]
