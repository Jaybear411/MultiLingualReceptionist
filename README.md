# Multilingual AI Receptionist

A modern web application that serves as an AI-powered receptionist capable of handling voice calls and appointment scheduling in multiple languages.

## Features

- Real-time voice communication
- Natural language processing for understanding caller requests
- Appointment scheduling and management
- Multi-language support
- Interactive web interface

## Technical Stack

- **Backend**: Python/Flask
- **Frontend**: React.js
- **Voice Processing**: Google Cloud Speech-to-Text & Text-to-Speech
- **Calendar Integration**: Google Calendar API
- **Database**: PostgreSQL
- **WebRTC**: For real-time voice communication

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Node.js dependencies:
```bash
cd frontend
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
```

4. Run the application:
```bash
# Start backend
python app.py

# Start frontend (in a new terminal)
cd frontend
npm start
```

## API Keys Required

- Google Cloud Platform account with Speech-to-Text and Text-to-Speech APIs enabled
- Google Calendar API credentials
