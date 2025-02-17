from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from dotenv import load_load_dotenv
from google.cloud import speech_v1
from google.cloud import texttospeech
from google.oauth2 import service_account
from googleapiclient.discovery import build
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

db = SQLAlchemy(app)

# Database Models
class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(100), nullable=False)
    datetime = db.Column(db.DateTime, nullable=False)
    purpose = db.Column(db.String(200))
    status = db.Column(db.String(20), default='scheduled')

# Initialize Google Cloud clients
speech_client = speech_v1.SpeechClient()
tts_client = texttospeech.TextToSpeechClient()

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    try:
        audio_content = request.files['audio'].read()
        
        audio = speech_v1.RecognitionAudio(content=audio_content)
        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            language_code="en-US",
            sample_rate_hertz=16000,
        )

        response = speech_client.recognize(config=config, audio=audio)
        
        return jsonify({
            'text': response.results[0].alternatives[0].transcript if response.results else ''
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.json
        text = data.get('text')
        language = data.get('language', 'en-US')

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        return jsonify({
            'audio': response.audio_content.decode('utf-8')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/appointments', methods=['POST'])
def create_appointment():
    try:
        data = request.json
        appointment = Appointment(
            client_name=data['client_name'],
            datetime=datetime.fromisoformat(data['datetime']),
            purpose=data.get('purpose', '')
        )
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment created successfully',
            'id': appointment.id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    try:
        appointments = Appointment.query.all()
        return jsonify([{
            'id': a.id,
            'client_name': a.client_name,
            'datetime': a.datetime.isoformat(),
            'purpose': a.purpose,
            'status': a.status
        } for a in appointments])
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
