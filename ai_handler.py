import os
from openai import OpenAI
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class AIHandler:
    def __init__(self):
        """Initialize the AI handler"""
        logger.info("Initializing AIHandler")
        
        # Initialize OpenAI client
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        logger.debug(f"Using OpenAI API key starting with: {openai_api_key[:8]}...")
        
        self.client = OpenAI(api_key=openai_api_key)
        self.conversations = {}
        
        # System prompt for medical clinic receptionist
        self.system_prompt = """You are an AI-powered medical clinic receptionist. Your role is to:
1. Be professional, warm, and empathetic in all interactions
2. Help patients with:
   - Scheduling or modifying appointments
   - Basic medical inquiries
   - Insurance and billing questions
   - Clinic hours and location information
   - Emergency guidance (directing to ER when appropriate)
3. Follow these guidelines:
   - Always maintain patient confidentiality
   - Be clear and concise in your responses
   - Show empathy for medical concerns
   - Prioritize urgent medical needs
   - Direct emergency situations to 911
   - Verify patient information when needed

Remember:
- You can't diagnose medical conditions
- For urgent medical concerns, advise patients to seek immediate care
- Maintain a professional yet caring tone
- Be patient-centric in all interactions

Keep responses natural and conversational while maintaining medical professionalism."""
    
    def process_speech(self, call_sid, speech_text):
        """Process speech and generate response"""
        try:
            print("="*50)
            print("🤖 AI HANDLER: Processing Speech")
            print(f"📞 Call SID: {call_sid}")
            print(f"🗣️ Speech Text: {speech_text}")
            
            # Initialize conversation if needed
            if call_sid not in self.conversations:
                print("📝 Initializing new conversation")
                self.conversations[call_sid] = [{
                    "role": "system",
                    "content": self.system_prompt
                }]
            
            # Add user message to conversation
            print("➕ Adding user message to conversation")
            self.conversations[call_sid].append({
                "role": "user",
                "content": speech_text
            })
            
            # Get response from OpenAI
            print("🚀 Sending request to OpenAI")
            try:
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=self.conversations[call_sid],
                    max_tokens=50,  # Keep responses concise
                    temperature=0.7,
                    presence_penalty=0.6  # Encourage varied responses
                )
                
                # Extract and store response
                ai_response = response.choices[0].message.content.strip()
                print(f"✨ Received AI response: {ai_response}")
                
                self.conversations[call_sid].append({
                    "role": "assistant",
                    "content": ai_response
                })
                print("➕ Added AI response to conversation history")
                
                print("="*50)
                return ai_response
                
            except Exception as openai_error:
                print("❌ Error calling OpenAI API:")
                print(f"💥 Error type: {type(openai_error).__name__}")
                print(f"💥 Error message: {str(openai_error)}")
                print(f"💥 Error details:", exc_info=True)
                return "I apologize, but I'm having trouble processing your request. Could you please try again?"
            
        except Exception as e:
            print("❌ Error in speech processing:")
            print(f"💥 Error type: {type(e).__name__}")
            print(f"💥 Error message: {str(e)}")
            print(f"💥 Error details:", exc_info=True)
            return "I apologize, but I'm having trouble understanding. Could you please rephrase that?"
    
    def get_conversation_history(self, call_sid):
        """Get conversation history for a call"""
        try:
            return self.conversations.get(call_sid, [])
        except Exception as e:
            logger.exception(f"Error getting conversation history: {str(e)}")
            return []
    
    def clear_conversation(self, call_sid):
        """Clear conversation history for a call"""
        try:
            if call_sid in self.conversations:
                del self.conversations[call_sid]
            return True
        except Exception as e:
            logger.exception(f"Error clearing conversation: {str(e)}")
            return False
